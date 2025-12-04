import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SLOTS = ["17:00", "17:30", "18:00", "18:30"] as const;
const SATURDAY_WEEKDAY = 6; // Saturday

type BookingStore = Map<string, Set<string>>;

declare global {
  // eslint-disable-next-line no-var
  var __blackOnboardingBookings: BookingStore | undefined;
}

const bookingStore: BookingStore =
  globalThis.__blackOnboardingBookings ||
  ((globalThis.__blackOnboardingBookings = new Map<string, Set<string>>()),
  globalThis.__blackOnboardingBookings);

const fromUser = process.env.GMAIL_USER;
const appPass = process.env.GMAIL_APP_PASS;
const toEmail =
  process.env.BLACK_ONBOARDING_TO || process.env.CONTACT_TO || process.env.GMAIL_USER;

let transporter: nodemailer.Transporter | null = null;

function ensureTransporter() {
  if (transporter) return transporter;
  if (!fromUser || !appPass) {
    throw new Error("Config email mancante (GMAIL_USER/GMAIL_APP_PASS).");
  }
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: fromUser, pass: appPass },
  });
  return transporter;
}

function normalizeDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return date;
}

function isAllowedSlot(time: string): time is (typeof ALLOWED_SLOTS)[number] {
  return ALLOWED_SLOTS.includes(time as (typeof ALLOWED_SLOTS)[number]);
}

function formatIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getFirstBookableDate(): Date {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const diff = (SATURDAY_WEEKDAY - base.getDay() + 7) % 7;
  if (diff === 0) return base;
  const nextSat = new Date(base);
  nextSat.setDate(base.getDate() + diff);
  return nextSat;
}

const FIRST_BOOKABLE_STR = formatIsoDate(getFirstBookableDate());

function isAfterFirstBookable(date: string) {
  return date >= FIRST_BOOKABLE_STR;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = normalizeDate(searchParams.get("date") || "");
  if (!date) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }
  if (!isAfterFirstBookable(date)) {
    return NextResponse.json(
      { error: `Disponibile da ${FIRST_BOOKABLE_STR} in poi`, available: [], booked: [] },
      { status: 400 },
    );
  }
  const booked = bookingStore.get(date) || new Set<string>();
  const available = ALLOWED_SLOTS.filter((slot) => !booked.has(slot));
  return NextResponse.json({ date, available, booked: Array.from(booked) });
}

export async function POST(req: Request) {
  try {
    const { date, time, name, email, note, timezone, account } = await req.json();
    const normalizedDate = normalizeDate(String(date || "").trim());
    const timeSlot = String(time || "").trim();
    const fullName = String(name || "").trim();
    const replyEmail = String(email || "").trim();
    const extraNote = String(note || "").trim();
    const tz = String(timezone || "").trim() || "n.d.";
    const accountInfo = account && typeof account === "object" ? account : {};
    const accEmail = String(accountInfo.email || "").trim();
    const accUid = String(accountInfo.uid || "").trim();
    const accDisplay = String(accountInfo.displayName || "").trim();
    const accUsername = String(accountInfo.username || "").trim();

    if (!normalizedDate || !isAllowedSlot(timeSlot)) {
      return NextResponse.json({ error: "Data o orario non validi" }, { status: 400 });
    }
    if (!fullName || !replyEmail) {
      return NextResponse.json({ error: "Inserisci nome ed email" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(`${normalizedDate}T00:00:00`);
    if (chosen < today) {
      return NextResponse.json({ error: "Data nel passato" }, { status: 400 });
    }
    if (!isAfterFirstBookable(normalizedDate)) {
      return NextResponse.json(
        { error: `Disponibile da ${FIRST_BOOKABLE_STR} in poi` },
        { status: 400 },
      );
    }

    const dayBookings = bookingStore.get(normalizedDate) || new Set<string>();
    if (dayBookings.has(timeSlot)) {
      return NextResponse.json(
        { error: "Slot già prenotato", booked: Array.from(dayBookings) },
        { status: 409 },
      );
    }

    const html = `
      <div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2 style="margin:0 0 8px;font-size:18px">Nuova prenotazione onboarding Black</h2>
        <p style="margin:4px 0"><strong>Nome:</strong> ${escapeHtml(fullName)}</p>
        <p style="margin:4px 0"><strong>Email:</strong> ${escapeHtml(replyEmail)}</p>
        <p style="margin:4px 0"><strong>Data:</strong> ${normalizedDate}</p>
        <p style="margin:4px 0"><strong>Ora:</strong> ${timeSlot}</p>
        <p style="margin:4px 0"><strong>Timezone:</strong> ${escapeHtml(tz)}</p>
        ${extraNote ? `<p style="margin:8px 0"><strong>Nota:</strong><br>${escapeHtml(extraNote)}</p>` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0" />
        <p style="margin:4px 0"><strong>Account email:</strong> ${escapeHtml(accEmail || replyEmail)}</p>
        <p style="margin:4px 0"><strong>UID:</strong> ${escapeHtml(accUid || "—")}</p>
        <p style="margin:4px 0"><strong>Display name:</strong> ${escapeHtml(accDisplay || "—")}</p>
        <p style="margin:4px 0"><strong>Username:</strong> ${escapeHtml(accUsername || "—")}</p>
      </div>
    `.trim();

    const text = `
Nuova prenotazione onboarding Black
Nome: ${fullName}
Email: ${replyEmail}
Data: ${normalizedDate}
Ora: ${timeSlot}
Timezone: ${tz}
${extraNote ? `Nota: ${extraNote}` : ""}
Account email: ${accEmail || replyEmail}
UID: ${accUid || "—"}
Display name: ${accDisplay || "—"}
Username: ${accUsername || "—"}
`.trim();

    if (!toEmail) {
      throw new Error("Email destinatario mancante (BLACK_ONBOARDING_TO o GMAIL_USER).");
    }

    const mailer = ensureTransporter();
    await mailer.sendMail({
      from: `"Theoremz Black" <${fromUser}>`,
      to: toEmail,
      subject: `[Black] Onboarding ${normalizedDate} ${timeSlot}`,
      text,
      html,
      replyTo: replyEmail,
    });

    dayBookings.add(timeSlot);
    bookingStore.set(normalizedDate, dayBookings);

    return NextResponse.json({ ok: true, booked: Array.from(dayBookings) });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Errore prenotazione" },
      { status: 500 },
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
