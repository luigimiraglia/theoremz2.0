import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS || "";
const TO =
  process.env.BLACK_ONBOARDING_TO || process.env.CONTACT_TO || process.env.GMAIL_USER || "";

export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}

async function handle() {
  if (!GMAIL_USER || !GMAIL_APP_PASS || !TO) {
    return NextResponse.json({ error: "missing email config" }, { status: 500 });
  }

  const db = supabaseServer();
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 3600 * 1000).toISOString();

  const { data: students, error } = await db
    .from("black_students")
    .select(
      "id, student_name, student_email, parent_email, student_phone, parent_phone, start_date, last_contacted_at, profiles:profiles!black_students_user_id_fkey(full_name)",
    )
    .order("last_contacted_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const staleContacts = (students || []).filter((s: any) => {
    if (!s.last_contacted_at) return false;
    return s.last_contacted_at < threeDaysAgo;
  });

  const recentNoContact = (students || []).filter((s: any) => {
    if (!s.start_date) return false;
    if (s.start_date < threeWeeksAgo) return false;
    return !s.last_contacted_at;
  });

  const formatContact = (s: any) => {
    const name = s.student_name || s?.profiles?.full_name || "—";
    const email = s.student_email || s.parent_email || "—";
    const phone = s.student_phone || s.parent_phone || "—";
    const last =
      s.last_contacted_at &&
      new Date(s.last_contacted_at).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
    return { name, email, phone, last };
  };

  const formatList = (items: any[]) =>
    items
      .map((s) => {
        const { name, email, phone, last } = formatContact(s);
        return `• ${name} — ${email} — ${phone}${last ? ` (ultimo contatto ${last})` : ""}`;
      })
      .join("\n");

  const staleText = staleContacts.length ? formatList(staleContacts) : "Nessuno.";
  const freshText = recentNoContact.length ? formatList(recentNoContact) : "Nessuno.";

  const htmlList = (items: any[], includeLast: boolean) =>
    items
      .map((s) => {
        const { name, email, phone, last } = formatContact(s);
        return `<li><strong>${escapeHtml(name)}</strong> — ${escapeHtml(email)} — ${escapeHtml(phone)}${
          includeLast && last ? ` <em>(ultimo contatto ${last})</em>` : ""
        }</li>`;
      })
      .join("");

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px;font-size:18px">Recap contatti Black</h2>
      <p style="margin:0 0 6px">Data generazione: ${now.toLocaleString("it-IT")}</p>
      <h3 style="margin:16px 0 6px;font-size:16px">Ultimo contatto > 3 giorni</h3>
      <ul style="padding-left:16px;margin:0 0 12px">
        ${staleContacts.length ? htmlList(staleContacts, true) : "<li>Nessuno</li>"}
      </ul>
      <h3 style="margin:16px 0 6px;font-size:16px">Iscritti < 3 settimane senza contatto</h3>
      <ul style="padding-left:16px;margin:0">
        ${recentNoContact.length ? htmlList(recentNoContact, false) : "<li>Nessuno</li>"}
      </ul>
    </div>
  `.trim();

  const text = `
Recap contatti Black (${now.toLocaleString("it-IT")})

Ultimo contatto > 3 giorni:
${staleText}

Iscritti < 3 settimane senza contatto:
${freshText}
  `.trim();

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
  });

  await transporter.sendMail({
    from: `"Theoremz Black" <${GMAIL_USER}>`,
    to: TO,
    subject: "Black — contatti da riprendere",
    text,
    html,
  });

  return NextResponse.json({
    ok: true,
    counts: { staleContacts: staleContacts.length, recentNoContact: recentNoContact.length },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
