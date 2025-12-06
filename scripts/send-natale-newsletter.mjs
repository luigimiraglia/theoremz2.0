#!/usr/bin/env node
/**
 * Invia l'email di offerta Natale ai soli iscritti newsletter NON Black.
 * Esegue un filtro su Supabase: newsletter_subscriptions.is_active = true
 * ed esclude profili con subscription_tier = 'black'.
 *
 * Di default è DRY RUN: non invia, stampa i destinatari. Per inviare davvero:
 * DRY_RUN=false node scripts/send-natale-newsletter.mjs
 *
 * Richiede env in .env.local:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - RESEND_API_KEY
 *  - NEWSLETTER_FROM (es. "Flavio - Theoremz <ciao@theoremz.com>")
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import nodemailer from "nodemailer";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY,
  NEWSLETTER_FROM = "Flavio – Theoremz <ciao@theoremz.com>",
  TEST_EMAIL,
  SEND_PROVIDER = "smtp", // "smtp" | "resend"
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "465",
  SMTP_USER,
  SMTP_PASS,
  SKIP_BATCHES = "0",
} = process.env;

const DRY_RUN = process.env.DRY_RUN !== "false";
const LIST_ONLY = process.env.LIST_ONLY === "true" || process.argv.includes("--list-only");
const SKIP = Math.max(0, Number(SKIP_BATCHES) || 0);
const SUBJECT = "✨ Se inizi ora, gennaio non sarà un problema";

const TEXT_BODY = `Ciao,

ti scrivo perche in questi giorni abbiamo attivato una condizione speciale per chi vuole iniziare Theoremz prima di gennaio. Molti studenti ci hanno detto che vogliono migliorare matematica e fisica, ma non vogliono aspettare meta anno o trovarsi a recuperare in fretta prima della maturita. Per questo, fino ai prossimi giorni, Theoremz Black e disponibile a 13€/mese (invece di 26€), con 7 giorni di prova gratuita.

In pratica:
puoi provarlo senza rischiare nulla.

Con Theoremz Black hai accesso a:
- Un mentore didattico personale che crea un percorso su misura per te.
- Supporto illimitato via chat per ogni dubbio, esercizio o ripasso.
- Catalogo completo di esercizi + soluzioni spiegate passo-passo.
- Videolezioni, appunti e formulari (medie e superiori).
- Flashcard, simulazioni verifiche e materiali extra per compiti, interrogazioni e recuperi.
L'obiettivo e semplice: non studiare a caso, ma imparare con metodo, costanza e sicurezza.

Perche ora?
La promo attuale e legata al periodo natalizio: serve per permettere a chi era indeciso di iniziare adesso, non tra settimane. Quando termina, il piano tornera al prezzo normale.

Se vuoi vedere come funziona, attivare la prova gratuita o leggere i dettagli completi, puoi farlo qui:
👉 https://theoremz.com/black

Se preferisci prima fare una domanda o ricevere un esempio reale del percorso, rispondi semplicemente a questa mail con:
INFO

A presto,
Flavio – Theoremz

PS: se gia ti senti tranquillo con il tuo metodo attuale, non serve cambiare nulla. Ma se senti che con un supporto strutturato potresti rendere tutto piu semplice, forse questo e il momento giusto per iniziare.`;

const HTML_BODY = `<!doctype html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a;">
  <p>Ciao,</p>
  <p>ti scrivo perche in questi giorni abbiamo attivato una condizione speciale per chi vuole iniziare Theoremz prima di gennaio. </p> <p>Molti studenti ci hanno detto che vogliono migliorare matematica e fisica, ma non vogliono aspettare meta anno o trovarsi a recuperare in fretta prima della maturita. </p> <p> Per questo, fino ai prossimi giorni, <strong>Theoremz Black e disponibile a 13€/mese (invece di 26€), con 7 giorni di prova gratuita</strong>.</p>
  <p>In pratica: <strong>puoi provarlo senza rischiare nulla.</strong></p>
  <p><strong>Con Theoremz Black hai accesso a:</strong></p>
  <ul>
    <li><strong>Un mentore didattico personale</strong> che crea un percorso su misura per te.</li>
    <li><strong>Supporto illimitato via chat</strong> per ogni dubbio, esercizio o ripasso.</li>
    <li><strong>Catalogo completo di esercizi + soluzioni spiegate</strong> passo-passo.</li>
    <li><strong>Videolezioni, appunti e formulari</strong> (medie e superiori).</li>
    <li><strong>Flashcard, simulazioni verifiche e materiali extra</strong> per compiti, interrogazioni e recuperi.</li>
  </ul>
  <p>L'obiettivo e semplice: non studiare a caso, ma imparare con metodo, costanza e sicurezza.</p>
  <p><strong>Perche ora?</strong><br />
  La promo attuale e legata al periodo natalizio: serve per permettere a chi era indeciso di iniziare adesso, non tra settimane. Quando termina, il piano tornera al prezzo normale.</p>
  <p><strong>Se vuoi vedere come funziona, attivare la prova gratuita o leggere i dettagli completi, puoi farlo qui:</strong><br />
  👉 <a href="https://theoremz.com/black">https://theoremz.com/black</a></p>
  <p>Se preferisci prima fare una domanda o ricevere un esempio reale del percorso, rispondi semplicemente a questa mail con:<br />
  <strong>INFO</strong></p>
  <p>A presto,<br />Flavio – Theoremz</p>
  <p style="font-size: 13px; color: #475569;">PS: se gia ti senti tranquillo con il tuo metodo attuale, non serve cambiare nulla. Ma se senti che con un supporto strutturato potresti rendere tutto piu semplice, forse questo e il momento giusto per iniziare.</p>
</body>
</html>`;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase envs");
  process.exit(1);
}

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
let smtpTransport = null;

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  const user = SMTP_USER || process.env.GMAIL_USER;
  const pass = SMTP_PASS || process.env.GMAIL_APP_PASS;
  if (!user || !pass) {
    throw new Error(
      "SMTP/Gmail credentials mancanti (SMTP_USER/GMAIL_USER e SMTP_PASS/GMAIL_APP_PASS)"
    );
  }
  smtpTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: true,
    auth: { user, pass },
  });
  return smtpTransport;
}

async function sendEmail(to) {
  if (SEND_PROVIDER === "smtp") {
    const mailer = getSmtpTransport();
    await mailer.sendMail({
      from: NEWSLETTER_FROM,
      to,
      subject: SUBJECT,
      text: TEXT_BODY,
      html: HTML_BODY,
    });
    return;
  }
  if (!resend) throw new Error("RESEND_API_KEY mancante, impossibile inviare.");
  await resend.emails.send({
    from: NEWSLETTER_FROM,
    to,
    subject: SUBJECT,
    text: TEXT_BODY,
    html: HTML_BODY,
  });
}

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

async function fetchRecipients() {
  const { data, error } = await supabase
    .from("newsletter_subscriptions")
    .select("email, user_id")
    .eq("is_active", true);
  if (error) throw error;

  const rows = data || [];
  const { data: blackProfiles, error: blackErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("subscription_tier", "black");
  if (blackErr) throw blackErr;
  const blackIds = new Set((blackProfiles || []).map((p) => p.id));

  const dedup = new Map();
  for (const row of rows) {
    const email = (row.email || "").toLowerCase().trim();
    if (!email) continue;
    if (row.user_id && blackIds.has(row.user_id)) continue;
    dedup.set(email, true);
  }
  return Array.from(dedup.keys());
}

async function sendAll() {
  if (TEST_EMAIL) {
    if (DRY_RUN) {
      console.log(`DRY RUN: invierei 1 test a ${TEST_EMAIL}`);
      return;
    }
    console.log(`Invio test singolo a ${TEST_EMAIL}...`);
    await sendEmail(TEST_EMAIL);
    console.log("Completato invio test.");
    return;
  }

  const recipients = await fetchRecipients();
  console.log(
    `Trovati ${recipients.length} destinatari (newsletter attivi non Black).`
  );

  if (LIST_ONLY) {
    console.log("Modalita lista sola: elenco destinatari (uno per riga):");
    recipients.forEach((email) => console.log(email));
    console.log(`Totale: ${recipients.length}`);
    return;
  }

  if (DRY_RUN) {
    console.log("DRY RUN attivo: nessuna email inviata.");
    console.log("Esempio destinatari:", recipients.slice(0, 20));
    return;
  }

  if (!resend) {
    throw new Error("RESEND_API_KEY mancante, impossibile inviare.");
  }

  const batches = chunk(recipients, 50); // evita rate limit eccessivi
  for (const [i, batch] of batches.entries()) {
    if (i < SKIP) {
      console.log(`Skip batch ${i + 1}/${batches.length} (${batch.length} email) per SKIP_BATCHES=${SKIP}.`);
      continue;
    }
    console.log(
      `Invio batch ${i + 1}/${batches.length} (${batch.length} email)...`
    );
    if (SEND_PROVIDER === "smtp") {
      // invio sequenziale per non sforzare Gmail/SMTP
      for (const to of batch) {
        await sendEmail(to);
      }
    } else {
      await Promise.all(batch.map((to) => sendEmail(to)));
    }
  }
  console.log("Completato invio.");
}

sendAll().catch((err) => {
  console.error("Errore invio newsletter:", err);
  process.exit(1);
});
