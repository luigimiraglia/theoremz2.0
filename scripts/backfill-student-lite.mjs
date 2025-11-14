#!/usr/bin/env node
/**
 * Popola le nuove tabelle "student_*" su Supabase partendo dai dati già presenti
 * su Firestore (scheda account) e dai subcollection exams/grades/savedLessons.
 *
 * Usa: node scripts/backfill-student-lite.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createHash } from "crypto";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials");
}
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  throw new Error("Missing Firebase Admin credentials");
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const firebaseApp =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

function deterministicId(kind, userId, seed = "") {
  const base = `${kind}:${userId}:${seed}`;
  const hash = createHash("sha256").update(base).digest("hex");
  return (
    `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-` +
    `${hash.slice(16, 20)}-${hash.slice(20, 32)}`
  );
}

const SUPPORTED_CYCLES = new Set(["medie", "superiori", "universita", "altro"]);
const MAX_GRADE_ABS = 100;

function normalizeCycle(value) {
  if (!value) return null;
  const lower = String(value).toLowerCase();
  if (lower === "liceo") return "superiori";
  return SUPPORTED_CYCLES.has(lower) ? lower : null;
}

function sanitizeGrade(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (Math.abs(num) >= MAX_GRADE_ABS) return null;
  return num;
}

async function fetchNewsletterMap() {
  const map = new Map();
  const { data, error } = await supabase
    .from("newsletter_subscriptions")
    .select("user_id, is_active")
    .eq("is_active", true);
  if (error) throw error;
  for (const row of data || []) {
    map.set(row.user_id, true);
  }
  return map;
}

async function upsertProfile(uid, docData, authUser, newsletterMap) {
  const mediaValue =
    typeof docData?.mediaAttuale === "number"
      ? docData.mediaAttuale
      : typeof docData?.media === "number"
        ? docData.media
        : null;
  const payload = {
    user_id: uid,
    full_name: docData?.fullName || authUser?.displayName || null,
    nickname: docData?.username || null,
    phone: docData?.phone || authUser?.phoneNumber || null,
    email: (docData?.email || authUser?.email || "")?.toLowerCase() || null,
    cycle: normalizeCycle(docData?.cycle),
    indirizzo: docData?.indirizzo || null,
    school_year: typeof docData?.year === "number" ? docData.year : null,
    media_attuale: sanitizeGrade(mediaValue),
    goal_grade: sanitizeGrade(docData?.goalMin),
    current_topics: Array.isArray(docData?.currentTopics)
      ? docData.currentTopics
      : null,
    weak_subjects: Array.isArray(docData?.weakSubjects)
      ? docData.weakSubjects
      : null,
    weak_topics: Array.isArray(docData?.weakTopics)
      ? docData.weakTopics
      : null,
    confidence_math:
      typeof docData?.confidenceMath === "number"
        ? String(docData.confidenceMath)
        : null,
    newsletter_opt_in: newsletterMap.get(uid) ?? false,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("student_profiles")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

async function syncAssessments(uid) {
  const examsSnap = await firestore
    .collection(`users/${uid}/exams`)
    .get()
    .catch(() => null);
  const gradeLinkMap = new Map();
  if (!examsSnap || examsSnap.empty) return gradeLinkMap;
  for (const doc of examsSnap.docs) {
    const data = doc.data() || {};
    const date = typeof data.date === "string" ? data.date : null;
    if (!date) continue;
    const seed = data.blackAssessmentId || doc.id;
    const sanitizedGrade =
      sanitizeGrade(
        typeof data.grade === "number"
          ? data.grade
          : typeof data.gradeValue === "number"
            ? data.gradeValue
            : null
      ) ?? null;
    const payload = {
      id: deterministicId("assessment", uid, seed),
      user_id: uid,
      kind: "verifica",
      date,
      subject: data.subject || null,
      notes: data.notes || null,
      topics: data.topics || data.notes || null,
      grade: sanitizedGrade,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("student_assessments")
      .upsert(payload);
    if (error) throw error;
    if (data.grade_id) gradeLinkMap.set(String(data.grade_id), seed);
  }
  return gradeLinkMap;
}

async function syncGrades(uid, gradeLinkMap) {
  const gradesSnap = await firestore
    .collection(`users/${uid}/grades`)
    .get()
    .catch(() => null);
  if (!gradesSnap || gradesSnap.empty) return;
  for (const doc of gradesSnap.docs) {
    const data = doc.data() || {};
    const date = typeof data.date === "string" ? data.date : null;
    const sanitized = sanitizeGrade(data.grade ?? data.gradeValue);
    if (!date || sanitized === null) continue;
    const payload = {
      id: deterministicId("grade", uid, doc.id),
      user_id: uid,
      subject: data.subject || null,
      grade: sanitized,
      taken_on: date,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("student_grades").upsert(payload);
    if (error) throw error;
    const assessmentSeed = gradeLinkMap.get(doc.id);
    if (assessmentSeed) {
      const sanitizedForAssessment = sanitizeGrade(payload.grade);
      if (sanitizedForAssessment === null) continue;
      await supabase
        .from("student_assessments")
        .update({
          grade: sanitizedForAssessment,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deterministicId("assessment", uid, assessmentSeed));
    }
  }
}

async function syncSavedLessons(uid) {
  const savedSnap = await firestore
    .collection(`users/${uid}/savedLessons`)
    .get()
    .catch(() => null);
  if (!savedSnap || savedSnap.empty) return;
  for (const doc of savedSnap.docs) {
    const data = doc.data() || {};
    const slug = data.slug || data.lessonId || doc.id;
    if (!slug) continue;
    const payload = {
      id: deterministicId("lesson", uid, `${slug}:saved`),
      user_id: uid,
      slug,
      status: "saved",
      updated_at: data.savedAt
        ? new Date(data.savedAt).toISOString()
        : new Date().toISOString(),
    };
    const { error } = await supabase
      .from("student_lessons_progress")
      .upsert(payload);
    if (error) throw error;
  }
}

async function processUser(doc, newsletterMap) {
  const uid = doc.id;
  const data = doc.data() || {};
  let authUser = null;
  try {
    authUser = await auth.getUser(uid);
  } catch {
    // utente potrebbe non esistere più
  }
  await upsertProfile(uid, data, authUser, newsletterMap);
  const assessmentMap = await syncAssessments(uid);
  await syncGrades(uid, assessmentMap);
  await syncSavedLessons(uid);
}

async function main() {
  console.log("▶️  Backfill student lite tables");
  const newsletterMap = await fetchNewsletterMap();
  console.log(`• Loaded ${newsletterMap.size} active newsletter opt-ins`);

  const snapshot = await firestore.collection("users").get();
  console.log(`• Found ${snapshot.size} user documents`);

  let processed = 0;
  for (const doc of snapshot.docs) {
    await processUser(doc, newsletterMap);
    processed += 1;
    if (processed % 25 === 0) {
      console.log(`   ...processed ${processed}`);
    }
  }

  console.log(`✅ Completed backfill for ${processed} users.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Backfill failed", err);
  process.exit(1);
});
