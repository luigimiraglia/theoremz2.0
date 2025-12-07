#!/usr/bin/env node
/**
 * Invia le 7 newsletter HTML generate alla mail indicata (Gmail/SMTP).
 *
 * Usa:
 *   NODE_ENV=production node scripts/send-newsletters-to-single.mjs --to you@example.com
 *
 * Env richieste (.env.local):
 *  - GMAIL_USER
 *  - GMAIL_APP_PASS
 * Opzionale:
 *  - NEWSLETTER_FROM (es. "Luigi – Theoremz <ciao@theoremz.com>")
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";

const argv = process.argv.slice(2);
const toArg = (() => {
  const idx = argv.indexOf("--to");
  if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
  return process.env.TO_EMAIL || null;
})();

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const NEWSLETTER_FROM =
  process.env.NEWSLETTER_FROM || (GMAIL_USER ? `Luigi - Theoremz <${GMAIL_USER}>` : null);

if (!toArg) {
  console.error("Errore: specifica --to email@dominio.it oppure TO_EMAIL env.");
  process.exit(1);
}

if (!GMAIL_USER || !GMAIL_APP_PASS) {
  console.error("Errore: mancano GMAIL_USER / GMAIL_APP_PASS in .env.local");
  process.exit(1);
}

const BASE = path.join(process.cwd(), "emails", "newsletters");
const TEMPLATES = [
  {
    subject:
      "📏 La differenza tra studiare 3 ore e studiare 1 ora (spoiler: non è quello che pensi)",
    file: "newsletter-1.html",
  },
  {
    subject: "📝 Ho scoperto che facevo sempre gli stessi 5 errori (e tu probabilmente anche)",
    file: "newsletter-2.html",
  },
  {
    subject: "😌 Il trucco mentale che mi ha fatto smettere di sudare prima dei compiti",
    file: "newsletter-3.html",
  },
  {
    subject: "📒 Ho buttato 2 anni a prendere appunti inutili (e probabilmente anche tu)",
    file: "newsletter-4.html",
  },
  {
    subject: "🤝 Perché gli studenti da 9 studiano sempre con qualcuno (e tu dovresti farlo)",
    file: "newsletter-5.html",
  },
  {
    subject: "⏸️ Il giorno che ho smesso di studiare 5 ore al giorno e i miei voti sono migliorati",
    file: "newsletter-6.html",
  },
  {
    subject: "🍎 Come sono passato dal 6 all'8 solo migliorando il rapporto con il prof",
    file: "newsletter-7.html",
  },
];

async function loadHtml(file) {
  const full = path.join(BASE, file);
  return fs.readFile(full, "utf8");
}

async function main() {
  console.log(`Invio 7 newsletter a ${toArg} via Gmail...`);
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
  });

  for (const tpl of TEMPLATES) {
    const html = await loadHtml(tpl.file);
    await transporter.sendMail({
      from: NEWSLETTER_FROM,
      to: toArg,
      subject: tpl.subject,
      html,
    });
    console.log(`Inviata: ${tpl.subject}`);
  }
  console.log("Completato.");
}

main().catch((err) => {
  console.error("Errore invio:", err);
  process.exit(1);
});
