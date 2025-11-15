import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
import { syncBlackGrade } from "@/lib/black/gradeSync";
import { recordStudentGradeLite } from "@/lib/studentLiteSync";

async function getUid(req: Request) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  try {
    const d = await adminAuth.verifyIdToken(token);
    return d.uid as string;
  } catch {
    return null;
  }
}

// GET /api/me/grades?subject=matematica|fisica
export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const subject = u.searchParams.get("subject");

  const db = supabaseServer();
  let query = db
    .from("student_grades")
    .select("id, subject, grade, taken_on, source, assessment_id")
    .eq("user_id", uid)
    .order("taken_on", { ascending: true });
  if (subject === "matematica" || subject === "fisica") {
    query = query.eq("subject", subject);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[me-grades] supabase query failed", error);
  } else if ((data?.length ?? 0) > 0) {
    const items = (data || []).map((row) => ({
      id: row.id,
      subject: row.subject,
      grade: typeof row.grade === "number" ? row.grade : null,
      date: row.taken_on,
      source: row.source ?? null,
      assessment_id: row.assessment_id ?? null,
    }));
    if (items.length) return NextResponse.json({ items });
  }

  // fallback to legacy Firestore collection
  let legacyQuery = adminDb.collection(`users/${uid}/grades`).orderBy("date");
  if (subject === "matematica" || subject === "fisica") {
    legacyQuery = legacyQuery.where("subject", "==", subject);
  }
  const snap = await legacyQuery.get();
  const legacyItems = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return NextResponse.json({ items: legacyItems });
}

// POST { date: YYYY-MM-DD, subject: matematica|fisica, grade: number }
export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : null;
  const subject = body.subject === "matematica" || body.subject === "fisica" ? body.subject : null;
  const grade = Number(body.grade);

  if (!date || !subject || !Number.isFinite(grade)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const doc = await adminDb.collection(`users/${uid}/grades`).add({
    date,
    subject,
    grade: Math.max(0, Math.min(10, grade)),
    createdAt: Date.now(),
    source: "account_app",
  });

  const linkInfo = await linkGradeToExam({
    uid,
    date,
    subject,
    grade: Math.max(0, Math.min(10, grade)),
    gradeDocId: doc.id,
  });

  await syncBlackGrade({
    uid,
    date,
    grade: Math.max(0, Math.min(10, grade)),
    subject,
    assessmentId: linkInfo?.assessmentId || null,
    examSubject: linkInfo?.examSubject || null,
  });

  try {
    await recordStudentGradeLite({
      userId: uid,
      seed: doc.id,
      date,
      subject,
      grade: Math.max(0, Math.min(10, grade)),
      assessmentSeed:
        linkInfo?.assessmentId || linkInfo?.firestoreId || null,
    });
  } catch (error) {
    console.error("[me-grades] lite sync failed", error);
  }

  return NextResponse.json({ ok: true, id: doc.id });
}

async function linkGradeToExam({
  uid,
  date,
  subject,
  grade,
  gradeDocId,
}: {
  uid: string;
  date: string;
  subject: "matematica" | "fisica";
  grade: number;
  gradeDocId: string;
}) {
  try {
    const exams = adminDb.collection(`users/${uid}/exams`);
    const snap = await exams.where("date", "==", date).limit(10).get();
    if (snap.empty) return null;
    const target =
      snap.docs.find((doc) => {
        const data = doc.data() as any;
        return typeof data?.grade !== "number";
      }) || snap.docs[0];
    await target.ref.set(
      {
        grade,
        grade_subject: subject,
        grade_id: gradeDocId,
        grade_synced_at: Date.now(),
        updatedAt: Date.now(),
        source: "account_app",
      },
      { merge: true }
    );
    const data = target.data() as any;
    return {
      assessmentId: data?.blackAssessmentId || data?.black_assessment_id || null,
      examSubject: data?.subject || null,
      firestoreId: target.id,
    };
  } catch (error) {
    console.error("[grades] failed linking grade to exam", error);
    return null;
  }
}
