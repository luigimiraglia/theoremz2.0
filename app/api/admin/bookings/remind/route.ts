import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const ROME_TZ = "Europe/Rome";

type BookingRow = {
  id: string;
  full_name: string;
  email: string;
  note?: string | null;
  tutor_id?: string | null;
  slot: {
    starts_at: string;
    duration_min: number | null;
    call_type: { slug: string; name: string; duration_min: number } | null;
    tutor: { display_name?: string | null } | null;
  } | null;
};

type Viewer = { isAdmin: boolean; tutorId: string | null; email: string | null };

const isAdminEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function getAdminAuth() {
  try {
    const mod = await import("@/lib/firebaseAdmin");
    return mod.adminAuth;
  } catch (err) {
    console.error("[admin/bookings/remind] firebase admin unavailable", err);
    return null;
  }
}

async function resolveViewer(
  request: NextRequest,
  db: ReturnType<typeof supabaseServer>,
): Promise<{ error?: NextResponse; viewer?: Viewer }> {
  if (process.env.NODE_ENV === "development") {
    return { viewer: { isAdmin: true, tutorId: null, email: null } };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const token = authHeader.slice("Bearer ".length);
  const adminAuth = await getAdminAuth();
  if (!adminAuth) {
    return { error: NextResponse.json({ error: "admin_auth_unavailable" }, { status: 503 }) };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase() || null;
    if (!email) {
      return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
    }

    if (isAdminEmail(email)) {
      return { viewer: { isAdmin: true, tutorId: null, email } };
    }

    const { data: tutor, error: tutorErr } = await db
      .from("tutors")
      .select("id")
      .ilike("email", email || "")
      .maybeSingle();
    if (tutorErr) {
      console.error("[admin/bookings/remind] tutor lookup error", tutorErr);
      return { error: NextResponse.json({ error: "auth_error" }, { status: 500 }) };
    }
    if (!tutor) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    return { viewer: { isAdmin: false, tutorId: tutor.id, email } };
  } catch (error) {
    console.error("[admin/bookings/remind] auth error", error);
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
}

function buildTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;
  if (!user || !pass) {
    throw new Error("Config email mancante (GMAIL_USER/GMAIL_APP_PASS).");
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

function formatRome(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("it-IT", {
    timeZone: ROME_TZ,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function diffHuman(iso: string) {
  const now = Date.now();
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "tra poco";
  const diffMs = ts - now;
  if (diffMs <= 0) return "ora";
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `tra ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `tra ${hours}h`;
  return `tra ${hours}h ${mins}m`;
}

function dayPhrase(iso: string) {
  const now = new Date();
  const start = new Date(iso);
  const nowDate = new Date(now.toLocaleString("en-US", { timeZone: ROME_TZ }));
  const startDate = new Date(start.toLocaleString("en-US", { timeZone: ROME_TZ }));
  const diffDays = Math.floor(
    (startDate.setHours(0, 0, 0, 0) - nowDate.setHours(0, 0, 0, 0)) / 86400000,
  );
  const hourLabel = start
    .toLocaleTimeString("it-IT", { timeZone: ROME_TZ, hour: "2-digit", minute: "2-digit" })
    .replace(":00", "");
  if (diffDays === 0) return `oggi alle ${hourLabel}`;
  if (diffDays === 1) return `domani alle ${hourLabel}`;
  const weekday = start.toLocaleDateString("it-IT", {
    timeZone: ROME_TZ,
    weekday: "long",
  });
  return `${weekday} alle ${hourLabel}`;
}

function toIcsDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function buildIcs(opts: { start: Date; durationMin: number; summary: string; description: string }) {
  const { start, durationMin, summary, description } = opts;
  const end = new Date(start.getTime() + durationMin * 60000);
  const uid = `theoremz-${start.getTime()}-${Math.random().toString(16).slice(2)}@theoremz.com`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Theoremz//Booking Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\r?\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

async function fetchBooking(db: ReturnType<typeof supabaseServer>, id: string) {
  const { data, error } = await db
    .from("call_bookings")
    .select(
      `
        id,
        full_name,
        email,
        note,
        tutor_id,
        slot:call_slots (
          starts_at,
          duration_min,
          call_type:call_types ( slug, name, duration_min ),
          tutor:tutors ( display_name )
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as BookingRow | null;
}

export async function POST(request: NextRequest) {
  try {
    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }

    const { error: authError, viewer } = await resolveViewer(request, db);
    if (authError) return authError;

    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

    const booking = await fetchBooking(db, id);
    if (!booking || !booking.slot) {
      return NextResponse.json({ error: "Booking non trovato" }, { status: 404 });
    }
    if (!viewer?.isAdmin && viewer?.tutorId && booking.tutor_id !== viewer.tutorId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!booking.email) {
      return NextResponse.json({ error: "Email mancante" }, { status: 400 });
    }

    const startsAt = booking.slot.starts_at;
    const whenLabel = formatRome(startsAt);
    const deltaLabel = diffHuman(startsAt);
    const callLabel = booking.slot.call_type?.name || "call Theoremz";
    const dayLabel = dayPhrase(startsAt);
    const duration = booking.slot.duration_min || booking.slot.call_type?.duration_min || 30;

    const transporter = buildTransport();
    const subject = `Promemoria: ${callLabel} ${dayLabel}`;
    const text = [
      `Ciao ${booking.full_name || ""}`.trim(),
      `Ti ricordo la tua ${callLabel} ${dayLabel} (${deltaLabel}).`,
      `Quando: ${whenLabel}.`,
      "Qualche minuto prima riceverai il link per collegarti.",
      booking.note ? `Note che ci hai lasciato: ${booking.note}` : null,
      "Se non puoi più partecipare, rispondi a questa mail per riprogrammare.",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p style="margin:0 0 12px">Ciao ${escapeHtml(booking.full_name || "")},</p>
        <p style="margin:0 0 12px">ti ricordo la tua ${escapeHtml(callLabel)} ${escapeHtml(
          dayLabel,
        )} <span style="color:#0ea5e9;">(${escapeHtml(deltaLabel)})</span>.</p>
        <p style="margin:0 0 12px">Quando: ${escapeHtml(whenLabel)}</p>
        <p style="margin:0 0 12px">Qualche minuto prima riceverai il link per collegarti.</p>
        ${booking.note ? `<p style="margin:0 0 12px">Note: ${escapeHtml(booking.note)}</p>` : ""}
        <p style="margin:0 0 12px">Se non puoi partecipare rispondi a questa mail e riprogrammiamo.</p>
        <p style="margin:12px 0 0">A presto,<br/>Team Theoremz</p>
      </div>
    `.trim();

    const ics = buildIcs({
      start: new Date(startsAt),
      durationMin: duration,
      summary: `${callLabel} Theoremz`,
      description: "Promemoria automatico Theoremz. Riceverai il link poco prima della call.",
    });

    await transporter.sendMail({
      from: `"Theoremz" <${process.env.GMAIL_USER}>`,
      to: booking.email,
      subject,
      text,
      html,
      attachments: [
        {
          filename: "call-theoremz.ics",
          content: ics,
          contentType: "text/calendar; charset=utf-8",
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/bookings/remind]", err);
    return NextResponse.json({ error: err?.message || "Errore reminder" }, { status: 500 });
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
