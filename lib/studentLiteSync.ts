import { createHash } from "crypto";
import { supabaseServer } from "@/lib/supabase";
import { ensureStudentRecord } from "@/lib/students";

type Nullable<T> = { [K in keyof T]?: T[K] | null | undefined };

const SUPPORTED_CYCLES = new Set(["medie", "superiori", "universita", "altro"]);
const MAX_GRADE_ABS = 100;

function normalizeCycle(value?: string | null) {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "liceo") return "superiori";
  return SUPPORTED_CYCLES.has(lower) ? lower : null;
}

function sanitizeGrade(value?: number | null) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const clamped = Math.max(-MAX_GRADE_ABS, Math.min(MAX_GRADE_ABS, num));
  if (Math.abs(clamped) >= MAX_GRADE_ABS) return null;
  return clamped;
}

function deterministicUuid(prefix: string, userId: string, seed?: string | null) {
  const base = `${prefix}:${userId}:${seed ?? ""}`;
  const hash = createHash("sha256").update(base).digest("hex");
  return (
    `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-` +
    `${hash.slice(16, 20)}-${hash.slice(20, 32)}`
  );
}

async function ensureProfileRow(
  db: ReturnType<typeof supabaseServer>,
  userId: string,
  studentId?: string | null,
  seed?: {
    email?: string | null;
    full_name?: string | null;
    phone?: string | null;
  },
) {
  const { data: existing, error: readError } = await db
    .from("student_profiles")
    .select("user_id, student_id, email")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  if (existing) {
    if (studentId && !existing.student_id) {
      const { error } = await db
        .from("student_profiles")
        .update({ student_id: studentId, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
    }
    return;
  }

  const email = seed?.email?.trim().toLowerCase() || null;
  if (email) {
    const { data: byEmail, error: emailReadError } = await db
      .from("student_profiles")
      .select("user_id, student_id, email")
      .ilike("email", email)
      .maybeSingle();
    if (emailReadError) throw emailReadError;

    if (byEmail) {
      const patch: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };
      if (studentId && !byEmail.student_id) patch.student_id = studentId;
      if (seed?.full_name) patch.full_name = seed.full_name;
      if (seed?.phone) patch.phone = seed.phone;

      const { error } = await db
        .from("student_profiles")
        .update(patch)
        .eq("user_id", byEmail.user_id);
      if (error) throw error;
      return;
    }
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    email: email || `${userId}@autogen.theoremz.local`,
  };
  if (studentId) payload.student_id = studentId;
  if (seed?.full_name) payload.full_name = seed.full_name;
  if (seed?.phone) payload.phone = seed.phone;

  const { error } = await db.from("student_profiles").insert(payload);
  if (error) throw error;
}

async function isProfileEmailOwnedByAnother(
  db: ReturnType<typeof supabaseServer>,
  email: string,
  userId: string,
) {
  const { data, error } = await db
    .from("student_profiles")
    .select("user_id")
    .ilike("email", email)
    .neq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.user_id);
}

export async function syncLiteProfilePatch(
  userId: string,
  patch: Nullable<{
    full_name: string;
    nickname: string;
    phone: string;
    email: string;
    cycle: string;
    indirizzo: string;
    school_year: number;
    media_attuale: number;
    goal_grade: number;
    current_topics: string[];
    weak_subjects: string[];
    weak_topics: string[];
    confidence_math: string;
    newsletter_opt_in: boolean;
    is_black: boolean;
    onboarding_completed_at: string;
    onboarding_version: string;
    onboarding_return_to: string;
    tutor_help_requested: boolean;
    tutor_help_requested_at: string;
    onboarding_segment: Record<string, unknown>;
    current_focus_subject: string;
    current_focus_topic: string;
    current_focus_topic_code: string;
    current_focus_need: string;
    help_urgency: string;
  }>
) {
  const db = supabaseServer();
  const student = await ensureStudentRecord(
    {
      authUid: userId,
      fullName: typeof patch?.full_name === "string" ? patch.full_name : null,
      email: typeof patch?.email === "string" ? patch.email : null,
      phone: typeof patch?.phone === "string" ? patch.phone : null,
      source: "auth",
    },
    db,
  );
  await ensureProfileRow(db, userId, student.id, {
    email: typeof patch?.email === "string" ? patch.email : null,
    full_name: typeof patch?.full_name === "string" ? patch.full_name : null,
    phone: typeof patch?.phone === "string" ? patch.phone : null,
  });

  const payload: Record<string, unknown> = {
    student_id: student.id,
    updated_at: new Date().toISOString(),
  };
  const incomingEmail =
    typeof patch?.email === "string" ? patch.email.trim().toLowerCase() : null;
  const emailOwnedByAnother = incomingEmail
    ? await isProfileEmailOwnedByAnother(db, incomingEmail, userId)
    : false;

  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined) continue;
    if (key === "cycle") {
      payload[key] = normalizeCycle(value as string | null);
    } else if (key === "email") {
      if (incomingEmail && !emailOwnedByAnother) payload[key] = incomingEmail;
    } else {
      payload[key] = value;
    }
  }

  if (Object.keys(payload).length <= 1) return;

  const { error } = await db
    .from("student_profiles")
    .update(payload)
    .eq("user_id", userId);
  if (error) throw error;
  return student;
}

export async function recordStudentAssessmentLite({
  userId,
  seed,
  date,
  subject,
  topics,
  notes,
  kind = "verifica",
  grade,
  grade_photo_url,
}: {
  userId: string;
  seed?: string | null;
  date: string;
  subject?: string | null;
  topics?: string | null;
  notes?: string | null;
  kind?: "verifica" | "interrogazione" | string;
  grade?: number | null;
  grade_photo_url?: string | null;
}) {
  if (!date) return;
  const db = supabaseServer();
  const student = await ensureStudentRecord({ authUid: userId, source: "auth" }, db);
  await ensureProfileRow(db, userId, student.id);

  const id = deterministicUuid("assessment", userId, seed ?? `${date}:${subject ?? ""}:${kind}`);
  const payload = {
    id,
    student_id: student.id,
    user_id: userId,
    kind: kind || "verifica",
    date,
    subject: subject ?? null,
    topics: topics ?? null,
    notes: notes ?? null,
    grade: sanitizeGrade(grade),
    grade_photo_url: grade_photo_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("student_assessments").upsert(payload);
  if (error) throw error;
  return id;
}

export async function recordStudentGradeLite({
  userId,
  seed,
  date,
  subject,
  grade,
  assessmentId,
  assessmentSeed,
}: {
  userId: string;
  seed: string;
  date: string;
  subject?: string | null;
  grade: number;
  assessmentId?: string | null;
  assessmentSeed?: string | null;
}) {
  const normalized = sanitizeGrade(grade);
  if (!date || normalized === null) return;
  const db = supabaseServer();
  const student = await ensureStudentRecord({ authUid: userId, source: "auth" }, db);
  await ensureProfileRow(db, userId, student.id);

  const id = deterministicUuid("grade", userId, seed);
  const targetAssessmentId =
    assessmentId || (assessmentSeed ? deterministicUuid("assessment", userId, assessmentSeed) : null);
  const payload = {
    id,
    student_id: student.id,
    user_id: userId,
    subject: subject ?? null,
    grade: normalized,
    taken_on: date,
    assessment_id: targetAssessmentId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("student_grades").upsert(payload);
  if (error) throw error;

  if (targetAssessmentId) {
    await db
      .from("student_assessments")
      .update({ grade: normalized, updated_at: new Date().toISOString() })
      .eq("id", targetAssessmentId);
  }
  return id;
}

export async function upsertSavedLessonLite({
  userId,
  slug,
  status,
  savedAt,
}: {
  userId: string;
  slug: string;
  status: "saved" | "completed" | "viewed";
  savedAt?: number;
}) {
  if (!slug) return;
  const db = supabaseServer();
  const student = await ensureStudentRecord({ authUid: userId, source: "auth" }, db);
  await ensureProfileRow(db, userId, student.id);
  const id = deterministicUuid("lesson", userId, `${slug}:${status}`);
  const payload = {
    id,
    student_id: student.id,
    user_id: userId,
    slug,
    status,
    updated_at: savedAt ? new Date(savedAt).toISOString() : new Date().toISOString(),
  };
  const { error } = await db.from("student_lessons_progress").upsert(payload);
  if (error) throw error;
}

export async function deleteSavedLessonLite({
  userId,
  lessonId,
  slug,
}: {
  userId: string;
  lessonId?: string;
  slug?: string;
}) {
  const slugOrId = slug || lessonId;
  if (!slugOrId) return;
  const db = supabaseServer();
  await db
    .from("student_lessons_progress")
    .delete()
    .match({ user_id: userId, slug: slugOrId, status: "saved" });
}

export async function logStudentAccessLite({
  userId,
  sessionId,
  ip,
  userAgent,
}: {
  userId: string;
  sessionId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const db = supabaseServer();
  const student = await ensureStudentRecord({ authUid: userId, source: "auth" }, db);
  await ensureProfileRow(db, userId, student.id);
  const now = new Date().toISOString();

  await db
    .from("student_profiles")
    .update({ student_id: student.id, last_access_at: now, updated_at: now })
    .eq("user_id", userId);

  try {
    await db.from("student_access_logs").insert({
      student_id: student.id,
      user_id: userId,
      accessed_at: now,
      session_id: sessionId || null,
      ip: ip || null,
      user_agent: userAgent || null,
    });
  } catch (error) {
    console.warn("[studentLiteSync] access log insert failed", error);
  }
}
