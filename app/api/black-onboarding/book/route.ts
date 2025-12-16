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
const CHECK_MIN_DAYS = 1; // oggi -> domani
const CHECK_MAX_DAYS = 14; // entro due settimane
const GENERIC_MIN_DAYS = 1; // tutte le call: prenotabili da domani

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
  const rows = ALLOWED_SLOTS.map((time) => ({
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
    const allowedTimes = ALLOWED_SLOTS.map((t) => ({ time: t, iso: toUtcIso(date, t) }));

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
    const { error: bookingErr } = await db.from("call_bookings").insert({
      slot_id: ensuredSlot.id,
      call_type_id: callType.id,
      tutor_id: tutor.id,
      user_id: userId,
      full_name: safeName,
      email: safeEmail,
      note: extraNote || null,
      status: "confirmed",
    });
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
