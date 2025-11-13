import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";

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
  const snap = await adminDb
    .collection(`users/${uid}/exams`)
    .orderBy("date")
    .get();
  const items = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      date: data.date,
      subject: data.subject ?? null,
      notes: data.notes ?? null,
      grade: typeof data.grade === "number" ? data.grade : data.gradeValue ?? null,
      grade_subject: data.grade_subject ?? null,
      grade_id: data.gradeId || data.grade_id || null,
    };
  });
  return NextResponse.json({ items });
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

async function refreshBriefSafe(db: ReturnType<typeof supabaseServer>, studentId: string) {
  try {
    await db.rpc("refresh_black_brief", { _student: studentId });
  } catch (error) {
    console.warn("[me-exams] refresh brief failed", error);
  }
}
