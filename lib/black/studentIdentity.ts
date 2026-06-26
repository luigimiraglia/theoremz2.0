import { supabaseServer } from "@/lib/supabase";

type SupabaseDb = ReturnType<typeof supabaseServer>;

export type BlackStudentIdentity = {
  canonicalStudentId: string;
  // Compatibility name for older call sites. After the DB refactor this is the
  // same canonical students.id value.
  legacyBlackStudentId: string | null;
};

export async function resolveBlackStudentIdentity(
  db: SupabaseDb,
  input: {
    authUid?: string | null;
    canonicalStudentId?: string | null;
    legacyBlackStudentId?: string | null;
  },
): Promise<BlackStudentIdentity | null> {
  const canonicalStudentId = input.canonicalStudentId?.trim() || null;
  if (canonicalStudentId) {
    const { data, error } = await db
      .from("students")
      .select("id")
      .eq("id", canonicalStudentId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) {
      return {
        canonicalStudentId: data.id,
        legacyBlackStudentId: data.id,
      };
    }
  }

  const legacyBlackStudentId = input.legacyBlackStudentId?.trim() || null;
  if (legacyBlackStudentId) {
    const { data: student, error: studentError } = await db
      .from("students")
      .select("id")
      .eq("id", legacyBlackStudentId)
      .maybeSingle();
    if (studentError) throw studentError;
    if (student?.id) {
      return {
        canonicalStudentId: student.id,
        legacyBlackStudentId: student.id,
      };
    }
  }

  const authUid = input.authUid?.trim() || null;
  if (!authUid) return null;

  const { data: student, error: studentError } = await db
    .from("students")
    .select("id")
    .eq("auth_uid", authUid)
    .maybeSingle();
  if (studentError) throw studentError;
  if (student?.id) {
    return {
      canonicalStudentId: student.id,
      legacyBlackStudentId: student.id,
    };
  }

  const { data: legacy, error: legacyError } = await db
    .from("students")
    .select("id")
    .eq("user_id", authUid)
    .maybeSingle();
  if (legacyError) throw legacyError;
  if (!legacy?.id) return null;

  return {
    canonicalStudentId: legacy.id,
    legacyBlackStudentId: legacy.id,
  };
}
