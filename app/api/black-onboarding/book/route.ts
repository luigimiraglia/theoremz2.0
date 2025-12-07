import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseServer } from "@/lib/supabase";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SLOTS = [
  "17:00",
  "17:20",
  "17:30",
  "17:40",
  "18:00",
  "18:20",
  "18:30",
  "18:40",
  "19:00",
] as const;
const DEFAULT_CALL_TYPE_SLUG = "onboarding";
const DEFAULT_TUTOR_EMAIL = "luigi.miraglia006@gmail.com";
const ROME_TZ = "Europe/Rome";
const CHECK_MIN_DAYS = 2; // oggi -> dopodomani
const CHECK_MAX_DAYS = 14; // entro due settimane

const fromUser = process.env.GMAIL_USER;
const appPass = process.env.GMAIL_APP_PASS;
const toEmail =
  process.env.BLACK_ONBOARDING_TO || process.env.CONTACT_TO || process.env.GMAIL_USER;

let transporter: nodemailer.Transporter | null = null;

type CallTypeRow = { id: string; slug: string; name: string; duration_min: number };
type SlotRow = { id: string; starts_at: string; status: string };
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

function isAllowedSlot(time: string): time is (typeof ALLOWED_SLOTS)[number] {
  return ALLOWED_SLOTS.includes(time as (typeof ALLOWED_SLOTS)[number]);
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
  const { data, error } = await db
    .from("tutors")
    .select("id, display_name, email")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as TutorRow;

  // Fallback: try via email lookup
  const { data: byEmail, error: byEmailErr } = await db
    .from("tutors")
    .select("id, display_name, email")
    .eq("email", DEFAULT_TUTOR_EMAIL)
    .maybeSingle();
  if (byEmailErr) throw new Error(byEmailErr.message);
  if (!byEmail) throw new Error("Nessun tutor configurato");
  return byEmail as TutorRow;
}

async function fetchSlotsForDate(
  db: ReturnType<typeof supabaseServer>,
  callTypeId: string,
  date: string,
) {
  const startDay = `${date}T00:00:00Z`;
  const endDay = `${date}T23:59:59Z`;
  const { data, error } = await db
    .from("call_slots")
    .select("id, starts_at, status")
    .eq("call_type_id", callTypeId)
    .gte("starts_at", startDay)
    .lte("starts_at", endDay)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SlotRow[];
}

async function ensureSlotsForDate(
  db: ReturnType<typeof supabaseServer>,
  callType: CallTypeRow,
  tutor: TutorRow,
  date: string,
) {
  const rows = ALLOWED_SLOTS.map((time) => ({
    call_type_id: callType.id,
    tutor_id: tutor.id,
    starts_at: toUtcIso(date, time),
    duration_min: callType.duration_min,
    status: "available" as const,
  }));
  const { error } = await db
    .from("call_slots")
    .upsert(rows, { onConflict: "tutor_id,starts_at" })
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = normalizeDate(searchParams.get("date") || "");
  const callTypeSlug = (searchParams.get("type") || DEFAULT_CALL_TYPE_SLUG).trim();

  if (!date) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  let range: { minDate?: string; maxDate?: string } | null = null;
  if (callTypeSlug === "check-percorso") {
    const today = todayInRome();
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

    for (const callType of callTypes) {
      let slots = await fetchSlotsForDate(db, callType.id, date);
      if (slots.length === 0) {
        await ensureSlotsForDate(db, callType, tutor, date);
        slots = await fetchSlotsForDate(db, callType.id, date);
      }
      slots.forEach((slot) => allSlots.push({ slot, callType }));
    }

    const bookedDetailed = allSlots
      .filter(({ slot }) => slot.status === "booked")
      .map(({ slot, callType }) => ({
        time: timeFromIsoUtc(slot.starts_at),
        durationMinutes: callType.duration_min,
        callType: callType.slug,
      }));

    const availableSet = new Set<string>();
    allSlots.forEach(({ slot }) => {
      if (slot.status !== "booked") availableSet.add(timeFromIsoUtc(slot.starts_at));
    });

    return NextResponse.json({
      date,
      available: Array.from(availableSet).sort(),
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
    const accEmail = String(accountInfo.email || "").trim();
    const accUid = String(accountInfo.uid || "").trim();
    const accDisplay = String(accountInfo.displayName || "").trim();
    const accUsername = String(accountInfo.username || "").trim();
    const callTypeSlug = String(callTypeSlugRaw || "").trim() || DEFAULT_CALL_TYPE_SLUG;

    if (!normalizedDate || !isAllowedSlot(timeSlot)) {
      return NextResponse.json({ error: "Data o orario non validi" }, { status: 400 });
    }

    if (callTypeSlug === "check-percorso") {
      const today = todayInRome();
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

    const slotStartIso = toUtcIso(normalizedDate, timeSlot);
    const { data: fetchedSlot, error: slotErr } = await db
      .from("call_slots")
      .select("id, starts_at, status")
      .eq("call_type_id", callType.id)
      .eq("starts_at", slotStartIso)
      .maybeSingle();
    if (slotErr) throw new Error(slotErr.message);

    let slot = fetchedSlot as SlotRow | null;

    if (!slot) {
      // crea lo slot al volo, gestendo eventuale race con onConflict
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
        .maybeSingle();
      if (createErr) throw new Error(createErr.message);
      slot = created as SlotRow;
    }

    if (slot.status !== "available") {
      const slots = await fetchSlotsForDate(db, callType.id, normalizedDate);
      const { booked } = extractAvailability(slots);
      return NextResponse.json(
        { error: "Slot già prenotato", booked },
        { status: 409 },
      );
    }

    const { data: locked, error: lockErr } = await db
      .from("call_slots")
      .update({ status: "booked", updated_at: new Date().toISOString() })
      .eq("id", slot.id)
      .eq("status", "available")
      .select("id")
      .maybeSingle();
    if (lockErr) throw new Error(lockErr.message);
    if (!locked) {
      const slots = await fetchSlotsForDate(db, callType.id, normalizedDate);
      const { booked } = extractAvailability(slots);
      return NextResponse.json(
        { error: "Slot già prenotato", booked },
        { status: 409 },
      );
    }

    const userId = accUid || null;
    const { error: bookingErr } = await db.from("call_bookings").insert({
      slot_id: slot.id,
      call_type_id: callType.id,
      tutor_id: tutor.id,
      user_id: userId,
      full_name: safeName,
      email: safeEmail,
      note: extraNote || null,
      status: "confirmed",
    });
    if (bookingErr) throw new Error(bookingErr.message);

    if (userId) {
      try {
        await syncLiteProfilePatch(userId, { full_name: safeName });
      } catch (err) {
        console.error("[black-onboarding/book] syncLiteProfilePatch failed", err);
      }
    }

    const callTypeLabel = callType.name;

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

    const slots = await fetchSlotsForDate(db, callType.id, normalizedDate);
    const { booked } = extractAvailability(slots);

    return NextResponse.json({
      ok: true,
      booked,
      callType: callType.slug,
      slot: slot.id,
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
