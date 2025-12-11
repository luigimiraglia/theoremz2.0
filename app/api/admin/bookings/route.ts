import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMAIL = "luigi.miraglia006@gmail.com";

type CallTypeRow = { id: string; slug: string; name: string; duration_min: number };
type TutorRow = { id: string; display_name?: string | null; email?: string | null };
type SlotRow = { id: string; status?: string | null; starts_at: string; duration_min?: number | null };

function isAdminEmail(email?: string | null) {
  return Boolean(email && email.toLowerCase() === ALLOWED_EMAIL);
}

async function getAdminAuth() {
  try {
    const mod = await import("@/lib/firebaseAdmin");
    return mod.adminAuth;
  } catch (err) {
    console.error("[admin/bookings] firebase admin unavailable", err);
    return null;
  }
}

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  const adminAuth = await getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: "admin_auth_unavailable" }, { status: 503 });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("[admin/bookings] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function normalizeIso(input?: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function mapBooking(row: any) {
  const slot = row.slot || {};
  return {
    id: row.id as string,
    slotId: slot.id as string | undefined,
    callTypeId: (row.call_type_id as string | undefined) || slot.call_type?.id,
    tutorId: (row.tutor_id as string | undefined) || slot.tutor?.id,
    fullName: row.full_name as string,
    email: row.email as string,
    note: row.note as string | null,
    bookedAt: row.booked_at as string,
    startsAt: slot.starts_at as string,
    durationMin: slot.duration_min as number | null,
    status: (row.status as string | null) || (slot.status as string | null),
    callType: slot.call_type?.slug as string | null,
    callTypeName: slot.call_type?.name as string | null,
    tutorName: slot.tutor?.display_name as string | null,
  };
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

async function fetchDefaultTutor(db: ReturnType<typeof supabaseServer>, tutorId?: string | null) {
  if (tutorId) {
    const { data, error } = await db
      .from("tutors")
      .select("id, display_name, email")
      .eq("id", tutorId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as TutorRow;
  }
  const { data, error } = await db
    .from("tutors")
    .select("id, display_name, email")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nessun tutor configurato");
  return data as TutorRow;
}

async function ensureBookableSlot(
  db: ReturnType<typeof supabaseServer>,
  opts: {
    startsAtIso: string;
    callType: CallTypeRow;
    tutor: TutorRow;
    durationMin?: number | null;
    allowSlotId?: string | null;
  },
) {
  const duration = Number(opts.durationMin) > 0 ? Number(opts.durationMin) : opts.callType.duration_min;
  const { data: existing, error } = await db
    .from("call_slots")
    .select("id, status, call_type_id, tutor_id, starts_at, duration_min")
    .eq("tutor_id", opts.tutor.id)
    .eq("starts_at", opts.startsAtIso)
    .maybeSingle();
  if (error) throw new Error(error.message);

  let slot: SlotRow | null = (existing as SlotRow) || null;
  if (!slot) {
    const { data: created, error: createErr } = await db
      .from("call_slots")
      .upsert(
        {
          tutor_id: opts.tutor.id,
          call_type_id: opts.callType.id,
          starts_at: opts.startsAtIso,
          duration_min: duration,
          status: "available",
        },
        { onConflict: "tutor_id,starts_at" },
      )
      .select("id, status, starts_at, duration_min")
      .maybeSingle();
    if (createErr) throw new Error(createErr.message);
    slot = created as SlotRow;
  }

  if (slot.status === "booked" && slot.id !== opts.allowSlotId) {
    throw new Error("Slot già prenotato");
  }

  if (slot.id === opts.allowSlotId) {
    const { data: updated, error: updErr } = await db
      .from("call_slots")
      .update({
        call_type_id: opts.callType.id,
        duration_min: duration,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slot.id)
      .select("id, status, starts_at, duration_min")
      .maybeSingle();
    if (updErr) throw new Error(updErr.message);
    return updated as SlotRow;
  }

  const { data: locked, error: lockErr } = await db
    .from("call_slots")
    .update({
      status: "booked",
      call_type_id: opts.callType.id,
      duration_min: duration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slot.id)
    .eq("status", "available")
    .select("id, status, starts_at, duration_min")
    .maybeSingle();
  if (lockErr) throw new Error(lockErr.message);
  if (!locked) throw new Error("Slot non disponibile");
  return locked as SlotRow;
}

async function releaseSlot(db: ReturnType<typeof supabaseServer>, slotId?: string | null) {
  if (!slotId) return;
  await db
    .from("call_slots")
    .update({ status: "available", updated_at: new Date().toISOString() })
    .eq("id", slotId);
}

async function fetchBookingById(db: ReturnType<typeof supabaseServer>, id: string) {
  const { data, error } = await db
    .from("call_bookings")
    .select(
      `
        id,
        call_type_id,
        tutor_id,
        slot:call_slots (
          id,
          starts_at,
          duration_min,
          status,
          call_type:call_types ( id, slug, name, duration_min ),
          tutor:tutors ( id, display_name )
        ),
        full_name,
        email,
        note,
        status,
        booked_at
      `,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapBooking(data);
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const meta = searchParams.get("meta") === "1";

    const { data, error } = await db
      .from("call_bookings")
      .select(
        `
          id,
          call_type_id,
          tutor_id,
          slot:call_slots (
            id,
            starts_at,
            duration_min,
            status,
            call_type:call_types ( id, slug, name, duration_min ),
            tutor:tutors ( id, display_name )
          ),
          full_name,
          email,
          note,
          status,
          booked_at
        `,
      )
      .order("booked_at", { ascending: false })
      .limit(500);

    if (error) {
      throw new Error(error.message);
    }

    const bookings = (data || []).map(mapBooking);

    if (!meta) {
      return NextResponse.json({ bookings });
    }

    const [{ data: callTypes, error: ctErr }, { data: tutors, error: tutorErr }] = await Promise.all([
      db.from("call_types").select("id, slug, name, duration_min, active").eq("active", true),
      db.from("tutors").select("id, display_name, email").order("display_name", { ascending: true }),
    ]);
    if (ctErr) throw new Error(ctErr.message);
    if (tutorErr) throw new Error(tutorErr.message);

    return NextResponse.json({
      bookings,
      callTypes: callTypes || [],
      tutors: tutors || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore prenotazioni" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;
    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }

    const body = await request.json();
    const startsAtIso = normalizeIso(body.startsAt);
    if (!startsAtIso) return NextResponse.json({ error: "Data/ora non valida" }, { status: 400 });

    const callType = await fetchCallType(db, String(body.callTypeSlug || "onboarding"));
    const tutor = await fetchDefaultTutor(db, body.tutorId);
    const slot = await ensureBookableSlot(db, {
      startsAtIso,
      callType,
      tutor,
      durationMin: body.durationMin,
    });

    const payload = {
      slot_id: slot.id,
      call_type_id: callType.id,
      tutor_id: tutor.id,
      full_name: String(body.fullName || body.name || "Senza nome"),
      email: String(body.email || "noreply@theoremz.com"),
      note: body.note ? String(body.note) : null,
      user_id: body.userId ? String(body.userId) : null,
      status: body.status === "cancelled" ? "cancelled" : "confirmed",
    };

    const { data: inserted, error } = await db
      .from("call_bookings")
      .insert(payload)
      .select(
        `
          id,
          call_type_id,
          tutor_id,
          slot:call_slots (
            id,
            starts_at,
            duration_min,
            status,
            call_type:call_types ( id, slug, name, duration_min ),
            tutor:tutors ( id, display_name )
          ),
          full_name,
          email,
          note,
          status,
          booked_at
        `,
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({ booking: inserted ? mapBooking(inserted) : null });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore creazione booking" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;
    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

    const existing = await fetchBookingById(db, id);
    if (!existing) return NextResponse.json({ error: "Booking non trovato" }, { status: 404 });

    const callTypeSlug = body.callTypeSlug || existing.callType || "onboarding";
    const callType = await fetchCallType(db, String(callTypeSlug));
    const tutor = await fetchDefaultTutor(db, body.tutorId || existing.tutorId);

    const startsAtIso = normalizeIso(body.startsAt || existing.startsAt);
    if (!startsAtIso) return NextResponse.json({ error: "Data/ora non valida" }, { status: 400 });

    const slot = await ensureBookableSlot(db, {
      startsAtIso,
      callType,
      tutor,
      durationMin: body.durationMin || existing.durationMin,
      allowSlotId: existing.slotId || null,
    });

    const updates: Record<string, any> = {
      slot_id: slot.id,
      call_type_id: callType.id,
      tutor_id: tutor.id,
      full_name: String(body.fullName || body.name || existing.fullName || "Senza nome"),
      email: String(body.email || existing.email || "noreply@theoremz.com"),
      note: body.note !== undefined ? (body.note ? String(body.note) : null) : existing.note,
      status:
        body.status === "cancelled"
          ? "cancelled"
          : body.status === "confirmed" || !body.status
            ? "confirmed"
            : existing.status || "confirmed",
      updated_at: new Date().toISOString(),
    };

    const { error: updErr } = await db.from("call_bookings").update(updates).eq("id", id);
    if (updErr) throw new Error(updErr.message);

    if (existing.slotId && existing.slotId !== slot.id) {
      await releaseSlot(db, existing.slotId);
    }

    const refreshed = await fetchBookingById(db, id);
    return NextResponse.json({ booking: refreshed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore aggiornamento" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;
    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

    const existing = await fetchBookingById(db, id);
    if (!existing) return NextResponse.json({ error: "Booking non trovato" }, { status: 404 });

    const { error: delErr } = await db.from("call_bookings").delete().eq("id", id);
    if (delErr) throw new Error(delErr.message);
    await releaseSlot(db, existing.slotId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore cancellazione" }, { status: 500 });
  }
}
