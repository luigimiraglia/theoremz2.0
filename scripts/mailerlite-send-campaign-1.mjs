#!/usr/bin/env node
/**
 * Crea e invia la newsletter #1 via MailerLite al gruppo indicato.
 *
 * Default: DRY RUN (non invia). Per inviare davvero:
 *   DRY_RUN=false MAILERLITE_API_TOKEN=... node scripts/mailerlite-send-campaign-1.mjs
 *
 * Env richieste (.env.local):
 *  - MAILERLITE_API_TOKEN
 *  - MAILERLITE_GROUP_ID (default: 173084440251073865)
 *  - MAILERLITE_FROM_EMAIL (default: luigi@theoremz.com)
 *  - MAILERLITE_FROM_NAME  (default: Luigi - Theoremz)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const {
  MAILERLITE_API_TOKEN,
  MAILERLITE_GROUP_ID = "173084440251073865",
  MAILERLITE_FROM_EMAIL = "luigi@theoremz.com",
  MAILERLITE_FROM_NAME = "Luigi - Theoremz",
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

const DRY_RUN = process.env.DRY_RUN !== "false";
const MAX_RECIPIENTS = 500;
const supabase =
  NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

if (!MAILERLITE_API_TOKEN) {
  console.error("Errore: manca MAILERLITE_API_TOKEN");
  process.exit(1);
}
if (!MAILERLITE_GROUP_ID) {
  console.error("Errore: manca MAILERLITE_GROUP_ID");
  process.exit(1);
}
if (!supabase) {
  console.error("Errore: Supabase env mancanti (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const SUBJECT = "📏 La differenza tra studiare 3 ore e studiare 1 ora (spoiler: non è quello che pensi)";
const TEMPLATE_PATH = path.join(process.cwd(), "emails", "newsletters", "newsletter-1.html");

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

function htmlToText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|br|h[1-6]|li)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();
}

async function fetchRecipients() {
  const { data, error } = await supabase
    .from("newsletter_subscriptions")
    .select("email, user_id, subscribed_at")
    .eq("is_active", true)
    .order("subscribed_at", { ascending: false })
    .limit(MAX_RECIPIENTS);
  if (error) throw error;

  const rows = data || [];
  const userIds = rows.map((r) => r.user_id).filter(Boolean);
  const blackIds = new Set();
  for (const part of chunk(userIds, 100)) {
    const { data: blacks, error: blackErr } = await supabase
      .from("profiles")
      .select("id")
      .in("id", part)
      .eq("subscription_tier", "black");
    if (blackErr) throw blackErr;
    for (const b of blacks || []) {
      if (b?.id) blackIds.add(b.id);
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

async function createCampaign() {
  const recipients = await fetchRecipients();
  const res = await fetch("https://connect.mailerlite.com/api/campaigns", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAILERLITE_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      type: "regular",
      name: "Newsletter #1 - Metodo - Theoremz",
      subject: SUBJECT,
      groups: [MAILERLITE_GROUP_ID],
      emails: recipients,
      from: { email: MAILERLITE_FROM_EMAIL, name: MAILERLITE_FROM_NAME },
      reply_to: { email: MAILERLITE_FROM_EMAIL, name: MAILERLITE_FROM_NAME },
      track_opens: true,
      track_clicks: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MailerLite create campaign error ${res.status}: ${text}`);
  }
  const json = await res.json().catch(() => ({}));
  const id = json?.data?.id || json?.id;
  if (!id) throw new Error("ID campagna non trovato");
  return id;
}

async function setContent(campaignId, html, text) {
  const res = await fetch(
    `https://connect.mailerlite.com/api/campaigns/${campaignId}/content`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MAILERLITE_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ html, plain_text: text }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`MailerLite set content error ${res.status}: ${t}`);
  }
}

async function scheduleNow(campaignId) {
  const res = await fetch(
    `https://connect.mailerlite.com/api/campaigns/${campaignId}/schedule`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MAILERLITE_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ delivery: { type: "immediate" } }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`MailerLite schedule error ${res.status}: ${t}`);
  }
}

async function main() {
  console.log(`Preparazione invio newsletter #1 al gruppo ${MAILERLITE_GROUP_ID}`);
  const html = await fs.readFile(TEMPLATE_PATH, "utf8");
  const text = htmlToText(html);

  if (DRY_RUN) {
    console.log("DRY RUN attivo: non creo né invio la campagna.");
    console.log("Subject:", SUBJECT);
    console.log("From:", `${MAILERLITE_FROM_NAME} <${MAILERLITE_FROM_EMAIL}>`);
    console.log("Group:", MAILERLITE_GROUP_ID);
    console.log("Anteprima testo:", text.slice(0, 200), "...");
    return;
  }

  console.log("Creo campagna su MailerLite...");
  const campaignId = await createCampaign();
  console.log("Campagna creata, id:", campaignId);

  console.log("Imposto contenuto HTML + testo...");
  await setContent(campaignId, html, text);

  console.log("Schedulo invio immediato...");
  await scheduleNow(campaignId);

  console.log("Fatto. Campagna inviata/schedulata.");
}

main().catch((err) => {
  console.error("Errore esecuzione:", err);
  process.exit(1);
});
