import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
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
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    subject: row.subject,
    grade: typeof row.grade === "number" ? row.grade : null,
    date: row.taken_on,
    source: row.source ?? null,
    assessment_id: row.assessment_id ?? null,
  }));
  return NextResponse.json({ items });
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

  const normalizedGrade = Math.max(0, Math.min(10, grade));
  const linkInfo = await linkGradeToAssessment({
    uid,
    date,
    subject,
    grade: normalizedGrade,
  });

  const gradeId = await recordStudentGradeLite({
    userId: uid,
    seed: `account:${date}:${subject}:${Date.now()}`,
    date,
    subject,
    grade: normalizedGrade,
    assessmentId: linkInfo?.assessmentId || null,
  });

  await syncBlackGrade({
    uid,
    date,
    grade: normalizedGrade,
    subject,
    examSubject: linkInfo?.examSubject || null,
  });

  return NextResponse.json({ ok: true, id: gradeId });
}

async function linkGradeToAssessment({
  uid,
  date,
  subject,
  grade,
}: {
  uid: string;
  date: string;
  subject: "matematica" | "fisica";
  grade: number;
}) {
  try {
    const db = supabaseServer();
    const { data, error } = await db
      .from("student_assessments")
      .select("id, subject, grade")
      .eq("user_id", uid)
      .eq("date", date)
      .eq("kind", "verifica")
      .limit(10);
    if (error) throw error;
    if (!data?.length) return null;

    const target =
      data.find((row) => typeof row.grade !== "number" && row.subject === subject) ||
      data.find((row) => typeof row.grade !== "number") ||
      data[0];

    const { error: updateError } = await db
      .from("student_assessments")
      .update({ grade, updated_at: new Date().toISOString() })
      .eq("id", target.id);
    if (updateError) throw updateError;

    return {
      assessmentId: target.id,
      examSubject: target.subject || null,
    };
  } catch (error) {
    console.error("[grades] failed linking grade to assessment", error);
    return null;
  }
}
