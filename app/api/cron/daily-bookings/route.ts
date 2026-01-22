import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseServer } from "@/lib/supabase";
import { getRomeDayRange, ROME_TZ } from "@/lib/rome-time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS || "";
const DAILY_BOOKINGS_TO =
  process.env.DAILY_BOOKINGS_TO || process.env.CONTACT_TO || process.env.GMAIL_USER || "";
const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;

type BookingRow = {
  id: string;
  full_name: string;
  email: string;
  note?: string | null;
  status?: string | null;
  slot: {
    starts_at: string;
    duration_min: number | null;
    call_type: { slug: string; name: string } | null;
    tutor: { display_name?: string | null; full_name?: string | null; email?: string | null } | null;
  } | null;
};

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!GMAIL_USER || !GMAIL_APP_PASS || !DAILY_BOOKINGS_TO) {
    return NextResponse.json({ error: "missing email config" }, { status: 500 });
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const force = url.searchParams.get("force") === "1";

  if (!force && !isRomeMidnight(new Date())) {
    return NextResponse.json({ ok: true, skipped: "not_midnight_rome" });
  }

  const { ymd, start, end } = getRomeDayRange(dateParam);
  const db = supabaseServer();
  if (!db) {
    return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  }

  const { data, error } = await db
    .from("call_bookings")
    .select(
      `
        id,
        full_name,
        email,
        note,
        status,
        slot:call_slots!inner (
          starts_at,
          duration_min,
          call_type:call_types ( slug, name ),
          tutor:tutors ( display_name, full_name, email )
        )
      `,
    )
    .gte("call_slots.starts_at", start.toISOString())
    .lt("call_slots.starts_at", end.toISOString())
    .order("call_slots.starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookings = (data || [])
    .filter((row: BookingRow) => row && row.slot)
    .filter((row: BookingRow) => String(row.status || "").toLowerCase() !== "cancelled");

  const titleDate = formatRomeDateLabel(ymd);
  const subject = `Prenotazioni ${titleDate} (${bookings.length})`;

  const text = buildTextDigest(bookings, titleDate);
  const html = buildHtmlDigest(bookings, titleDate);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
  });

  await transporter.sendMail({
    from: `"Theoremz" <${GMAIL_USER}>`,
    to: DAILY_BOOKINGS_TO,
    subject,
    text,
    html,
  });

  return NextResponse.json({ ok: true, ymd, count: bookings.length });
}

function isAuthorized(req: Request) {
  if (process.env.NODE_ENV !== "production" && !CRON_SECRET) return true;
  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const url = new URL(req.url);
  const provided =
    bearer ||
    req.headers.get("x-cron-secret") ||
    url.searchParams.get("secret") ||
    null;
  if (CRON_SECRET) return provided === CRON_SECRET;
  return req.headers.has("x-vercel-cron");
}

function isRomeMidnight(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROME_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  return hour === 0;
}

function formatRomeDateLabel(ymd: string) {
  const d = new Date(`${ymd}T12:00:00Z`);
  const label = d.toLocaleDateString("it-IT", {
    timeZone: ROME_TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    timeZone: ROME_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickTutorLabel(row: BookingRow) {
  const tutor = row.slot?.tutor;
  return tutor?.display_name || tutor?.full_name || tutor?.email || "—";
}

function pickCallLabel(row: BookingRow) {
  return row.slot?.call_type?.name || row.slot?.call_type?.slug || "call";
}

function buildTextDigest(bookings: BookingRow[], titleDate: string) {
  if (!bookings.length) {
    return `Prenotazioni ${titleDate}\n\nNessuna prenotazione per oggi.`;
  }
  const lines = bookings.map((row) => {
    const time = formatTime(row.slot!.starts_at);
    const callLabel = pickCallLabel(row);
    const tutorLabel = pickTutorLabel(row);
    const note = row.note ? ` | Note: ${row.note}` : "";
    return `- ${time} | ${callLabel} | ${row.full_name || "Senza nome"} | ${row.email || "—"} | Tutor: ${tutorLabel}${note}`;
  });
  return [`Prenotazioni ${titleDate}`, "", ...lines].join("\n");
}

function buildHtmlDigest(bookings: BookingRow[], titleDate: string) {
  const rows = bookings
    .map((row) => {
      const time = formatTime(row.slot!.starts_at);
      const callLabel = pickCallLabel(row);
      const tutorLabel = pickTutorLabel(row);
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(time)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
            callLabel,
          )}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
            row.full_name || "Senza nome",
          )}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
            row.email || "—",
          )}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
            tutorLabel,
          )}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
            row.note || "—",
          )}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px;font-size:18px">Prenotazioni ${escapeHtml(titleDate)}</h2>
      ${
        bookings.length
          ? `<table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr>
                  <th align="left" style="padding:8px 10px;border-bottom:2px solid #e2e8f0">Ora</th>
                  <th align="left" style="padding:8px 10px;border-bottom:2px solid #e2e8f0">Tipo</th>
                  <th align="left" style="padding:8px 10px;border-bottom:2px solid #e2e8f0">Nome</th>
                  <th align="left" style="padding:8px 10px;border-bottom:2px solid #e2e8f0">Email</th>
                  <th align="left" style="padding:8px 10px;border-bottom:2px solid #e2e8f0">Tutor</th>
                  <th align="left" style="padding:8px 10px;border-bottom:2px solid #e2e8f0">Note</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>`
          : "<p style=\"margin:0\">Nessuna prenotazione per oggi.</p>"
      }
    </div>
  `.trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
