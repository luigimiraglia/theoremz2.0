#!/usr/bin/env node
/**
 * Backfill script: garantisce che tutte le verifiche presenti su Supabase
 * (tabella black_assessments) abbiano il relativo documento su Firestore
 * (`users/{uid}/exams/{assessmentId}`), così app/account vedono anche quelle
 * create da Telegram prima della sync automatica.
 *
 * Usage: node scripts/sync-assessments-to-firestore.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials.");
}
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  throw new Error("Missing Firebase Admin credentials.");
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

async function main() {
  console.log("▶️  Sync assessments → Firestore exams");

  const studentMap = await fetchStudentMap();
  console.log(`• Loaded ${studentMap.size} student→uid mappings`);

  const stats = {
    assessmentsProcessed: 0,
    assessmentsMirrored: 0,
    assessmentsSkippedNoUid: 0,
    assessmentsMissingDate: 0,
    gradesProcessed: 0,
    gradesMirrored: 0,
    gradesSkippedNoUid: 0,
    gradesMissingDate: 0,
  };

  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("black_assessments")
      .select("id, student_id, subject, topics, when_at")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      stats.assessmentsProcessed += 1;
      const uid = studentMap.get(row.student_id || "");
      if (!uid) {
        stats.assessmentsSkippedNoUid += 1;
        continue;
      }
      if (!row.when_at) {
        stats.assessmentsMissingDate += 1;
        continue;
      }
      await mirrorAssessment({
        uid,
        assessmentId: row.id,
        date: row.when_at,
        subject: row.subject,
        topics: row.topics,
      });
      stats.assessmentsMirrored += 1;
    }
    from += data.length;
    if (data.length < pageSize) break;
  }

  await syncGrades(studentMap, stats);

  console.log("✅ Sync completed:");
  console.log(
    `   Assessments → processed ${stats.assessmentsProcessed}, mirrored ${stats.assessmentsMirrored}, missingUid ${stats.assessmentsSkippedNoUid}, missingDate ${stats.assessmentsMissingDate}`,
  );
  console.log(
    `   Grades      → processed ${stats.gradesProcessed}, mirrored ${stats.gradesMirrored}, missingUid ${stats.gradesSkippedNoUid}, missingDate ${stats.gradesMissingDate}`,
  );
  process.exit(0);
}

async function fetchStudentMap() {
  const map = new Map();
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("black_students")
      .select("id, user_id")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (row.id && row.user_id) {
        map.set(row.id, row.user_id);
      }
    }
    from += data.length;
    if (data.length < pageSize) break;
  }
  return map;
}

async function mirrorAssessment({ uid, assessmentId, date, subject, topics }) {
  const payload = {
    date,
    subject: subject || null,
    notes: topics || null,
    blackAssessmentId: assessmentId,
    syncedAt: Date.now(),
    source: "supabase_sync",
  };
  await firestore
    .collection(`users/${uid}/exams`)
    .doc(assessmentId)
    .set(payload, { merge: true });
}

async function mirrorGrade({ uid, gradeId, date, subject, grade, maxScore }) {
  const payload = {
    date,
    subject: subject || null,
    grade,
    maxScore: maxScore ?? 10,
    syncedAt: Date.now(),
    source: "supabase_sync",
  };
  await firestore
    .collection(`users/${uid}/grades`)
    .doc(gradeId)
    .set(payload, { merge: true });
}

async function syncGrades(studentMap, stats) {
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("black_grades")
      .select("id, student_id, subject, score, max_score, when_at")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      stats.gradesProcessed += 1;
      const uid = studentMap.get(row.student_id || "");
      if (!uid) {
        stats.gradesSkippedNoUid += 1;
        continue;
      }
      if (!row.when_at) {
        stats.gradesMissingDate += 1;
        continue;
      }
      await mirrorGrade({
        uid,
        gradeId: row.id,
        date: row.when_at,
        subject: row.subject,
        grade: row.score,
        maxScore: row.max_score,
      });
      stats.gradesMirrored += 1;
    }
    from += data.length;
    if (data.length < pageSize) break;
  }
}

main().catch((error) => {
  console.error("❌ Sync failed:", error);
  process.exit(1);
});
