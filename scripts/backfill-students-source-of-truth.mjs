#!/usr/bin/env node
/**
 * Backfill additive per introdurre `students` come source of truth applicativa.
 *
 * Cosa fa:
 * - crea/aggiorna righe in `students` partendo da `student_profiles`, `profiles` e `black_students`
 * - collega `student_id` alle tabelle account (`student_*`, `student_saved_lessons`)
 * - collega `student_id` a `black_students`
 *
 * Usa: node scripts/backfill-students-source-of-truth.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PAGE_SIZE = 1000;
const PROGRESS_EVERY = 25;
const ACCOUNT_TABLES = [
  "student_profiles",
  "student_assessments",
  "student_grades",
  "student_lessons_progress",
  "student_exercises_progress",
  "student_difficulties",
  "student_access_logs",
  "student_saved_lessons",
];

function normalizeEmail(value) {
  const normalized = value?.trim().toLowerCase() || "";
  return normalized.length ? normalized : null;
}

function normalizeName(value) {
  const trimmed = value?.trim() || "";
  return trimmed.length ? trimmed : null;
}

function normalizePhone(value) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length ? digits : null;
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || "",
  );
}

async function fetchAll(table, select, options = {}) {
  const {
    orderColumn = "created_at",
    isNullColumn = null,
    progressLabel = null,
  } = options;
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from(table)
      .select(select)
      .order(orderColumn, { ascending: true, nullsFirst: true })
      .range(from, from + PAGE_SIZE - 1);
    if (isNullColumn) query = query.is(isNullColumn, null);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (progressLabel) {
      console.log(`• ${progressLabel}: ${rows.length}+ righe caricate`);
    }
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function loadExistingStudents() {
  console.log("• Carico students esistenti...");
  const rows = await fetchAll(
    "students",
    "id, auth_uid, full_name, email, phone, phone_normalized, created_at",
  );
  const byAuthUid = new Map();
  const byEmail = new Map();
  const byPhone = new Map();
  for (const row of rows) {
    if (row.auth_uid) byAuthUid.set(row.auth_uid, row);
    if (row.email) byEmail.set(row.email, row);
    if (row.phone_normalized) byPhone.set(row.phone_normalized, row);
  }
  return { byAuthUid, byEmail, byPhone };
}

async function loadPendingAccountTableUserIds() {
  const pendingByTable = new Map();
  for (const table of ACCOUNT_TABLES) {
    console.log(`• Carico righe pendenti da ${table}...`);
    const rows = await fetchAll(table, "user_id", {
      orderColumn: "user_id",
      isNullColumn: "student_id",
      progressLabel: table,
    });
    pendingByTable.set(
      table,
      new Set(rows.filter((row) => row.user_id).map((row) => row.user_id)),
    );
    console.log(`• ${table}: ${pendingByTable.get(table).size} user_id da collegare`);
  }
  return pendingByTable;
}

function indexStudentMaps(indexes, row) {
  if (row.auth_uid) indexes.byAuthUid.set(row.auth_uid, row);
  if (row.email) indexes.byEmail.set(row.email, row);
  if (row.phone_normalized) indexes.byPhone.set(row.phone_normalized, row);
}

function findStudent(indexes, { authUid, email, phoneNormalized }) {
  if (authUid && indexes.byAuthUid.has(authUid)) return indexes.byAuthUid.get(authUid);
  if (email && indexes.byEmail.has(email)) return indexes.byEmail.get(email);
  if (phoneNormalized && indexes.byPhone.has(phoneNormalized)) return indexes.byPhone.get(phoneNormalized);
  return null;
}

async function ensureStudent(indexes, { authUid, fullName, email, phone, source }) {
  const normalizedAuthUid = authUid?.trim() || null;
  const normalizedName = normalizeName(fullName);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizeName(phone);
  const phoneNormalized = normalizePhone(phone);
  const now = new Date().toISOString();

  const existing = findStudent(indexes, {
    authUid: normalizedAuthUid,
    email: normalizedEmail,
    phoneNormalized,
  });

  if (!existing) {
    const { data, error } = await supabase
      .from("students")
      .insert({
        auth_uid: normalizedAuthUid,
        full_name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        phone_normalized: phoneNormalized,
        source,
        updated_at: now,
      })
      .select("id, auth_uid, full_name, email, phone, phone_normalized")
      .single();
    if (error) throw error;
    indexStudentMaps(indexes, data);
    return data;
  }

  const patch = { updated_at: now };
  if (!existing.auth_uid && normalizedAuthUid) patch.auth_uid = normalizedAuthUid;
  if (!existing.full_name && normalizedName) patch.full_name = normalizedName;
  if ((!existing.email || existing.email.endsWith("@autogen.tz")) && normalizedEmail) {
    patch.email = normalizedEmail;
  }
  if (!existing.phone && normalizedPhone) patch.phone = normalizedPhone;
  if (!existing.phone_normalized && phoneNormalized) patch.phone_normalized = phoneNormalized;

  if (Object.keys(patch).length > 1) {
    const { data, error } = await supabase
      .from("students")
      .update(patch)
      .eq("id", existing.id)
      .select("id, auth_uid, full_name, email, phone, phone_normalized")
      .single();
    if (error) throw error;
    indexStudentMaps(indexes, data);
    return data;
  }

  return existing;
}

async function setAccountTableStudentId(userId, studentId, pendingByTable) {
  for (const table of ACCOUNT_TABLES) {
    const pending = pendingByTable.get(table);
    if (pending && !pending.has(userId)) continue;
    const { error } = await supabase
      .from(table)
      .update({ student_id: studentId })
      .eq("user_id", userId)
      .is("student_id", null);
    if (error) throw error;
    if (pending) pending.delete(userId);
  }
}

async function backfillStudentProfiles(summary, indexes, pendingByTable) {
  console.log("• Carico student_profiles...");
  const rows = await fetchAll(
    "student_profiles",
    "user_id, student_id, full_name, email, phone, created_at",
  );
  const map = new Map();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const student = await ensureStudent(indexes, {
      authUid: row.user_id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      source: "student_profile_backfill",
    });
    map.set(row.user_id, student.id);

    if (row.student_id !== student.id) {
      const { error } = await supabase
        .from("student_profiles")
        .update({ student_id: student.id })
        .eq("user_id", row.user_id);
      if (error) throw error;
    }

    await setAccountTableStudentId(row.user_id, student.id, pendingByTable);
    summary.studentsLinked += 1;
    if ((i + 1) % PROGRESS_EVERY === 0 || i === rows.length - 1) {
      console.log(`• student_profiles: ${i + 1}/${rows.length}`);
    }
  }

  return map;
}

async function backfillProfilesWithoutStudentProfile(profileMap, summary, indexes) {
  console.log("• Carico profiles...");
  const rows = await fetchAll(
    "profiles",
    "id, full_name, email, role, created_at",
  );

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.role !== "student") continue;
    if (profileMap.has(row.id)) continue;
    if (isUuidLike(row.id)) continue;

    const student = await ensureStudent(indexes, {
      authUid: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: null,
      source: "profile_backfill",
    });
    profileMap.set(row.id, student.id);
    summary.studentsLinked += 1;
    if ((i + 1) % PROGRESS_EVERY === 0 || i === rows.length - 1) {
      console.log(`• profiles: ${i + 1}/${rows.length}`);
    }
  }
}

async function backfillBlackStudents(profileMap, summary, indexes, pendingByTable) {
  console.log("• Carico black_students...");
  const rows = await fetchAll(
    "black_students",
    "id, user_id, student_id, preferred_name, student_email, parent_email, student_phone, parent_phone, created_at",
  );

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const authUid = profileMap.has(row.user_id)
      ? row.user_id
      : isUuidLike(row.user_id)
        ? null
        : row.user_id;

    const student = await ensureStudent(indexes, {
      authUid,
      fullName: row.preferred_name,
      email: row.student_email || row.parent_email || null,
      phone: row.student_phone || row.parent_phone || null,
      source: "black_student_backfill",
    });

    if (row.student_id !== student.id) {
      const { error } = await supabase
        .from("black_students")
        .update({ student_id: student.id })
        .eq("id", row.id);
      if (error) throw error;
    }

    if (authUid) {
      await setAccountTableStudentId(authUid, student.id, pendingByTable);
    }

    summary.blackLinked += 1;
    if ((i + 1) % PROGRESS_EVERY === 0 || i === rows.length - 1) {
      console.log(`• black_students: ${i + 1}/${rows.length}`);
    }
  }
}

async function main() {
  const summary = {
    studentsLinked: 0,
    blackLinked: 0,
  };

  console.log("▶ Backfilling students source of truth");
  const indexes = await loadExistingStudents();
  console.log(`• students caricati: ${indexes.byAuthUid.size} auth_uid, ${indexes.byEmail.size} email, ${indexes.byPhone.size} telefoni`);
  const pendingByTable = await loadPendingAccountTableUserIds();
  console.log("• Inizio backfill student_profiles");
  const profileMap = await backfillStudentProfiles(summary, indexes, pendingByTable);
  console.log("• Inizio backfill profiles senza student_profile");
  await backfillProfilesWithoutStudentProfile(profileMap, summary, indexes);
  console.log("• Inizio backfill black_students");
  await backfillBlackStudents(profileMap, summary, indexes, pendingByTable);

  console.log("✅ Backfill completed");
  console.log(summary);
}

main().catch((error) => {
  console.error("❌ Backfill failed");
  console.error(error);
  process.exit(1);
});
