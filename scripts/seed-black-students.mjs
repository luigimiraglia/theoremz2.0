#!/usr/bin/env node
/**
 * Minimal seeding script for Theoremz Black.
 * - Pulls Stripe subscriptions to discover active customers
 * - Resolves the corresponding Firebase Auth UID via email
 * - Ensures a Supabase profile exists for each UID
 * - Inserts/updates an entry in black_students with basic contact info
 * - Generates a basic Markdown brief so the Telegram bot can respond
 *
 * Usage: node scripts/seed-black-students.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const {
  STRIPE_SECRET_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!STRIPE_SECRET_KEY || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Stripe or Supabase credentials in env.");
}
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  throw new Error("Missing Firebase Admin envs.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
const auth = getAuth(app);
const firestore = getFirestore(app);

const SUMMARY = { profilesCreated: 0, studentsUpserted: 0, briefsUpserted: 0, skipped: 0 };
const PREMIUM_SUB_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);
const SYNCABLE_SUB_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
]);

async function fetchStripeSubscriptions() {
  const rows = [];
  let startingAfter;
  do {
    const page = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.customer"],
    });
  for (const sub of page.data) {
    if (!SYNCABLE_SUB_STATUSES.has(sub.status)) continue;
    const customer =
      typeof sub.customer === "object" && sub.customer
        ? sub.customer
        : await stripe.customers.retrieve(sub.customer);
      rows.push({ sub, customer });
    }
    startingAfter = page.data.length ? page.data[page.data.length - 1].id : undefined;
    if (!page.has_more) break;
  } while (true);
  return rows;
}

function fallbackName(firebaseUser, customer) {
  return (
    firebaseUser?.displayName ||
    customer?.name ||
    firebaseUser?.email?.split("@")[0] ||
    customer?.email?.split("@")[0] ||
    "Studente"
  );
}

async function ensureProfile(uid, payload) {
  const { data } = await supabase.from("profiles").select("id").eq("id", uid).maybeSingle();
  if (data?.id) return false;
  const insert = await supabase.from("profiles").insert(payload);
  if (insert.error) {
    throw new Error(`profiles insert failed for ${uid}: ${insert.error.message}`);
  }
  return true;
}

function buildBrief(student) {
  const statusLabel = !student.status
    ? "active"
    : PREMIUM_SUB_STATUSES.has(student.status)
      ? student.status
      : `❌ Disdetto (${student.status})`;
  return [
    `${student.full_name} — Theoremz Black`,
    "",
    `Classe: ${student.year_class || "N/A"}   Track: ${student.track || "entrambi"}`,
    `Tutor: ${student.tutor_id || "—"}`,
    "",
    `Piano: ${student.plan_label || "Black"} · Iscritto dal ${student.start_date || "?"}`,
    "",
    "Contatti",
    `Genitore: ${student.parent_name || "—"} — ${student.parent_phone || "—"} — ${
      student.parent_email || "—"
    }`,
    `Studente: ${student.student_email || "—"} — ${student.student_phone || "—"}`,
    "",
    `Stato: ${statusLabel} · Readiness: ${student.readiness ?? 50}/100 (${
      student.risk_level || "yellow"
    })`,
    "",
    `Aggiornato: ${new Date().toISOString().slice(0, 10)}`,
  ].join("\n");
}

function mapYear(doc) {
  const year = Number(doc?.year);
  if (!Number.isFinite(year)) return null;
  const indirizzo = (doc?.indirizzo || "").toLowerCase();
  if (indirizzo.includes("liceo")) return `${year}°Liceo`;
  return `${year}°Superiore`;
}

function mapPlan(price) {
  if (!price) return "Black";
  const nickname = price.nickname?.toLowerCase() || "";
  const lookupKey = price.lookup_key?.toLowerCase() || "";
  const priceId = price.id?.toLowerCase() || "";
  const match = (needle) =>
    nickname.includes(needle) || lookupKey.includes(needle) || priceId.includes(needle);

  if (match("essential")) return "Black Essential";
  if (match("standard") || match("std")) return "Black Standard";
  if (match("ann") || match("year") || match("annual")) return "Black Annuale";
  if (nickname.length) return `Black ${price.nickname}`;
  return "Black";
}

async function getFirestoreMeta(uid) {
  const snap = await firestore.doc(`users/${uid}`).get();
  return snap.exists ? snap.data() : {};
}

async function main() {
  console.log("Fetching Stripe subscriptions...");
  const subscriptions = await fetchStripeSubscriptions();
  console.log(`Found ${subscriptions.length} Stripe customers with subscriptions.`);

  for (const { sub, customer } of subscriptions) {
    const parentEmail = customer.email?.toLowerCase();
    if (!parentEmail) {
      SUMMARY.skipped += 1;
      continue;
    }

    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(parentEmail);
    } catch {
      SUMMARY.skipped += 1;
      continue;
    }

    const uid = firebaseUser.uid;
    const profilePayload = {
      id: uid,
      full_name: fallbackName(firebaseUser, customer),
      role: "student",
      email: firebaseUser.email,
      subscription_tier: PREMIUM_SUB_STATUSES.has(sub.status) ? "black" : "free",
      stripe_customer_id: customer.id,
      stripe_subscription_status: sub.status,
      stripe_price_id: sub.items.data[0]?.price?.id || null,
      stripe_current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      created_at: firebaseUser.metadata?.creationTime || new Date().toISOString(),
      updated_at: firebaseUser.metadata?.lastRefreshTime || new Date().toISOString(),
    };

    const createdProfile = await ensureProfile(uid, profilePayload);
    if (createdProfile) SUMMARY.profilesCreated += 1;

    const firestoreMeta = await getFirestoreMeta(uid);
    const planLabel = mapPlan(sub.items?.data?.[0]?.price ?? null);
    const studentPayload = {
      user_id: uid,
      year_class: mapYear(firestoreMeta),
      track: firestoreMeta?.track || "entrambi",
      start_date: sub.start_date ? new Date(sub.start_date * 1000).toISOString().slice(0, 10) : null,
      goal: firestoreMeta?.goal || null,
      difficulty_focus: firestoreMeta?.difficulty || null,
      parent_name: customer.name || null,
      parent_phone: customer.phone || null,
      parent_email: customer.email,
      student_phone: firestoreMeta?.studentPhone || firebaseUser.phoneNumber || null,
      student_email: firebaseUser.email,
      tutor_id: firestoreMeta?.tutorId || null,
      status: sub.status,
      initial_avg: firestoreMeta?.initial_avg || null,
      readiness: firestoreMeta?.readiness ?? 50,
      risk_level: firestoreMeta?.risk_level || "yellow",
      ai_description: firestoreMeta?.ai_description || null,
      next_assessment_subject: firestoreMeta?.next_assessment_subject || null,
      next_assessment_date: firestoreMeta?.next_assessment_date || null,
    };

    let studentId;
    const existingStudent = await supabase
      .from("black_students")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();
    if (existingStudent.error) {
      console.warn(`Lookup failed for ${parentEmail}: ${existingStudent.error.message}`);
      SUMMARY.skipped += 1;
      continue;
    }
    if (existingStudent.data?.id) {
      const updateRes = await supabase
        .from("black_students")
        .update(studentPayload)
        .eq("id", existingStudent.data.id)
        .select("id")
        .single();
      if (updateRes.error) {
        console.warn(`Update failed for ${parentEmail}: ${updateRes.error.message}`);
        SUMMARY.skipped += 1;
        continue;
      }
      studentId = updateRes.data.id;
    } else {
      const insertRes = await supabase.from("black_students").insert(studentPayload).select("id").single();
      if (insertRes.error) {
        console.warn(`Insert failed for ${parentEmail}: ${insertRes.error.message}`);
        SUMMARY.skipped += 1;
        continue;
      }
      studentId = insertRes.data.id;
    }
    SUMMARY.studentsUpserted += 1;

    const brief = buildBrief({
      ...studentPayload,
      plan_label: planLabel,
      full_name: profilePayload.full_name,
    });
    const briefRes = await supabase
      .from("black_student_brief")
      .upsert({ student_id: studentId, brief_md: brief });
    if (!briefRes.error) SUMMARY.briefsUpserted += 1;
  }

  console.log(
    `Done. Profiles created: ${SUMMARY.profilesCreated}, students upserted: ${SUMMARY.studentsUpserted}, briefs: ${SUMMARY.briefsUpserted}, skipped: ${SUMMARY.skipped}.`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});
