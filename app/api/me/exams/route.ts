import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
import { refreshBriefSafe } from "@/lib/black/gradeSync";
import { resolveBlackStudentIdentity } from "@/lib/black/studentIdentity";
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
    .select("id, date, subject, notes, grade, kind")
    .eq("user_id", uid)
    .order("date", { ascending: true });
  if (error) {
    console.error("[me-exams] supabase query failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const assessmentRows = (data || []).filter((row) => !row.kind || row.kind === "verifica");
  const assessmentIds = assessmentRows.map((row) => row.id);
  let gradesByAssessment = new Map<string, { id: string; subject: string | null; grade: number | null }>();
  if (assessmentIds.length) {
    const { data: grades, error: gradesError } = await db
      .from("student_grades")
      .select("id, assessment_id, subject, grade")
      .eq("user_id", uid)
      .in("assessment_id", assessmentIds);
    if (gradesError) {
      console.error("[me-exams] linked grades query failed", gradesError);
    } else {
      gradesByAssessment = new Map(
        (grades || [])
          .filter((row) => row.assessment_id)
          .map((row) => [
            row.assessment_id as string,
            {
              id: row.id,
              subject: row.subject ?? null,
              grade: typeof row.grade === "number" ? row.grade : null,
            },
          ]),
      );
    }
  }

  const items = assessmentRows.map((row) => {
    const linkedGrade = gradesByAssessment.get(row.id);
    return {
      id: row.id,
      date: row.date,
      subject: row.subject ?? null,
      notes: row.notes ?? null,
      grade: typeof row.grade === "number" ? row.grade : linkedGrade?.grade ?? null,
      grade_subject: linkedGrade?.subject ?? row.subject ?? null,
      grade_id: linkedGrade?.id ?? null,
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

  const id = await recordStudentAssessmentLite({
    userId: uid,
    seed: blackAssessmentId || `account:${date}:${subject || ""}:${Date.now()}`,
    date,
    subject,
    notes,
    kind: "verifica",
  });
  return NextResponse.json({ ok: true, id });
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
  let identity = null;
  try {
    identity = await resolveBlackStudentIdentity(db, { authUid: uid });
  } catch (error) {
    console.error("[me-exams] black student lookup failed", error);
    return null;
  }
  if (!identity?.canonicalStudentId) return null;

  const { data: existing, error: existingError } = await db
    .from("black_assessments")
    .select("id")
    .eq("student_id", identity.canonicalStudentId)
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
    await refreshBriefSafe(db, identity.canonicalStudentId);
    return existing.id;
  }

  const { data: insertData, error: insertError } = await db
    .from("black_assessments")
    .insert({
      student_id: identity.canonicalStudentId,
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

  await refreshBriefSafe(db, identity.canonicalStudentId);
  return insertData?.id ?? null;
}
