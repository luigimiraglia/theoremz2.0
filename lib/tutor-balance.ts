import { supabaseServer } from "@/lib/supabase";

type SupabaseClient = ReturnType<typeof supabaseServer>;

function normalizeHours(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function resetTutorBalance({
  db,
  tutorId,
}: {
  db?: SupabaseClient;
  tutorId: string;
}) {
  const client = db ?? supabaseServer();
  if (!client) {
    throw new Error("Supabase non configurato");
  }

  const resolvedTutorId = String(tutorId || "").trim();
  if (!resolvedTutorId) {
    throw new Error("tutorId mancante");
  }

  const [directRes, assignedRes] = await Promise.all([
    client
      .from("students")
      .select("id, hours_consumed")
      .eq("videolesson_tutor_id", resolvedTutorId),
    client
      .from("tutor_assignments")
      .select("student_id, role")
      .eq("tutor_id", resolvedTutorId),
  ]);

  if (directRes.error) {
    throw new Error(directRes.error.message);
  }
  if (assignedRes.error) {
    throw new Error(assignedRes.error.message);
  }

  const students = new Map<string, { hoursConsumed: number; role: string }>();

  (directRes.data || []).forEach((row: any) => {
    if (!row?.id) return;
    students.set(row.id, {
      hoursConsumed: normalizeHours(row.hours_consumed),
      role: "videolezione",
    });
  });

  const assignedStudentIds = Array.from(
    new Set(
      (assignedRes.data || [])
        .map((row: any) => row?.student_id)
        .filter(Boolean),
    ),
  );
  if (assignedStudentIds.length) {
    const { data: assignedStudents, error: assignedStudentsError } = await client
      .from("students")
      .select("id, hours_consumed")
      .in("id", assignedStudentIds);
    if (assignedStudentsError) {
      throw new Error(assignedStudentsError.message);
    }
    const byId = new Map((assignedStudents || []).map((row: any) => [row.id, row]));
    (assignedRes.data || []).forEach((row: any) => {
      const student = byId.get(row?.student_id);
      if (!student?.id) return;
      students.set(student.id, {
        hoursConsumed: normalizeHours(student.hours_consumed),
        role: typeof row?.role === "string" && row.role ? row.role : "videolezione",
      });
    });
  }

  const assignments = Array.from(students.entries()).map(
    ([studentId, meta]) => ({
      tutor_id: resolvedTutorId,
      student_id: studentId,
      consumed_baseline: meta.hoursConsumed,
      role: meta.role || "videolezione",
    }),
  );

  if (assignments.length) {
    const { error } = await client
      .from("tutor_assignments")
      .upsert(assignments, { onConflict: "tutor_id,student_id" });
    if (error) {
      throw new Error(error.message);
    }
  }

  const now = new Date().toISOString();
  const { data: tutorRow, error: tutorErr } = await client
    .from("tutors")
    .update({ hours_due: 0, updated_at: now })
    .eq("id", resolvedTutorId)
    .select("id")
    .maybeSingle();
  if (tutorErr) {
    throw new Error(tutorErr.message);
  }
  if (!tutorRow) {
    throw new Error("Tutor non trovato");
  }

  return { tutorId: resolvedTutorId, updatedStudents: assignments.length };
}
