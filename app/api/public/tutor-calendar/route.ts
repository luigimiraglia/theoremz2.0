import { NextRequest, NextResponse } from "next/server";
import { createGoogleCalendarEvent } from "@/lib/googleCalendar";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CALL_TYPE_SLUG = "ripetizione";
const DEFAULT_DURATION_MIN = 60;
const RANGE_DAYS = 90;

type TutorRow = { id: string; display_name?: string | null; email?: string | null };
type CallTypeRow = { id: string; slug: string; name: string; duration_min: number };
type SlotRow = { id: string; status?: string | null; starts_at: string; duration_min?: number | null };

function normalizeIso(input?: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function fetchTutorByEmail(db: ReturnType<typeof supabaseServer>, email: string) {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await db
    .from("tutors")
    .select("id, display_name, email")
    .ilike("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Tutor non trovato");
  return data as TutorRow;
}

async function fetchCallType(db: ReturnType<typeof supabaseServer>, slug: string) {
  const { data, error } = await db
    .from("call_types")
    .select("id, slug, name, duration_min, active")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !data.active) throw new Error("Tipo di chiamata non valido");
  return data as CallTypeRow;
}

async function ensureBookableSlot(
  db: ReturnType<typeof supabaseServer>,
  opts: { startsAtIso: string; durationMin: number; tutor: TutorRow; callType: CallTypeRow },
) {
  const startMs = new Date(opts.startsAtIso).getTime();
  if (!Number.isFinite(startMs)) {
    throw new Error("Data/ora non valida");
  }
  if (startMs < Date.now()) {
    throw new Error("Slot non valido");
  }
  const duration = Number.isFinite(opts.durationMin) ? opts.durationMin : DEFAULT_DURATION_MIN;
  const endMs = startMs + duration * 60000;
  const endIso = new Date(endMs).toISOString();

  const { data: booked, error: bookedErr } = await db
    .from("call_slots")
    .select("id")
    .eq("tutor_id", opts.tutor.id)
    .eq("status", "booked")
    .lt("starts_at", endIso)
    .gt("ends_at", opts.startsAtIso);
  if (bookedErr) throw new Error(bookedErr.message);
  if (booked && booked.length > 0) {
    throw new Error("Slot gia prenotato");
  }

  const { data: cover, error: coverErr } = await db
    .from("tutor_availability_blocks")
    .select("id")
    .eq("tutor_id", opts.tutor.id)
    .lte("starts_at", opts.startsAtIso)
    .gte("ends_at", endIso)
    .limit(1);
  if (coverErr) throw new Error(coverErr.message);
  if (!cover || cover.length === 0) {
    throw new Error("Fuori disponibilita");
  }

  const { data: existingSlot, error: slotErr } = await db
    .from("call_slots")
    .select("id, status, starts_at, duration_min")
    .eq("tutor_id", opts.tutor.id)
    .eq("starts_at", opts.startsAtIso)
    .maybeSingle();
  if (slotErr) throw new Error(slotErr.message);

  const payload = {
    status: "booked",
    call_type_id: opts.callType.id,
    duration_min: duration,
    updated_at: new Date().toISOString(),
  };

  if (existingSlot) {
    if (existingSlot.status === "booked") {
      throw new Error("Slot gia prenotato");
    }
    const { data: updated, error: updErr } = await db
      .from("call_slots")
      .update(payload)
      .eq("id", existingSlot.id)
      .select("id, status, starts_at, duration_min")
      .limit(1);
    if (updErr) throw new Error(updErr.message);
    return (updated && updated[0]) as SlotRow;
  }

  const { data: created, error: createErr } = await db
    .from("call_slots")
    .insert({
      tutor_id: opts.tutor.id,
      call_type_id: opts.callType.id,
      starts_at: opts.startsAtIso,
      duration_min: duration,
      status: "booked",
    })
    .select("id, status, starts_at, duration_min")
    .limit(1);
  if (createErr) throw new Error(createErr.message);
  if (!created || !created[0]) {
    throw new Error("Impossibile recuperare lo slot richiesto");
  }
  return created[0] as SlotRow;
}

export async function GET(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const email = String(searchParams.get("email") || "").trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email tutor non valida" }, { status: 400 });
    }

    const tutor = await fetchTutorByEmail(db, email);
    const rangeStart = new Date();
    const rangeEnd = new Date(Date.now() + RANGE_DAYS * 86400000);
    const fromIso = rangeStart.toISOString();
    const toIso = rangeEnd.toISOString();

    const { data: blocks, error: blocksErr } = await db
      .from("tutor_availability_blocks")
      .select("starts_at, ends_at")
      .eq("tutor_id", tutor.id)
      .lt("starts_at", toIso)
      .gt("ends_at", fromIso)
      .order("starts_at", { ascending: true });
    if (blocksErr) throw new Error(blocksErr.message);

    const { data: bookedSlots, error: bookedErr } = await db
      .from("call_slots")
      .select("starts_at, ends_at")
      .eq("tutor_id", tutor.id)
      .eq("status", "booked")
      .lt("starts_at", toIso)
      .gt("ends_at", fromIso)
      .order("starts_at", { ascending: true });
    if (bookedErr) throw new Error(bookedErr.message);

    return NextResponse.json({
      tutor: {
        id: tutor.id,
        displayName: tutor.display_name || null,
        email: tutor.email || null,
      },
      range: { from: fromIso, to: toIso },
      blocks: blocks || [],
      booked: bookedSlots || [],
      durationMin: DEFAULT_DURATION_MIN,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore disponibilita" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  try {
    const body = await request.json().catch(() => ({}));
    const tutorEmail = String(body.tutorEmail || "").trim();
    if (!tutorEmail || !tutorEmail.includes("@")) {
      return NextResponse.json({ error: "Email tutor non valida" }, { status: 400 });
    }
    const fullName = String(body.fullName || "").trim();
    const studentEmail = String(body.studentEmail || "").trim();
    if (!fullName) {
      return NextResponse.json({ error: "Nome non valido" }, { status: 400 });
    }
    if (!studentEmail || !studentEmail.includes("@")) {
      return NextResponse.json({ error: "Email studente non valida" }, { status: 400 });
    }

    let startsAtIso: string | null = null;
    if (body.startMs != null && Number.isFinite(Number(body.startMs))) {
      startsAtIso = new Date(Number(body.startMs)).toISOString();
    } else {
      startsAtIso = normalizeIso(body.startsAt);
    }
    if (!startsAtIso) {
      return NextResponse.json({ error: "Data/ora non valida" }, { status: 400 });
    }

    const tutor = await fetchTutorByEmail(db, tutorEmail);
    const callType = await fetchCallType(db, CALL_TYPE_SLUG);
    const durationMin = DEFAULT_DURATION_MIN;

    const slot = await ensureBookableSlot(db, {
      startsAtIso,
      durationMin,
      tutor,
      callType,
    });

    const payload = {
      slot_id: slot.id,
      call_type_id: callType.id,
      tutor_id: tutor.id,
      full_name: fullName,
      email: studentEmail,
      note: body.note ? String(body.note) : null,
      status: "confirmed",
    };

    const { data: inserted, error } = await db
      .from("call_bookings")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const bookingId = inserted?.id || null;
    if (bookingId) {
      const durationMin = Number(slot.duration_min ?? callType.duration_min ?? DEFAULT_DURATION_MIN);
      const endsAtIso = new Date(
        new Date(slot.starts_at).getTime() + durationMin * 60000,
      ).toISOString();
      const summary = `${callType.name || callType.slug || "Call"} Theoremz - ${fullName}`;
      const description = [
        `Studente: ${fullName}`,
        `Email: ${studentEmail}`,
        tutor.display_name ? `Tutor: ${tutor.display_name}` : null,
        tutor.email && !tutor.display_name ? `Tutor: ${tutor.email}` : null,
        callType.name ? `Tipo: ${callType.name}` : callType.slug ? `Tipo: ${callType.slug}` : null,
        payload.note ? `Note: ${String(payload.note)}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await createGoogleCalendarEvent({
          bookingId,
          summary,
          description,
          startIso: slot.starts_at,
          endIso: endsAtIso,
        });
      } catch (err) {
        console.error("[public/tutor-calendar] calendar event failed", err);
      }
    }

    return NextResponse.json({
      ok: true,
      bookingId,
      startsAt: slot.starts_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore prenotazione" }, { status: 500 });
  }
}
