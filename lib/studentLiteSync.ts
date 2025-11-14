import { createHash } from "crypto";
import { supabaseServer } from "@/lib/supabase";

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

async function ensureProfileRow(db: ReturnType<typeof supabaseServer>, userId: string) {
  const { error } = await db
    .from("student_profiles")
    .upsert({ user_id: userId }, { onConflict: "user_id" });
  if (error) throw error;
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
  }>
) {
  const db = supabaseServer();
  await ensureProfileRow(db, userId);

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined) continue;
    if (key === "cycle") {
      payload[key] = normalizeCycle(value as string | null);
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
  await ensureProfileRow(db, userId);

  const id = deterministicUuid("assessment", userId, seed ?? `${date}:${subject ?? ""}:${kind}`);
  const payload = {
    id,
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
  assessmentSeed,
}: {
  userId: string;
  seed: string;
  date: string;
  subject?: string | null;
  grade: number;
  assessmentSeed?: string | null;
}) {
  const normalized = sanitizeGrade(grade);
  if (!date || normalized === null) return;
  const db = supabaseServer();
  await ensureProfileRow(db, userId);

  const id = deterministicUuid("grade", userId, seed);
  const payload = {
    id,
    user_id: userId,
    subject: subject ?? null,
    grade: normalized,
    taken_on: date,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("student_grades").upsert(payload);
  if (error) throw error;

  if (assessmentSeed) {
    const assessmentId = deterministicUuid("assessment", userId, assessmentSeed);
    await db
      .from("student_assessments")
      .update({ grade: normalized, updated_at: new Date().toISOString() })
      .eq("id", assessmentId);
  }
}

export async function upsertSavedLessonLite({
  userId,
  slug,
  status,
  savedAt,
}: {
  userId: string;
  slug: string;
  status: "saved" | "completed";
  savedAt?: number;
}) {
  if (!slug) return;
  const db = supabaseServer();
  await ensureProfileRow(db, userId);
  const id = deterministicUuid("lesson", userId, `${slug}:${status}`);
  const payload = {
    id,
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
  await ensureProfileRow(db, userId);
  const now = new Date().toISOString();

  await db
    .from("student_profiles")
    .update({ last_access_at: now, updated_at: now })
    .eq("user_id", userId);

  try {
    await db.from("student_access_logs").insert({
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
