#!/usr/bin/env node
/**
 * Syncs student_profiles.is_black with the current black_students statuses.
 * Usage: node scripts/update-lite-is-black.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", null]);
const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase credentials not configured in env.");
}

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function fetchBlackStudents() {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("black_students")
      .select("user_id,status")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    from += data.length;
    if (data.length < pageSize) break;
  }
  return rows.filter((row) => row.user_id);
}

async function chunkedUpdate(userIds, value) {
  const chunkSize = 100;
  const now = new Date().toISOString();
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("student_profiles")
      .update({ is_black: value, updated_at: now })
      .in("user_id", chunk);
    if (error) throw error;
  }
}

async function main() {
  console.log("▶️  Syncing student_profiles.is_black");
  const students = await fetchBlackStudents();
  console.log(`• Loaded ${students.length} black_students rows`);

  console.log("• Resetting all profiles to is_black=false");
  const { error: resetError } = await supabase
    .from("student_profiles")
    .update({ is_black: false, updated_at: new Date().toISOString() })
    .neq("user_id", null);
  if (resetError) throw resetError;

  const activeUserIds = students
    .filter((row) => ACTIVE_STATUSES.has(row.status))
    .map((row) => row.user_id);
  console.log(`• Marking ${activeUserIds.length} users as Black`);
  if (activeUserIds.length) {
    await chunkedUpdate(activeUserIds, true);
  }

  console.log("✅ is_black sync completed");
}

main().catch((err) => {
  console.error("❌ Sync failed", err);
  process.exit(1);
});
