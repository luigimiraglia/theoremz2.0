import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
import { refreshBriefSafe } from "@/lib/black/gradeSync";
import { recordStudentAssessmentLite } from "@/lib/studentLiteSync";

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

// GET list exams, ordered by date asc
export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseServer();
  const { data, error } = await db
    .from("student_assessments")
    .select("id, date, subject, notes, grade, grade_subject, grade_id, kind")
    .eq("user_id", uid)
    .order("date", { ascending: true });
  if (error) {
    console.error("[me-exams] supabase query failed", error);
  } else if ((data?.length ?? 0) > 0) {
    const items = (data || [])
      .filter((row) => !row.kind || row.kind === "verifica")
      .map((row) => ({
        id: row.id,
        date: row.date,
        subject: row.subject ?? null,
        notes: row.notes ?? null,
        grade: typeof row.grade === "number" ? row.grade : null,
        grade_subject: row.grade_subject ?? null,
        grade_id: row.grade_id ?? null,
      }));
    if (items.length) return NextResponse.json({ items });
  }

  // fallback to legacy Firestore collection for users not yet migrated
  const snap = await adminDb
    .collection(`users/${uid}/exams`)
    .orderBy("date")
    .get();
  const legacyItems = snap.docs.map((d) => {
    const payload = d.data() as any;
    return {
      id: d.id,
      date: payload.date,
      subject: payload.subject ?? null,
      notes: payload.notes ?? null,
      grade:
        typeof payload.grade === "number"
          ? payload.grade
          : payload.gradeValue ?? null,
      grade_subject: payload.grade_subject ?? null,
      grade_id: payload.gradeId || payload.grade_id || null,
    };
  });
  return NextResponse.json({ items: legacyItems });
}

// POST { date: YYYY-MM-DD, subject?: string|null }
export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : null;
  const subject =
    typeof body.subject === "string" && body.subject.trim()
      ? String(body.subject).slice(0, 80)
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? String(body.notes).slice(0, 280)
      : null;
  if (!date) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const blackAssessmentId = await syncBlackAssessment({
    uid,
    date,
    subject,
    notes,
  });

  const doc = await adminDb.collection(`users/${uid}/exams`).add({
    date,
    subject,
    notes,
    blackAssessmentId: blackAssessmentId || null,
    createdAt: Date.now(),
  });

  try {
    await recordStudentAssessmentLite({
      userId: uid,
      seed: blackAssessmentId || doc.id,
      date,
      subject,
      notes,
      kind: "verifica",
    });
  } catch (error) {
    console.error("[me-exams] lite sync failed", error);
  }
  return NextResponse.json({ ok: true, id: doc.id });
}

async function syncBlackAssessment({
  uid,
  date,
  subject,
  notes,
}: {
  uid: string;
  date: string;
  subject: string | null;
  notes: string | null;
}) {
  const db = supabaseServer();
  const { data: student, error } = await db
    .from("black_students")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("[me-exams] black student lookup failed", error);
    return null;
  }
  if (!student?.id) return null;

  const studentId = student.id;

  const { data: existing, error: existingError } = await db
    .from("black_assessments")
    .select("id")
    .eq("student_id", studentId)
    .eq("when_at", date)
    .limit(1)
    .maybeSingle();
  if (existingError && existingError.code !== "PGRST116") {
    console.error("[me-exams] assessments lookup failed", existingError);
  }

  if (existing?.id) {
    const { error: updateError } = await db
      .from("black_assessments")
      .update({
        subject: subject || null,
        topics: notes || null,
      })
      .eq("id", existing.id);
    if (updateError) {
      console.error("[me-exams] assessment update failed", updateError);
    }
    await refreshBriefSafe(db, studentId);
    return existing.id;
  }

  const { data: insertData, error: insertError } = await db
    .from("black_assessments")
    .insert({
      student_id: studentId,
      subject: subject || null,
      topics: notes || null,
      when_at: date,
    })
    .select("id")
    .single();
  if (insertError) {
    console.error("[me-exams] assessment insert failed", insertError);
    return null;
  }

  await refreshBriefSafe(db, studentId);
  return insertData?.id ?? null;
}
