#!/usr/bin/env node
/**
 * Importa su MailerLite gli ultimi 500 iscritti newsletter attivi (non Black).
 * Default: DRY RUN (non invia). Per inviare:
 *   DRY_RUN=false MAILERLITE_API_TOKEN=... node scripts/mailerlite-import-natale.mjs
 *
 * Env richiesti (.env.local):
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - MAILERLITE_API_TOKEN (Bearer)
 * Opzionali:
 *  - CONCURRENCY (default 10)
 *  - LIMIT (default 500)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MAILERLITE_API_TOKEN,
  CONCURRENCY = "1",
  LIMIT = "500",
  MAILERLITE_GROUP_ID,
  MAILERLITE_GROUP_NAME = "Natale Black 2025",
} = process.env;

const DRY_RUN = process.env.DRY_RUN !== "false";
const MAX = Math.max(1, Number(LIMIT) || 500);
const CONC = Math.max(1, Number(CONCURRENCY) || 10);

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase envs");
  process.exit(1);
}
if (!MAILERLITE_API_TOKEN) {
  console.error("Missing MAILERLITE_API_TOKEN");
  process.exit(1);
}

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function fetchRecipients() {
  const { data, error } = await supabase
    .from("newsletter_subscriptions")
    .select("email, user_id, subscribed_at")
    .eq("is_active", true)
    .order("subscribed_at", { ascending: false })
    .limit(MAX);
  if (error) throw error;

  const rows = data || [];
  const userIds = rows.map((r) => r.user_id).filter(Boolean);
  const blackIds = new Set();

  for (const part of chunk(userIds, 100)) {
    const { data: blackProfiles, error: blackErr } = await supabase
      .from("profiles")
      .select("id")
      .in("id", part)
      .eq("subscription_tier", "black");
    if (blackErr) throw blackErr;
    for (const p of blackProfiles || []) {
      if (p?.id) blackIds.add(p.id);
    }
  }

  const dedup = new Map();
  for (const row of rows) {
    const email = (row.email || "").toLowerCase().trim();
    if (!email) continue;
    if (row.user_id && blackIds.has(row.user_id)) continue;
    dedup.set(email, true);
  }
  return Array.from(dedup.keys());
}

async function ensureGroupId() {
  if (MAILERLITE_GROUP_ID) return MAILERLITE_GROUP_ID;
  if (DRY_RUN) {
    console.log(`DRY RUN: creerei il gruppo "${MAILERLITE_GROUP_NAME}"`);
    return "dry-run-group-id";
  }
  const res = await fetch("https://connect.mailerlite.com/api/groups", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAILERLITE_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name: MAILERLITE_GROUP_NAME }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MailerLite group error ${res.status}: ${text}`);
  }
  const json = await res.json().catch(() => ({}));
  const id = json?.data?.id || json?.id || null;
  if (!id) throw new Error("Impossibile ottenere group_id da MailerLite");
  console.log(`Creato gruppo "${MAILERLITE_GROUP_NAME}" con id ${id}`);
  return id;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function createSubscriber(email, groupId) {
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MAILERLITE_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        groups: groupId && groupId !== "dry-run-group-id" ? [groupId] : [],
      }),
    });

    if (res.status === 409) return { ok: true, skipped: true };
    if (res.ok) return { ok: true, skipped: false };

    if (res.status === 429 && attempt < maxAttempts) {
      const waitMs = 1500 * attempt;
      await sleep(waitMs);
      continue;
    }

    const text = await res.text().catch(() => "");
    throw new Error(`MailerLite error ${res.status}: ${text}`);
  }
  throw new Error("MailerLite rate limit persistente");
}

async function sendAll() {
  const recipients = await fetchRecipients();
  console.log(`Trovati ${recipients.length} destinatari (newsletter attivi non Black).`);

  if (DRY_RUN) {
    console.log("DRY RUN attivo: nessun invio su MailerLite.");
    console.log("Esempio:", recipients.slice(0, 10));
    return;
  }

  const groupId = await ensureGroupId();

  console.log(`Invio a MailerLite con concurrency=${CONC}...`);
  let sent = 0;
  let skipped = 0;
  const queue = [...recipients];

  async function worker() {
    while (queue.length) {
      const email = queue.shift();
      try {
        const r = await createSubscriber(email, groupId);
        sent += r.ok ? 1 : 0;
        skipped += r.skipped ? 1 : 0;
      } catch (err) {
        console.error(`Errore su ${email}:`, err?.message || err);
      }
    }
  }

  await Promise.all(Array.from({ length: CONC }, () => worker()));
  console.log(`Completato. Creati/aggiornati: ${sent}, già presenti (409): ${skipped}`);
}

sendAll().catch((err) => {
  console.error("Errore esecuzione:", err);
  process.exit(1);
});
