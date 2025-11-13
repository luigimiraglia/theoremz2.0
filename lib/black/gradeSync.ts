import { supabaseServer } from "@/lib/supabase";

export async function syncBlackGrade({
  uid,
  studentId: providedStudentId,
  date,
  subject,
  grade,
  assessmentId,
  examSubject,
}: {
  uid?: string | null;
  studentId?: string | null;
  date: string;
  subject?: string | null;
  grade: number;
  assessmentId?: string | null;
  examSubject?: string | null;
}) {
  const db = supabaseServer();
  let studentId = providedStudentId || null;
  if (!studentId && uid) {
    const { data, error } = await db
      .from("black_students")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      console.error("[grade-sync] student lookup failed", error);
    }
    studentId = data?.id || null;
  }
  if (!studentId) return;

  const resolvedSubject = subject || examSubject || null;
  const { error: gradeError } = await db.from("black_grades").insert({
    student_id: studentId,
    subject: resolvedSubject,
    score: grade,
    max_score: 10,
    when_at: date,
  });
  if (gradeError) {
    console.error("[grade-sync] black_grades insert failed", gradeError);
  }

  const assessmentRow = await findAssessment({
    db,
    studentId,
    date,
    assessmentId,
    subject: examSubject || subject || null,
  });
  if (assessmentRow) {
    const line = buildAssessmentResultLine({
      score: grade,
      max: 10,
      subject: resolvedSubject,
    });
    const topics = mergeAssessmentTopics(assessmentRow.topics || "", line);
    const { error: updateError } = await db
      .from("black_assessments")
      .update({ topics })
      .eq("id", assessmentRow.id);
    if (updateError) {
      console.error("[grade-sync] assessment update failed", updateError);
    }
  }

  await refreshBriefSafe(db, studentId);
}

async function findAssessment({
  db,
  studentId,
  date,
  assessmentId,
  subject,
}: {
  db: ReturnType<typeof supabaseServer>;
  studentId: string;
  date: string;
  assessmentId?: string | null;
  subject?: string | null;
}) {
  if (assessmentId) {
    const { data } = await db
      .from("black_assessments")
      .select("id, subject, topics")
      .eq("id", assessmentId)
      .maybeSingle();
    if (data?.id) return data;
  }
  const { data } = await db
    .from("black_assessments")
    .select("id, subject, topics")
    .eq("student_id", studentId)
    .eq("when_at", date);
  if (!data?.length) return null;
  if (data.length === 1) return data[0];
  if (subject) {
    const normalized = subject.toLowerCase();
    return (
      data.find((row) => (row.subject || "").toLowerCase() === normalized) ||
      data[0]
    );
  }
  return data[0];
}

export function buildAssessmentResultLine({
  score,
  max,
  subject,
}: {
  score: number;
  max: number;
  subject: string | null;
}) {
  const cleanScore =
    Number.isFinite(score) && Number.isFinite(max)
      ? `${score}/${max}`
      : "";
  const label = subject ? `Esito ${subject}` : "Esito verifica";
  return cleanScore ? `${label}: ${cleanScore}` : `${label}: registrato`;
}

export function mergeAssessmentTopics(current: string, resultLine: string) {
  const lines = current
    ? current.split("\n").map((line) => line.trimEnd())
    : [];
  const idx = lines.findIndex((line) =>
    line.trim().toLowerCase().startsWith("esito")
  );
  if (idx >= 0) lines[idx] = resultLine;
  else lines.push(resultLine);
  return lines.filter(Boolean).join("\n");
}

export async function refreshBriefSafe(
  db: ReturnType<typeof supabaseServer>,
  studentId: string
) {
  try {
    await db.rpc("refresh_black_brief", { _student: studentId });
  } catch (error) {
    console.warn("[grade-sync] refresh brief failed", error);
  }
}
