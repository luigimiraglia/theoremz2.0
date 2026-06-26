import { supabaseServer } from "@/lib/supabase";
import { resolveBlackStudentIdentity } from "@/lib/black/studentIdentity";

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
  let identity = null;
  try {
    identity = await resolveBlackStudentIdentity(db, {
      authUid: uid,
      legacyBlackStudentId: providedStudentId,
    });
  } catch (error) {
    console.error("[grade-sync] student lookup failed", error);
  }
  if (!identity?.canonicalStudentId) return;

  const resolvedSubject = subject || examSubject || null;
  const { error: gradeError } = await db.from("black_grades").insert({
    student_id: identity.canonicalStudentId,
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
    studentId: identity.canonicalStudentId,
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

  await refreshBriefSafe(db, identity.canonicalStudentId);
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
  const rows = data || [];
  if (!rows.length) return null;
  if (rows.length === 1) return rows[0];
  if (subject) {
    const normalized = subject.toLowerCase();
    return (
      rows.find((row) => (row.subject || "").toLowerCase() === normalized) ||
      rows[0]
    );
  }
  return rows[0];
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
