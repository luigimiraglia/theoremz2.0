#!/usr/bin/env node
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();
import admin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
}
if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_PROJECT_ID) {
  throw new Error("Missing Firebase admin env vars (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID).");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const firestore = admin.firestore();
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function normalizeDate(value) {
  if (!value) return new Date();
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (typeof value === "number") return new Date(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function migrateUserSavedLessons(uid) {
  const snap = await firestore.collection(`users/${uid}/savedLessons`).get();
  if (snap.empty) return 0;

  const rows = snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      const lessonId =
        (typeof data.lessonId === "string" && data.lessonId.trim()) ||
        (typeof data.slug === "string" && data.slug.trim()) ||
        doc.id;
      const lessonSlug =
        (typeof data.slug === "string" && data.slug.trim()) ||
        (typeof data.lessonId === "string" && data.lessonId.trim()) ||
        doc.id;
      if (!lessonId || !lessonSlug) return null;
      const title =
        (typeof data.title === "string" && data.title.trim()) || lessonSlug;
      const thumb =
        typeof data.thumb === "string"
          ? data.thumb
          : typeof data.thumbnail === "string"
            ? data.thumbnail
            : null;
      return {
        user_id: uid,
        lesson_id: lessonId,
        lesson_slug: lessonSlug,
        title,
        thumb_url: thumb,
        status: data.status || "saved",
        saved_at: normalizeDate(data.savedAt ?? data.createdAt),
        updated_at: normalizeDate(
          data.updatedAt ?? data.savedAt ?? data.createdAt
        ),
        notes: data.notes || null,
      };
    })
    .filter(Boolean);

  const { error } = await supabase
    .from("student_saved_lessons")
    .upsert(rows, { onConflict: "user_id,lesson_id" });
  if (error) {
    throw new Error(`[migrate-saved] ${uid}: ${error.message}`);
  }
  return rows.length;
}

async function main() {
  const usersSnap = await firestore.collection("users").get();
  let totalLessons = 0;
  let processedUsers = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    try {
      const count = await migrateUserSavedLessons(uid);
      if (count > 0) {
        console.log(`[migrate-saved] ${uid}: ${count} lessons`);
        totalLessons += count;
      }
      processedUsers += 1;
    } catch (err) {
      console.error(err.message || err);
    }
  }

  console.log(`[migrate-saved] Completed: ${processedUsers} users, ${totalLessons} lessons migrated.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
