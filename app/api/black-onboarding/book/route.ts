import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createGoogleCalendarEvent } from "@/lib/googleCalendar";
import { supabaseServer } from "@/lib/supabase";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";
import { requirePremium } from "@/lib/premium-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLOT_STEPS_MINUTES = [20, 30] as const;
const DEFAULT_WINDOW = { start: "15:00", end: "17:30" };
const SHORT_WINDOW = { start: "15:00", end: "16:00" };
const SHORT_DAYS = new Set([2, 5]); // Tue, Fri
const DEFAULT_CALL_TYPE_SLUG = "onboarding";
const DEFAULT_TUTOR_EMAIL = "luigi.miraglia006@gmail.com";
const ROME_TZ = "Europe/Rome";
const CHECK_MIN_DAYS = 1; // oggi -> domani
const CHECK_MAX_DAYS = 14; // entro due settimane
const GENERIC_MIN_DAYS = 1; // tutte le call: prenotabili da domani
const CONFIRMATION_CC = "theoremz.team@gmail.com";

const fromUser = process.env.GMAIL_USER;
const appPass = process.env.GMAIL_APP_PASS;
const toEmail =
  process.env.BLACK_ONBOARDING_TO || process.env.CONTACT_TO || process.env.GMAIL_USER;

let transporter: nodemailer.Transporter | null = null;

type CallTypeRow = { id: string; slug: string; name: string; duration_min: number };
type SlotRow = { id: string; starts_at: string; status: string; call_type_id?: string | null };
type TutorRow = { id: string; display_name?: string | null; email?: string | null };

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

function parseTimeToMinutes(value: string) {
  const [h, m] = value.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildSlotsForWindow(start: string, end: string, stepMinutes: number) {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (
    startMin === null ||
    endMin === null ||
    !Number.isFinite(stepMinutes) ||
    stepMinutes <= 0 ||
    endMin < startMin
  ) {
    return [] as string[];
  }
  const slots: string[] = [];
  for (let minutes = startMin; minutes <= endMin; minutes += stepMinutes) {
    slots.push(formatMinutes(minutes));
  }
  return slots;
}

function getAllowedSlotsForDate(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  const day = Number.isNaN(parsed.getTime()) ? null : parsed.getUTCDay();
  const window = day !== null && SHORT_DAYS.has(day) ? SHORT_WINDOW : DEFAULT_WINDOW;
  const slots = SLOT_STEPS_MINUTES.flatMap((step) =>
    buildSlotsForWindow(window.start, window.end, step),
  );
  return Array.from(new Set(slots)).sort();
}

function isAllowedSlot(date: string, time: string) {
  return getAllowedSlotsForDate(date).includes(time);
}

function todayInRome() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: ROME_TZ }));
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toUtcIso(date: string, time: string) {
  const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
  const [hh, mm] = time.split(":").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0)).toISOString();
}

function timeFromIsoUtc(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatRomeDateLabel(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const label = d.toLocaleDateString("it-IT", {
    timeZone: ROME_TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function toIcsLocal(date: string, time: string) {
  const [y, m, d] = date.split("-").map((v) => parseInt(v, 10));
  const [hh, mm] = time.split(":").map((v) => parseInt(v, 10));
  const start = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0));
  return start;
}

function formatIcsLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function buildIcsInvite(opts: {
  date: string;
  time: string;
  durationMin: number;
  summary: string;
  description: string;
  location?: string | null;
  url?: string | null;
}) {
  const startLocal = toIcsLocal(opts.date, opts.time);
  const endLocal = new Date(startLocal.getTime() + opts.durationMin * 60000);
  const uid = `theoremz-${startLocal.getTime()}-${Math.random().toString(16).slice(2)}@theoremz.com`;
  const location = (opts.location || "").trim();
  const url = (opts.url || "").trim() || location;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Theoremz//Booking Confirmation//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsLocal(new Date())}Z`,
    `DTSTART;TZID=${ROME_TZ}:${formatIcsLocal(startLocal)}`,
    `DTEND;TZID=${ROME_TZ}:${formatIcsLocal(endLocal)}`,
    `SUMMARY:${opts.summary}`,
    location ? `LOCATION:${location.replace(/\r?\n/g, " ")}` : null,
    url ? `URL:${url.replace(/\r?\n/g, " ")}` : null,
    `DESCRIPTION:${opts.description.replace(/\r?\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function renderBookingConfirmationHtml(opts: {
  name: string;
  callTypeLabel: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  note?: string | null;
  meetLink?: string | null;
}) {
  const meetLink = opts.meetLink?.trim() || "";
  const meetLinkSafe = meetLink ? escapeHtml(meetLink) : "";
  const detailRows = [
    { label: "Tipo di call", value: opts.callTypeLabel },
    { label: "Data", value: opts.dateLabel },
    { label: "Orario", value: `${opts.timeLabel} (ora di Roma)` },
    { label: "Durata", value: `${opts.durationMinutes} minuti` },
    ...(meetLink
      ? [
          {
            label: "Link Meet",
            value: meetLink,
            valueHtml: `<a href="${meetLinkSafe}" style="color:#1d4ed8;text-decoration:underline;">Apri Meet</a>`,
          },
        ]
      : []),
  ];
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Prenotazione confermata</title>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#f6f8fb; }
    @media (prefers-color-scheme: dark) { body { background:#0b1220; } }
    a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  </style>
</head>
<body style="margin:0; padding:0; background:#f6f8fb;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    La tua call Theoremz è confermata. Aggiungi l'evento al calendario.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f8fb;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(16,24,40,.06);">
          <tr>
            <td style="background:#1e3a8a; padding:24px 28px;">
              <table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:18px; line-height:1.2; color:#e5edff; letter-spacing:.2px; font-weight:600;">
                      Theoremz<span style="opacity:.85;">&nbsp;Black</span>
                    </div>
                  </td>
                  <td align="right">
                    <div style="width:10px;height:10px;border-radius:50%;background:#93c5fd;display:inline-block;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <h1 style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:24px; line-height:1.3; color:#0b1220;">
                Prenotazione confermata ✅
              </h1>
              <p style="margin:12px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#334155;">
                Ciao ${escapeHtml(opts.name)}, la tua call è stata confermata. In allegato trovi l'evento calendario.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 0 28px;">
              <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                       style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; color:#334155;">
                  <tbody>
                    ${detailRows
                      .map(
                        (row) => `
                      <tr>
                        <td style="padding:0 0 8px 0; font-weight:600; color:#0f172a;">
                          ${escapeHtml(row.label)}
                        </td>
                        <td align="right" style="padding:0 0 8px 0;">
                          ${row.valueHtml || escapeHtml(row.value)}
                        </td>
                      </tr>`,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 0 28px;">
              ${
                meetLink
                  ? `<p style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#334155;">
                      Link Meet: <a href="${meetLinkSafe}" style="color:#1d4ed8;text-decoration:underline;">${meetLinkSafe}</a>
                    </p>`
                  : `<p style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#334155;">
                      Riceverai il link per collegarti poco prima della call. Se non puoi partecipare, rispondi a questa mail e riprogrammiamo.
                    </p>`
              }
              ${
                opts.note
                  ? `<p style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#334155;">
                      Nota che hai lasciato: <strong>${escapeHtml(opts.note)}</strong>
                    </p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:8px 0 0 0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;">
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#94a3b8;">
                Se hai dubbi, rispondi a questa email o scrivi a ${CONFIRMATION_CC}.
              </p>
              <p style="margin:6px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#94a3b8;">
                © Theoremz. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function getCallTypes(
  db: ReturnType<typeof supabaseServer>,
  slugs: string[],
): Promise<CallTypeRow[]> {
  const { data, error } = await db
    .from("call_types")
    .select("id, slug, name, duration_min, active")
    .in("slug", slugs)
    .eq("active", true);
  if (error) throw new Error(error.message);
  return (data || []) as CallTypeRow[];
}

async function getDefaultTutor(db: ReturnType<typeof supabaseServer>) {
  // Preferisci tutor con email di default
  const { data: byEmail, error: byEmailErr } = await db
    .from("tutors")
    .select("id, display_name, email")
    .eq("email", DEFAULT_TUTOR_EMAIL)
    .order("created_at", { ascending: true })
    .limit(1);
  if (byEmailErr) throw new Error(byEmailErr.message);
  if (byEmail && byEmail[0]) return byEmail[0] as TutorRow;

  // altrimenti primo disponibile
  const { data, error } = await db
    .from("tutors")
    .select("id, display_name, email")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || !data[0]) throw new Error("Nessun tutor configurato");
  return data[0] as TutorRow;
}

async function fetchTutorSlotsForDate(
  db: ReturnType<typeof supabaseServer>,
  tutorId: string,
  date: string,
) {
  const startDay = `${date}T00:00:00Z`;
  const endDay = `${date}T23:59:59Z`;
  const { data, error } = await db
    .from("call_slots")
    .select("id, starts_at, status, call_type_id, duration_min")
    .eq("tutor_id", tutorId)
    .gte("starts_at", startDay)
    .lte("starts_at", endDay)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SlotRow[];
}

async function markSlotsWithBookings(
  db: ReturnType<typeof supabaseServer>,
  slots: SlotRow[],
): Promise<SlotRow[]> {
  if (!slots.length) return slots;
  const ids = slots.map((s) => s.id).filter(Boolean);
  const { data, error } = await db
    .from("call_bookings")
    .select("slot_id")
    .in("slot_id", ids);
  if (error) throw new Error(error.message);
  const bookedSet = new Set((data || []).map((row: any) => row.slot_id as string));
  return slots.map((slot) =>
    bookedSet.has(slot.id) ? ({ ...slot, status: "booked" } as SlotRow) : slot,
  );
}

async function slotAlreadyBooked(db: ReturnType<typeof supabaseServer>, slotId: string) {
  const { data, error } = await db
    .from("call_bookings")
    .select("id")
    .eq("slot_id", slotId)
    .limit(1);
  if (error) throw new Error(error.message);
  return Boolean(data && data.length > 0);
}

async function ensureSlotsForDate(
  db: ReturnType<typeof supabaseServer>,
  callType: CallTypeRow,
  tutor: TutorRow,
  date: string,
) {
  const rows = getAllowedSlotsForDate(date).map((time) => ({
    call_type_id: callType.id,
    tutor_id: tutor.id,
    starts_at: toUtcIso(date, time),
    duration_min: callType.duration_min,
    status: "available" as const,
  }));
  const { error } = await db
    .from("call_slots")
    .upsert(rows, { onConflict: "tutor_id,starts_at", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
}

function extractAvailability(slots: SlotRow[]) {
  const booked = new Set<string>();
  const available = new Set<string>();
  slots.forEach((slot) => {
    const label = timeFromIsoUtc(slot.starts_at);
    if (slot.status === "booked") booked.add(label);
    else available.add(label);
  });
  return {
    available: Array.from(available).sort(),
    booked: Array.from(booked).sort(),
  };
}

function overlapsWindow(slot: SlotRow, startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const ts = new Date(slot.starts_at).getTime();
  return ts >= start && ts < end;
}

export async function GET(req: Request) {
  const auth = await requirePremium(req);
  if (!("user" in auth)) return auth;

  const { searchParams } = new URL(req.url);
  const date = normalizeDate(searchParams.get("date") || "");
  const callTypeSlug = (searchParams.get("type") || DEFAULT_CALL_TYPE_SLUG).trim();

  if (!date) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  let range: { minDate?: string; maxDate?: string } | null = null;
  const today = todayInRome();
  const minGeneric = formatDateOnly(addDays(today, GENERIC_MIN_DAYS));

  if (date < minGeneric) {
    return NextResponse.json({
      date,
      available: [],
      booked: [],
      callTypes: [callTypeSlug || DEFAULT_CALL_TYPE_SLUG],
      range: { minDate: minGeneric },
    });
  }

  if (callTypeSlug === "check-percorso") {
    const minDate = formatDateOnly(addDays(today, CHECK_MIN_DAYS));
    const maxDate = formatDateOnly(addDays(today, CHECK_MAX_DAYS));
    range = { minDate, maxDate };
    if (date < minDate || date > maxDate) {
      return NextResponse.json({
        date,
        available: [],
        booked: [],
        callTypes: [callTypeSlug],
        range,
      });
    }
  }

  const db = supabaseServer();
  if (!db) {
    return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  }

  try {
    const tutor = await getDefaultTutor(db);
    const slugList =
      callTypeSlug === "all"
        ? [DEFAULT_CALL_TYPE_SLUG, "check-percorso"]
        : [callTypeSlug || DEFAULT_CALL_TYPE_SLUG];

    const callTypes = await getCallTypes(db, slugList);
    if (!callTypes.length) throw new Error("Tipi di chiamata non trovati");

    const allSlots: { slot: SlotRow; callType: CallTypeRow }[] = [];
    const allowedTimes = getAllowedSlotsForDate(date).map((t) => ({ time: t, iso: toUtcIso(date, t) }));

    // Assicura slot per ogni callType, poi calcola disponibilità globale per tutor
    for (const callType of callTypes) {
      let slots = await fetchTutorSlotsForDate(db, tutor.id, date);
      if (!slots.some((s) => s.call_type_id === callType.id)) {
        await ensureSlotsForDate(db, callType, tutor, date);
        slots = await fetchTutorSlotsForDate(db, tutor.id, date);
      }
      const slotsWithBookings = await markSlotsWithBookings(db, slots);
      slotsWithBookings.forEach((slot) => allSlots.push({ slot, callType }));
    }

    // blocca orari sovrapposti alle prenotazioni esistenti (anche se non c'è uno slot marcato booked)
    const startDay = `${date}T00:00:00Z`;
    const endDay = `${date}T23:59:59Z`;
    const { data: dayBookings, error: dayBookingsErr } = await db
      .from("call_bookings")
      .select(
        `
        id,
        status,
        slot:call_slots!inner ( starts_at, duration_min, tutor_id ),
        call_type:call_types ( duration_min )
      `,
      )
      .eq("status", "confirmed")
      .eq("call_slots.tutor_id", tutor.id)
      .gte("call_slots.starts_at", startDay)
      .lte("call_slots.starts_at", endDay);
    if (dayBookingsErr) throw new Error(dayBookingsErr.message);

    const blockedTimes = new Set<string>();
    (dayBookings || []).forEach((b: any) => {
      const startIso = b?.slot?.starts_at;
      const dur =
        Number(b?.call_type?.duration_min) > 0
          ? Number(b?.call_type?.duration_min)
          : Number(b?.slot?.duration_min) > 0
            ? Number(b?.slot?.duration_min)
            : 30;
      if (!startIso) return;
      const startMs = new Date(startIso).getTime();
      const endMs = startMs + dur * 60000;
      allowedTimes.forEach((t) => {
        const ts = new Date(t.iso).getTime();
        if (ts >= startMs && ts < endMs) blockedTimes.add(t.time);
      });
    });

    const bookedDetailed = allSlots
      .filter(({ slot }) => slot.status === "booked")
      .map(({ slot, callType }) => ({
        time: timeFromIsoUtc(slot.starts_at),
        durationMinutes: callType.duration_min,
        callType: callType.slug,
      }));

    const timeToStatus = new Map<string, { booked: number; total: number }>();
    allSlots.forEach(({ slot }) => {
      const t = timeFromIsoUtc(slot.starts_at);
      const entry = timeToStatus.get(t) || { booked: 0, total: 0 };
      entry.total += 1;
      if (slot.status === "booked") entry.booked += 1;
      timeToStatus.set(t, entry);
    });
    const available = Array.from(timeToStatus.entries())
      // considera l'orario disponibile solo se nessuno slot è booked e non è bloccato da altre prenotazioni
      .filter(([time, v]) => v.booked === 0 && !blockedTimes.has(time))
      .map(([time]) => time)
      .sort();

    return NextResponse.json({
      date,
      available,
      booked: bookedDetailed,
      callTypes: callTypes.map((c) => c.slug),
      range,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore disponibilità" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requirePremium(req);
    if (!("user" in auth)) return auth;
    const { user } = auth;

    const {
      date,
      time,
      name,
      email,
      note,
      timezone,
      account,
      callType: callTypeSlugRaw,
      callDurationMinutes,
    } = await req.json();
    const normalizedDate = normalizeDate(String(date || "").trim());
    const timeSlot = String(time || "").trim();
    const fullName = String(name || "").trim();
    const replyEmail = String(email || "").trim();
    const extraNote = String(note || "").trim();
    const tz = String(timezone || "").trim() || "n.d.";
    const accountInfo = account && typeof account === "object" ? account : {};
    const accEmail = user.email;
    const accUid = user.uid;
    const accDisplay = String(accountInfo.displayName || "").trim();
    const accUsername = String(accountInfo.username || "").trim();
    const callTypeSlug = String(callTypeSlugRaw || "").trim() || DEFAULT_CALL_TYPE_SLUG;

    if (!normalizedDate || !isAllowedSlot(normalizedDate, timeSlot)) {
      return NextResponse.json({ error: "Data o orario non validi" }, { status: 400 });
    }

    const today = todayInRome();
    const minGeneric = formatDateOnly(addDays(today, GENERIC_MIN_DAYS));

    if (normalizedDate < minGeneric) {
      return NextResponse.json(
        { error: `Puoi prenotare a partire da ${minGeneric} (almeno 1 giorno di anticipo).` },
        { status: 400 },
      );
    }

    if (callTypeSlug === "check-percorso") {
      const minDate = formatDateOnly(addDays(today, CHECK_MIN_DAYS));
      const maxDate = formatDateOnly(addDays(today, CHECK_MAX_DAYS));
      if (normalizedDate < minDate || normalizedDate > maxDate) {
        return NextResponse.json(
          {
            error: `Per i check puoi prenotare da ${minDate} a ${maxDate} (almeno 1 giorno di anticipo, max 2 settimane).`,
          },
          { status: 400 },
        );
      }
    }

    const safeEmail = replyEmail || accEmail || "noreply@theoremz.com";
    const safeName = fullName || accDisplay || accEmail || "Utente Black";

    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }

    const [callType] = await getCallTypes(db, [callTypeSlug]);
    if (!callType) throw new Error("Tipo di chiamata non trovato");
    const tutor = await getDefaultTutor(db);
    const durationMinutes =
      Number.isFinite(Number(callDurationMinutes)) && Number(callDurationMinutes) > 0
        ? Number(callDurationMinutes)
        : callType.duration_min;

    // assicura che tutti gli slot del giorno per questo callType esistano
    await ensureSlotsForDate(db, callType, tutor, normalizedDate);

    const slotStartIso = toUtcIso(normalizedDate, timeSlot);
    const slotEndIso = new Date(new Date(slotStartIso).getTime() + durationMinutes * 60000).toISOString();

    const daySlots = await markSlotsWithBookings(
      db,
      await fetchTutorSlotsForDate(db, tutor.id, normalizedDate),
    );
    const overlapping = daySlots.filter((s) => overlapsWindow(s, slotStartIso, slotEndIso));

    const overlappingBooked = overlapping.filter((s) => s.status === "booked");
    if (overlappingBooked.length) {
      const { booked } = extractAvailability(daySlots);
      return NextResponse.json({ error: "Slot già prenotato", booked }, { status: 409 });
    }

    const slot = overlapping.find((s) => s.starts_at === slotStartIso) || null;

    let ensuredSlot = slot;
    if (!ensuredSlot) {
      const { data: created, error: createErr } = await db
        .from("call_slots")
        .upsert(
          {
            call_type_id: callType.id,
            tutor_id: tutor.id,
            starts_at: slotStartIso,
            duration_min: durationMinutes,
            status: "available",
          },
          { onConflict: "tutor_id,starts_at" },
        )
        .select("id, starts_at, status")
        .limit(1);
      if (createErr) throw new Error(createErr.message);
      ensuredSlot = (created || [])[0] as SlotRow;
    }

    if (ensuredSlot?.status !== "available") {
      const { booked } = extractAvailability(daySlots);
      return NextResponse.json({ error: "Slot già prenotato", booked }, { status: 409 });
    }

    const slotBooked = await slotAlreadyBooked(db, ensuredSlot.id);
    if (slotBooked) {
      const { booked } = extractAvailability(daySlots);
      return NextResponse.json({ error: "Slot già prenotato", booked }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const { data: locked, error: lockErr } = await db
      .from("call_slots")
      .update({
        status: "booked",
        call_type_id: callType.id,
        duration_min: durationMinutes,
        updated_at: nowIso,
      })
      .eq("id", ensuredSlot.id)
      .eq("status", "available")
      .select("id")
      .limit(1);
    if (lockErr) throw new Error(lockErr.message);
    if (!locked || !locked[0]) {
      const { booked } = extractAvailability(daySlots);
      return NextResponse.json({ error: "Slot già prenotato", booked }, { status: 409 });
    }

    // blocca gli slot sovrapposti
    const overlapIds = Array.from(
      new Set(
        [...overlapping.map((s) => s.id), ensuredSlot.id].filter(Boolean),
      ),
    );
    if (overlapIds.length) {
      await db
        .from("call_slots")
        .update({
          status: "booked",
          call_type_id: callType.id,
          duration_min: durationMinutes,
          updated_at: nowIso,
        })
        .in("id", overlapIds)
        .eq("status", "available");
    }

    const userId = accUid || null;
    const { data: inserted, error: bookingErr } = await db
      .from("call_bookings")
      .insert({
        slot_id: ensuredSlot.id,
        call_type_id: callType.id,
        tutor_id: tutor.id,
        user_id: userId,
        full_name: safeName,
        email: safeEmail,
        note: extraNote || null,
        status: "confirmed",
      })
      .select("id")
      .maybeSingle();
    if (bookingErr) {
      if (
        bookingErr.code === "23505" ||
        (typeof bookingErr.message === "string" &&
          bookingErr.message.includes("call_bookings_slot_id_key"))
      ) {
        const slots = await fetchTutorSlotsForDate(db, tutor.id, normalizedDate);
        const { booked } = extractAvailability(slots);
        return NextResponse.json(
          { error: "Slot già prenotato", booked },
          { status: 409 },
        );
      }
      throw new Error(bookingErr.message);
    }

    if (userId) {
      try {
        await syncLiteProfilePatch(userId, { full_name: safeName });
      } catch (err) {
        console.error("[black-onboarding/book] syncLiteProfilePatch failed", err);
      }
    }

    const callTypeLabel = callType.name;
    let meetLink: string | null = null;
    const bookingId = inserted?.id || null;
    if (bookingId) {
      const summary = `${callTypeLabel} Theoremz - ${safeName}`;
      const description = [
        `Studente: ${safeName}`,
        `Email: ${safeEmail}`,
        `Tipo: ${callTypeLabel}`,
        `Durata: ${durationMinutes} minuti`,
        `Tutor: ${tutor.display_name || "Tutor"}`,
        `Timezone: ${tz}`,
        extraNote ? `Note: ${extraNote}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const calendarResult = await createGoogleCalendarEvent({
          bookingId,
          summary,
          description,
          startIso: slotStartIso,
          endIso: slotEndIso,
          useFloatingTime: true,
          timeZone: ROME_TZ,
        });
        meetLink = calendarResult.meetLink || null;
      } catch (err) {
        console.error("[black-onboarding/book] calendar event failed", err);
      }
    }

    if (!toEmail) {
      throw new Error("Email destinatario mancante (BLACK_ONBOARDING_TO o GMAIL_USER).");
    }

    const mailer = ensureTransporter();
    const html = `
      <div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
        <h2 style="margin:0 0 8px;font-size:18px">Nuova prenotazione ${escapeHtml(callTypeLabel)}</h2>
        <p style="margin:4px 0"><strong>Nome:</strong> ${escapeHtml(safeName)}</p>
        <p style="margin:4px 0"><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
        <p style="margin:4px 0"><strong>Tipo di chiamata:</strong> ${escapeHtml(callTypeLabel)}</p>
        <p style="margin:4px 0"><strong>Durata:</strong> ${escapeHtml(
          `${durationMinutes} minuti`,
        )}</p>
        <p style="margin:4px 0"><strong>Data:</strong> ${normalizedDate}</p>
        <p style="margin:4px 0"><strong>Ora:</strong> ${timeSlot}</p>
        <p style="margin:4px 0"><strong>Tutor:</strong> ${escapeHtml(
          tutor.display_name || "Tutor",
        )}</p>
        <p style="margin:4px 0"><strong>Timezone:</strong> ${escapeHtml(tz)}</p>
        ${
          meetLink
            ? `<p style="margin:4px 0"><strong>Link Meet:</strong> <a href="${escapeHtml(
                meetLink,
              )}" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(meetLink)}</a></p>`
            : ""
        }
        ${extraNote ? `<p style="margin:8px 0"><strong>Nota:</strong><br>${escapeHtml(extraNote)}</p>` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0" />
        <p style="margin:4px 0"><strong>Account email:</strong> ${escapeHtml(accEmail || replyEmail)}</p>
        <p style="margin:4px 0"><strong>UID:</strong> ${escapeHtml(accUid || "—")}</p>
        <p style="margin:4px 0"><strong>Display name:</strong> ${escapeHtml(accDisplay || "—")}</p>
        <p style="margin:4px 0"><strong>Username:</strong> ${escapeHtml(accUsername || "—")}</p>
      </div>
    `.trim();

    const text = `
Nuova prenotazione ${callTypeLabel}
Nome: ${safeName}
Email: ${safeEmail}
Tipo di chiamata: ${callTypeLabel}
Durata: ${durationMinutes} minuti
Data: ${normalizedDate}
Ora: ${timeSlot}
Tutor: ${tutor.display_name || "Tutor"}
Timezone: ${tz}
${meetLink ? `Link Meet: ${meetLink}` : ""}
${extraNote ? `Nota: ${extraNote}` : ""}
Account email: ${accEmail || replyEmail}
UID: ${accUid || "—"}
Display name: ${accDisplay || "—"}
Username: ${accUsername || "—"}
`.trim();

    await mailer.sendMail({
      from: `"Theoremz Black" <${fromUser}>`,
      to: toEmail,
      subject: `[Black] ${callTypeLabel} ${normalizedDate} ${timeSlot}`,
      text,
      html,
      replyTo: replyEmail,
    });

    const confirmationEmail = (replyEmail || accEmail || "").trim();
    const shouldSendConfirmation =
      ["onboarding", "check-percorso"].includes(callType.slug) &&
      confirmationEmail.includes("@") &&
      confirmationEmail.toLowerCase() !== "noreply@theoremz.com";
    if (shouldSendConfirmation) {
      try {
        const dateLabel = formatRomeDateLabel(normalizedDate);
        const confirmSubject = `Conferma ${callTypeLabel} · ${dateLabel} ${timeSlot}`;
        const confirmText = [
          `Ciao ${safeName},`,
          "",
          "La tua prenotazione è confermata.",
          `Tipo di call: ${callTypeLabel}`,
          `Quando: ${dateLabel} alle ${timeSlot} (ora di Roma)`,
          `Durata: ${durationMinutes} minuti`,
          extraNote ? `Nota: ${extraNote}` : null,
          "",
          "In allegato trovi l'evento calendario (.ics).",
          meetLink ? `Link Meet: ${meetLink}` : "Riceverai il link per collegarti poco prima della call.",
          "",
          "A presto,",
          "Team Theoremz",
        ]
          .filter(Boolean)
          .join("\n");

        const confirmHtml = renderBookingConfirmationHtml({
          name: safeName,
          callTypeLabel,
          dateLabel,
          timeLabel: timeSlot,
          durationMinutes,
          note: extraNote || null,
          meetLink,
        });

        const icsDescription = [
          "Conferma prenotazione Theoremz.",
          meetLink ? `Link Meet: ${meetLink}` : "Riceverai il link per collegarti poco prima della call.",
        ]
          .filter(Boolean)
          .join("\n");

        const ics = buildIcsInvite({
          date: normalizedDate,
          time: timeSlot,
          durationMin: durationMinutes,
          summary: `${callTypeLabel} Theoremz`,
          description: icsDescription,
          location: meetLink,
          url: meetLink,
        });

        await mailer.sendMail({
          from: `"Theoremz" <${fromUser}>`,
          to: confirmationEmail,
          cc: CONFIRMATION_CC,
          subject: confirmSubject,
          text: confirmText,
          html: confirmHtml,
          replyTo: CONFIRMATION_CC,
          attachments: [
            {
              filename: "call-theoremz.ics",
              content: ics,
              contentType: "text/calendar; charset=utf-8",
            },
          ],
        });
      } catch (err) {
        console.error("[black-onboarding/book] confirmation email failed", err);
      }
    }

    const slots = await markSlotsWithBookings(
      db,
      await fetchTutorSlotsForDate(db, tutor.id, normalizedDate),
    );
    const { booked } = extractAvailability(slots);

    return NextResponse.json({
      ok: true,
      booked,
      callType: callType.slug,
      slot: ensuredSlot?.id || slot?.id || null,
    });
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
