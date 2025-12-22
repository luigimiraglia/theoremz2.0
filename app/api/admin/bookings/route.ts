import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const DEFAULT_TUTOR_EMAIL = "luigi.miraglia006@gmail.com";
const DEFAULT_CALL_TYPE = "ripetizione";
const DEFAULT_DURATION_MIN = 60;

type CallTypeRow = { id: string; slug: string; name: string; duration_min: number };
type TutorRow = { id: string; display_name?: string | null; email?: string | null };
type SlotRow = {
  id: string;
  status?: string | null;
  starts_at: string;
  duration_min?: number | null;
  call_type_id?: string | null;
  tutor_id?: string | null;
};

const isAdminEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function getAdminAuth() {
  try {
    const mod = await import("@/lib/firebaseAdmin");
    return mod.adminAuth;
  } catch (err) {
    console.error("[admin/bookings] firebase admin unavailable", err);
    return null;
  }
}

type Viewer = { isAdmin: boolean; tutorId: string | null; email: string | null };

async function resolveViewer(
  request: NextRequest,
  db: ReturnType<typeof supabaseServer>,
): Promise<{ error?: NextResponse; viewer?: Viewer }> {
  if (process.env.NODE_ENV === "development") {
    // In dev prova comunque a leggere il token per derivare tutorId/email reali.
    let email: string | null = null;
    let tutorId: string | null = null;
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (token) {
      const adminAuth = await getAdminAuth();
      if (adminAuth) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          email = decoded.email?.toLowerCase() || null;
          if (email) {
            const { data: tutor } = await db
              .from("tutors")
              .select("id")
              .ilike("email", email)
              .maybeSingle();
            tutorId = tutor?.id || null;
          }
        } catch (err) {
          console.warn("[admin/bookings] dev token decode failed", err);
        }
      }
    }
    return { viewer: { isAdmin: true, tutorId, email } };
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

    const { data: tutor, error: tutorErr } = await db
      .from("tutors")
      .select("id, email")
      .ilike("email", email || "")
      .maybeSingle();
    if (tutorErr) {
      console.error("[admin/bookings] tutor lookup error", tutorErr);
      return { error: NextResponse.json({ error: "auth_error" }, { status: 500 }) };
    }

    if (isAdminEmail(email)) {
      // Admin: prova sempre a risalire al tutor collegato all'email; in fallback usa il primo tutor disponibile.
      let tutorId = tutor?.id || null;
      if (!tutorId) {
        const { data: fallback } = await db
          .from("tutors")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1);
        tutorId = fallback?.[0]?.id || null;
      }
      return { viewer: { isAdmin: true, tutorId, email } };
    }

    if (!tutor) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    return { viewer: { isAdmin: false, tutorId: tutor.id, email } };
  } catch (error) {
    console.error("[admin/bookings] auth error", error);
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
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
    tutorName:
      (slot.tutor?.display_name as string | null) ||
      (slot.tutor?.full_name as string | null) ||
      (slot.tutor?.email as string | null),
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
  // Preferisci il tutor con l'email di default, altrimenti il primo disponibile
  const { data: byEmail, error: byEmailErr } = await db
    .from("tutors")
    .select("id, display_name, email")
    .eq("email", DEFAULT_TUTOR_EMAIL)
    .order("created_at", { ascending: true })
    .limit(1);
  if (byEmailErr) throw new Error(byEmailErr.message);
  if (byEmail && byEmail[0]) return byEmail[0] as TutorRow;

  const { data, error } = await db
    .from("tutors")
    .select("id, display_name, email")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || !data[0]) throw new Error("Nessun tutor configurato");
  return data[0] as TutorRow;
}

async function fetchTutorById(db: ReturnType<typeof supabaseServer>, tutorId: string) {
  const { data, error } = await db
    .from("tutors")
    .select("id, display_name, email")
    .eq("id", tutorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Tutor non trovato");
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
    requireRemaining?: boolean;
    studentId?: string | null;
  },
) {
  const duration =
    Number.isFinite(Number(opts.durationMin)) && Number(opts.durationMin) > 0
      ? Number(opts.durationMin)
      : Number(opts.callType.duration_min);
  if (!duration || Number.isNaN(duration) || duration <= 0) {
    throw new Error("Durata slot non valida");
  }
  const startMs = new Date(opts.startsAtIso).getTime();
  const endMs = startMs + duration * 60000;
  const endIso = new Date(endMs).toISOString();

  if (opts.requireRemaining && opts.studentId) {
    const { data: remainingRow, error: remainingErr } = await db
      .from("black_students")
      .select("hours_paid, hours_consumed")
      .eq("id", opts.studentId)
      .maybeSingle();
    if (remainingErr) throw new Error(remainingErr.message);
    const hoursPaid = Number(remainingRow?.hours_paid ?? 0);
    const hoursConsumed = Number(remainingRow?.hours_consumed ?? 0);
    const remaining = Math.max(0, hoursPaid - hoursConsumed);
    if (remaining <= 0) {
      throw new Error("Ore insufficienti");
    }
  }
  const { data: existing, error } = await db
    .from("call_slots")
    .select("id, status, call_type_id, tutor_id, starts_at, duration_min")
    .eq("tutor_id", opts.tutor.id)
    .gte("starts_at", opts.startsAtIso)
    .lt("starts_at", endIso);
  if (error) throw new Error(error.message);

  let slot: SlotRow | null =
    existing?.find((s: any) => s.starts_at === opts.startsAtIso) || null;
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
        { onConflict: "tutor_id,starts_at", ignoreDuplicates: true },
      )
      .select("id, status, starts_at, duration_min")
      .limit(1);
    if (createErr) throw new Error(createErr.message);
    slot = (created && created[0]) as SlotRow;
  }

  if (!slot) {
    const { data: fallback, error: fallbackErr } = await db
      .from("call_slots")
      .select("id, status, call_type_id, tutor_id, starts_at, duration_min")
      .eq("tutor_id", opts.tutor.id)
      .eq("starts_at", opts.startsAtIso)
      .maybeSingle();
    if (fallbackErr) throw new Error(fallbackErr.message);
    slot = (fallback as SlotRow | null) || null;
  }

  if (!slot) {
    throw new Error("Impossibile recuperare lo slot richiesto");
  }

  const normalizedExisting: Required<SlotRow>[] = (existing || []).map((s) => ({
    id: s.id,
    status: s.status || "available",
    starts_at: s.starts_at,
    duration_min: s.duration_min,
    call_type_id: (s as any).call_type_id,
    tutor_id: (s as any).tutor_id,
  }));

  let overlapSlots = normalizedExisting.filter((s) => {
    const ts = new Date(s.starts_at).getTime();
    const start = new Date(opts.startsAtIso).getTime();
    return ts >= start && ts < endMs;
  });
  if (slot && !overlapSlots.find((s) => s.id === slot?.id)) {
    overlapSlots = [...overlapSlots, slot as Required<SlotRow>];
  }

  if (overlapSlots.some((s) => s.status === "booked" && s.id !== opts.allowSlotId)) {
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
      .limit(1);
    if (updErr) throw new Error(updErr.message);
    return (updated && updated[0]) as SlotRow;
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
    .limit(1);
  if (lockErr) throw new Error(lockErr.message);
  if (!locked || !locked[0]) throw new Error("Slot non disponibile");
  const lockedSlot = locked[0] as SlotRow;

  // blocca anche gli slot sovrapposti ancora disponibili
  const overlapIds = overlapSlots.map((s) => s.id).filter(Boolean);
  if (overlapIds.length) {
    await db
      .from("call_slots")
      .update({
        status: "booked",
        call_type_id: opts.callType.id,
        duration_min: duration,
        updated_at: new Date().toISOString(),
      })
      .in("id", overlapIds)
      .eq("status", "available");
  }

  return lockedSlot;
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
          tutor:tutors ( id, display_name, full_name, email )
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
    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }

    const { error: authError, viewer } = await resolveViewer(request, db);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const meta = searchParams.get("meta") === "1";
    const requestedTutorId = searchParams.get("tutorId");
    let effectiveTutorId = viewer?.isAdmin
      ? requestedTutorId && requestedTutorId !== "all"
        ? requestedTutorId
        : viewer?.tutorId || null
      : viewer?.tutorId || null;
    if (!effectiveTutorId && viewer?.isAdmin) {
      const { data: fallback } = await db
        .from("tutors")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1);
      effectiveTutorId = fallback?.[0]?.id || null;
    }
    const tutorFilter = effectiveTutorId;
    const includeTutorSummary = meta && viewer && effectiveTutorId;

    let query = db
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
          tutor:tutors ( id, display_name, full_name, email )
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

    if (tutorFilter) {
      query = query.eq("tutor_id", tutorFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const bookings = (data || []).map(mapBooking).filter(Boolean);

    if (!meta) {
      return NextResponse.json({ bookings });
    }

    const tutorsQuery = viewer?.isAdmin
      ? db.from("tutors").select("id, display_name, full_name, email").order("display_name", { ascending: true })
      : db
          .from("tutors")
          .select("id, display_name, full_name, email, hours_due")
          .eq("id", viewer?.tutorId || "")
          .limit(1);

    const [{ data: callTypes, error: ctErr }, { data: tutors, error: tutorErr }, tutorSummary] =
      await Promise.all([
        db.from("call_types").select("id, slug, name, duration_min, active").eq("active", true),
        tutorsQuery,
        (async () => {
          if (!includeTutorSummary) return null;
          try {
            const [tutorRes, studentsRes, assignedRes] = await Promise.all([
              db.from("tutors").select("hours_due").eq("id", effectiveTutorId || "").maybeSingle(),
              db
                .from("black_students")
                .select(
                  "id, student_email, parent_email, student_phone, parent_phone, hours_paid, hours_consumed, preferred_name, status, profiles:profiles!black_students_user_id_fkey(full_name, stripe_price_id)"
                )
                .eq("videolesson_tutor_id", effectiveTutorId || "")
                .order("start_date", { ascending: true })
                .limit(200),
              db
                .from("tutor_assignments")
                .select(
                  "student_id, hourly_rate, consumed_baseline, black_students!inner(id, student_email, parent_email, student_phone, parent_phone, hours_paid, hours_consumed, preferred_name, status, profiles:profiles!black_students_user_id_fkey(full_name, stripe_price_id))"
                )
                .eq("tutor_id", effectiveTutorId || "")
                .limit(300),
            ]);

            const map = new Map<string, any>();
            const rateMap = new Map<string, number | null>();
            const baselineMap = new Map<string, number | null>();
            (studentsRes.data || []).forEach((s: any) => {
              if (s?.id) map.set(s.id, s);
            });
            (assignedRes.data || []).forEach((row: any) => {
              const s = row?.black_students;
              if (s?.id && !map.has(s.id)) {
                map.set(s.id, s);
              }
              if (s?.id) {
                rateMap.set(s.id, row?.hourly_rate != null ? Number(row.hourly_rate) : null);
                baselineMap.set(
                  s.id,
                  row?.consumed_baseline != null ? Number(row.consumed_baseline) : 0,
                );
              }
            });

            const students = Array.from(map.values()).map((s: any) => {
              const profile = Array.isArray(s?.profiles) ? s.profiles[0] : s?.profiles;
              const displayName =
                s?.preferred_name ||
                profile?.full_name ||
                s?.student_email ||
                s?.parent_email ||
                "Studente";
              const hoursPaid = Number(s?.hours_paid ?? 0);
              const hoursConsumed = Number(s?.hours_consumed ?? 0);
              const hourlyRate = rateMap.get(s?.id) ?? null;
              const consumedBaseline = baselineMap.get(s?.id) ?? 0;
              const chargeableHours = Math.max(0, hoursConsumed - consumedBaseline);
              const isBlack = Boolean(
                profile?.stripe_price_id ||
                  (typeof s?.status === "string" && s.status.toLowerCase() !== "inactive")
              );
              const emails = [s?.student_email, s?.parent_email]
                .filter(Boolean)
                .map((v: string) => v.toLowerCase());
              return {
                id: s?.id as string,
                name: displayName,
                email: (s?.student_email as string | null) || (s?.parent_email as string | null) || null,
                phone: (s?.student_phone as string | null) || (s?.parent_phone as string | null) || null,
                hoursPaid,
                hoursConsumed,
                hourlyRate,
                consumedBaseline,
                chargeableHours,
                remainingPaid: Math.max(0, hoursPaid),
                isBlack,
                emails,
              };
            });

            return {
              hoursDue: Number(tutorRes.data?.hours_due ?? 0),
              students,
            };
          } catch (summaryErr) {
            console.error("[admin/bookings] tutor summary error", summaryErr);
            return null;
          }
        })(),
      ]);
    if (ctErr) throw new Error(ctErr.message);
    if (tutorErr) throw new Error(tutorErr.message);

    let bookingsWithStudents = bookings;
    if (Array.isArray(tutorSummary?.students) && tutorSummary.students.length) {
      bookingsWithStudents = bookings.map((b) => {
        const match = tutorSummary.students.find((s: any) => {
          const email = (b.email || "").toLowerCase();
          if (!email) return false;
          if (Array.isArray(s.emails) && s.emails.some((e: string) => e && e.toLowerCase() === email)) {
            return true;
          }
          const studentEmail = (s.email || "").toLowerCase();
          return studentEmail && email === studentEmail;
        });
        return match
          ? {
              ...b,
              studentId: match.id,
              remainingPaid: match.remainingPaid,
            }
          : b;
      });
    }

    return NextResponse.json({
      bookings: bookingsWithStudents,
      callTypes: callTypes || [],
      tutors: tutors || [],
      currentTutorId: effectiveTutorId || null,
      viewerIsAdmin: Boolean(viewer?.isAdmin),
      tutorSummary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore prenotazioni" }, { status: 500 });
  }
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
    const startsAtIso = normalizeIso(body.startsAt);
    if (!startsAtIso) return NextResponse.json({ error: "Data/ora non valida" }, { status: 400 });

    const forceRipetizione = !(viewer?.isAdmin);
    const callTypeSlug = forceRipetizione ? DEFAULT_CALL_TYPE : String(body.callTypeSlug || "onboarding");
    const durationMinutes = forceRipetizione ? DEFAULT_DURATION_MIN : body.durationMin;

    const callType = await fetchCallType(db, callTypeSlug);
    const tutor = viewer?.isAdmin
      ? await fetchDefaultTutor(db, body.tutorId)
      : await fetchTutorById(db, viewer?.tutorId || "");
    const status =
      body.status === "cancelled"
        ? "cancelled"
        : body.status === "completed"
          ? "completed"
          : "confirmed";

    const slot = await ensureBookableSlot(db, {
      startsAtIso,
      callType,
      tutor,
      durationMin: durationMinutes,
      requireRemaining: true,
      studentId: body.studentId || null,
    });

    const payload = {
      slot_id: slot.id,
      call_type_id: callType.id,
      tutor_id: tutor.id,
      full_name: String(body.fullName || body.name || "Senza nome"),
      email: String(body.email || "noreply@theoremz.com"),
      note: body.note ? String(body.note) : null,
      user_id: body.userId ? String(body.userId) : null,
      status,
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
          tutor:tutors ( id, display_name, full_name, email )
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
    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }
    const { error: authError, viewer } = await resolveViewer(request, db);
    if (authError) return authError;
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

    const existing = await fetchBookingById(db, id);
    if (!existing) return NextResponse.json({ error: "Booking non trovato" }, { status: 404 });
    if (!viewer?.isAdmin && viewer?.tutorId && existing.tutorId !== viewer.tutorId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const forceRipetizione = !(viewer?.isAdmin);
    const callTypeSlug = forceRipetizione ? DEFAULT_CALL_TYPE : (body.callTypeSlug || existing.callType || "onboarding");
    const forcedDuration = forceRipetizione ? DEFAULT_DURATION_MIN : (body.durationMin || existing.durationMin);
    const callType = await fetchCallType(db, String(callTypeSlug));
    const tutor = viewer?.isAdmin
      ? await fetchDefaultTutor(db, body.tutorId || existing.tutorId)
      : await fetchTutorById(db, viewer?.tutorId || existing.tutorId || "");

    const startsAtIso = normalizeIso(body.startsAt || existing.startsAt);
    if (!startsAtIso) return NextResponse.json({ error: "Data/ora non valida" }, { status: 400 });

    const slot = await ensureBookableSlot(db, {
      startsAtIso,
      callType,
      tutor,
      durationMin: forcedDuration,
      allowSlotId: existing.slotId || null,
      requireRemaining: true,
      studentId: body.studentId || null,
    });

    const updates: Record<string, any> = {
      slot_id: slot.id,
      call_type_id: callType.id,
      tutor_id: tutor.id,
      full_name: String(body.fullName || body.name || existing.fullName || "Senza nome"),
      email: String(body.email || existing.email || "noreply@theoremz.com"),
      note: body.note !== undefined ? (body.note ? String(body.note) : null) : existing.note,
      status:
        body.status === "completed"
          ? "completed"
          : body.status === "cancelled"
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
    const db = supabaseServer();
    if (!db) {
      return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
    }
    const { error: authError, viewer } = await resolveViewer(request, db);
    if (authError) return authError;
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

    const existing = await fetchBookingById(db, id);
    if (!existing) return NextResponse.json({ error: "Booking non trovato" }, { status: 404 });
    if (!viewer?.isAdmin && viewer?.tutorId && existing.tutorId !== viewer.tutorId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (existing.status === "completed") {
      return NextResponse.json(
        { error: "Non puoi cancellare una lezione completata" },
        { status: 400 },
      );
    }

    const { error: delErr } = await db.from("call_bookings").delete().eq("id", id);
    if (delErr) throw new Error(delErr.message);
    await releaseSlot(db, existing.slotId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Errore cancellazione" }, { status: 500 });
  }
}
