import { supabaseServer } from "@/lib/supabase";

type StudentRow = {
  id: string;
  auth_uid: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  phone_normalized: string | null;
  source: string | null;
};

type EnsureStudentInput = {
  authUid?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
};

export function normalizeStudentEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase() || "";
  return normalized.length ? normalized : null;
}

export function normalizeStudentPhone(value?: string | null) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length ? digits : null;
}

export function isUuidLike(value?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || "",
  );
}

function normalizeName(value?: string | null) {
  const trimmed = value?.trim() || "";
  return trimmed.length ? trimmed : null;
}

function shouldPreferIncomingEmail(current?: string | null, incoming?: string | null) {
  if (!incoming) return false;
  if (!current) return true;
  return current.endsWith("@autogen.tz");
}

function shouldPreferIncomingName(current?: string | null, incoming?: string | null) {
  if (!incoming) return false;
  if (!current) return true;
  const normalizedCurrent = current.trim().toLowerCase();
  return normalizedCurrent === "studente" || normalizedCurrent === "student";
}

async function findStudentByAuthUid(
  db: ReturnType<typeof supabaseServer>,
  authUid: string,
) {
  const { data, error } = await db
    .from("students")
    .select("id, auth_uid, full_name, email, phone, phone_normalized, source")
    .eq("auth_uid", authUid)
    .maybeSingle();
  if (error) throw error;
  return (data as StudentRow | null) || null;
}

async function findStudentByEmail(
  db: ReturnType<typeof supabaseServer>,
  email: string,
) {
  const { data, error } = await db
    .from("students")
    .select("id, auth_uid, full_name, email, phone, phone_normalized, source")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return (data as StudentRow | null) || null;
}

async function findStudentByPhone(
  db: ReturnType<typeof supabaseServer>,
  phoneNormalized: string,
) {
  const { data, error } = await db
    .from("students")
    .select("id, auth_uid, full_name, email, phone, phone_normalized, source")
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();
  if (error) throw error;
  return (data as StudentRow | null) || null;
}

export async function ensureStudentRecord(
  input: EnsureStudentInput,
  db: ReturnType<typeof supabaseServer> = supabaseServer(),
) {
  const authUid = input.authUid?.trim() || null;
  const fullName = normalizeName(input.fullName);
  const email = normalizeStudentEmail(input.email);
  const phone = normalizeName(input.phone);
  const phoneNormalized = normalizeStudentPhone(input.phone);
  const source = normalizeName(input.source) || "manual";
  const now = new Date().toISOString();

  let existing: StudentRow | null = null;
  if (authUid) existing = await findStudentByAuthUid(db, authUid);
  if (!existing && email) existing = await findStudentByEmail(db, email);
  if (!existing && phoneNormalized) existing = await findStudentByPhone(db, phoneNormalized);

  if (!existing) {
    const { data, error } = await db
      .from("students")
      .insert({
        auth_uid: authUid,
        full_name: fullName,
        email,
        phone,
        phone_normalized: phoneNormalized,
        source,
        updated_at: now,
      })
      .select("id, auth_uid, full_name, email, phone, phone_normalized, source")
      .single();
    if (error) throw error;
    return data as StudentRow;
  }

  const patch: Partial<StudentRow> & { updated_at: string } = { updated_at: now };
  if (!existing.auth_uid && authUid) patch.auth_uid = authUid;
  if (shouldPreferIncomingName(existing.full_name, fullName)) patch.full_name = fullName;
  if (shouldPreferIncomingEmail(existing.email, email)) patch.email = email;
  if (!existing.phone && phone) patch.phone = phone;
  if (!existing.phone_normalized && phoneNormalized) patch.phone_normalized = phoneNormalized;
  if (!existing.source && source) patch.source = source;

  if (Object.keys(patch).length > 1) {
    const { data, error } = await db
      .from("students")
      .update(patch)
      .eq("id", existing.id)
      .select("id, auth_uid, full_name, email, phone, phone_normalized, source")
      .single();
    if (error) throw error;
    return data as StudentRow;
  }

  return existing;
}
