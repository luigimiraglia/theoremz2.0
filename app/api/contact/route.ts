// app/api/contact/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
export const runtime = "nodejs"; // nodemailer richiede Node, non Edge
export const dynamic = "force-dynamic"; // evita qualunque caching del route

const fromUser = process.env.GMAIL_USER!;
const appPass = process.env.GMAIL_APP_PASS!;
const toEmail = process.env.CONTACT_TO || fromUser;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: { user: fromUser, pass: appPass },
});

export async function POST(req: Request) {
  try {
    const { name, email, topic, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const subject = `[Theoremz • Contatto] ${topic || "Messaggio"}`;
    const text = `
Da: ${name} <${email}>
Oggetto: ${topic || "—"}

${message}
`.trim();

    const html = `
  <div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
    <p><strong>Da:</strong> ${name} &lt;${email}&gt;</p>
    <p><strong>Oggetto:</strong> ${topic || "—"}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0" />
    <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
  </div>
`.trim();

    await transporter.sendMail({
      from: `"Theoremz Contatti" <${fromUser}>`, // deve essere il tuo Gmail
      to: toEmail,
      subject,
      text,
      html,
      replyTo: email, // così rispondi direttamente allo studente
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Errore invio" },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
