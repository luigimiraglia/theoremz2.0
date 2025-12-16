import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) => Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function resolveViewer(request: NextRequest, db: ReturnType<typeof supabaseServer>) {
  if (process.env.NODE_ENV === "development") {
    const token = request.headers.get("authorization")?.replace(/^Bearer /i, "") || null;
    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const email = decoded.email?.toLowerCase() || null;
        if (email) {
          const { data: tutor } = await db.from("tutors").select("id").ilike("email", email).maybeSingle();
          return { email, tutorId: tutor?.id || null, isAdmin: isAdminEmail(email) };
        }
      } catch (err) {
        console.warn("[bookings/complete] dev token decode failed", err);
      }
    }
    return { email: null, tutorId: null, isAdmin: true };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer /i, "") || null;
  if (!token) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase() || null;
    if (!email) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
    const { data: tutor, error: tutorErr } = await db.from("tutors").select("id").ilike("email", email).maybeSingle();
    if (tutorErr) {
      console.error("[bookings/complete] tutor lookup error", tutorErr);
      return { error: NextResponse.json({ error: "auth_error" }, { status: 500 }) };
    }
    const isAdmin = isAdminEmail(email);
    if (!tutor && !isAdmin) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    return { email, tutorId: tutor?.id || null, isAdmin };
  } catch (err) {
    console.error("[bookings/complete] auth error", err);
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
}

export async function POST(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const { error: authError, tutorId: viewerTutorId, isAdmin } = await resolveViewer(request, db);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    const bodyStudentId = String(body.studentId || "").trim() || null;
    if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

    const { data: booking, error: bookingErr } = await db
      .from("call_bookings")
      .select(
        `
        id,
        tutor_id,
        email,
        full_name,
        status,
        slot:call_slots ( id, starts_at, duration_min )
      `,
      )
      .eq("id", id)
      .maybeSingle();
    if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 500 });
    if (!booking) return NextResponse.json({ error: "Booking non trovato" }, { status: 404 });
    if (!isAdmin && viewerTutorId && booking.tutor_id !== viewerTutorId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if ((booking.status || "").toLowerCase() === "completed") {
      return NextResponse.json({ error: "Booking già segnato come effettuato" }, { status: 409 });
    }

    const durationMin =
      Number(body.hours) > 0
        ? Number(body.hours) * 60
        : Number(booking.slot?.duration_min) > 0
          ? Number(booking.slot.duration_min)
          : 60;
    const hours = Math.max(0.25, Number(durationMin) / 60);

    // Best-effort student match via email
    let studentId: string | null = null;
    let hoursPaid = 0;
    let hoursConsumed = 0;
    if (bodyStudentId) {
      const { data: student, error: studentErr } = await db
        .from("black_students")
        .select("id, hours_paid, hours_consumed, videolesson_tutor_id")
        .eq("id", bodyStudentId)
        .maybeSingle();
      if (studentErr) return NextResponse.json({ error: studentErr.message }, { status: 500 });
      if (!student) return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
      if (!isAdmin && viewerTutorId && student.videolesson_tutor_id && student.videolesson_tutor_id !== viewerTutorId) {
        return NextResponse.json({ error: "Studente non assegnato a te" }, { status: 403 });
      }
      studentId = student.id;
      hoursPaid = Number(student.hours_paid ?? 0);
      hoursConsumed = Number(student.hours_consumed ?? 0);
    } else if (booking.email) {
      const normalizedEmail = booking.email.toLowerCase();
      const { data: student, error: studentErr } = await db
        .from("black_students")
        .select("id, hours_paid, hours_consumed, videolesson_tutor_id")
        .or(
          `student_email.ilike.${normalizedEmail},parent_email.ilike.${normalizedEmail}`
        )
        .maybeSingle();
      if (studentErr) return NextResponse.json({ error: studentErr.message }, { status: 500 });
      if (student) {
        if (!isAdmin && viewerTutorId && student.videolesson_tutor_id && student.videolesson_tutor_id !== viewerTutorId) {
          return NextResponse.json({ error: "Studente non assegnato a te" }, { status: 403 });
        }
        studentId = student.id;
        hoursPaid = Number(student.hours_paid ?? 0);
        hoursConsumed = Number(student.hours_consumed ?? 0);
      }
    }

    // Fallback: prendi uno studente assegnato al tutor con ore > 0
    if (!studentId && booking.tutor_id) {
      const candidatesMap = new Map<string, { id: string; hours_paid: number; hours_consumed: number; videolesson_tutor_id: string | null }>();
      const { data: direct } = await db
        .from("black_students")
        .select("id, hours_paid, hours_consumed, videolesson_tutor_id")
        .eq("videolesson_tutor_id", booking.tutor_id);
      (direct || []).forEach((s) => {
        if (s?.id) {
          candidatesMap.set(s.id, {
            id: s.id,
            hours_paid: Number(s.hours_paid ?? 0),
            hours_consumed: Number(s.hours_consumed ?? 0),
            videolesson_tutor_id: s.videolesson_tutor_id || null,
          });
        }
      });
      const { data: assigned } = await db
        .from("tutor_assignments")
        .select("student_id, black_students!inner(id, hours_paid, hours_consumed, videolesson_tutor_id)")
        .eq("tutor_id", booking.tutor_id);
      (assigned || []).forEach((row: any) => {
        const s = row?.black_students;
        if (s?.id && !candidatesMap.has(s.id)) {
          candidatesMap.set(s.id, {
            id: s.id,
            hours_paid: Number(s.hours_paid ?? 0),
            hours_consumed: Number(s.hours_consumed ?? 0),
            videolesson_tutor_id: s.videolesson_tutor_id || null,
          });
        }
      });
      const candidates = Array.from(candidatesMap.values()).filter((c) => Number(c.hours_paid) > 0);
      if (candidates.length) {
        const best = candidates.sort((a, b) => Number(b.hours_paid) - Number(a.hours_paid))[0];
        studentId = best.id;
        hoursPaid = Number(best.hours_paid ?? 0);
        hoursConsumed = Number(best.hours_consumed ?? 0);
      }
    }

    if (!studentId) {
      return NextResponse.json({ error: "Nessuno studente collegato alla lezione" }, { status: 409 });
    }

    const availableHours = Math.max(0, hoursPaid);
    const hoursToDeduct = Math.min(hours, availableHours);
    if (hoursToDeduct <= 0) {
      return NextResponse.json({ error: "Ore disponibili esaurite per lo studente" }, { status: 409 });
    }

    // Update tutor hours_due
    const { data: tutorRow, error: tutorErr } = await db
      .from("tutors")
      .select("hours_due")
      .eq("id", booking.tutor_id)
      .maybeSingle();
    if (tutorErr) return NextResponse.json({ error: tutorErr.message }, { status: 500 });
    const currentDue = Number(tutorRow?.hours_due ?? 0);
    await db.from("tutors").update({ hours_due: currentDue + hoursToDeduct }).eq("id", booking.tutor_id);

    // Scala ore allo studente
    await db
      .from("black_students")
      .update({
        hours_consumed: hoursConsumed + hoursToDeduct,
        hours_paid: Math.max(0, hoursPaid - hoursToDeduct),
      })
      .eq("id", studentId);

    // Log tutor session
    const happenedAt =
      booking.slot?.starts_at ||
      new Date().toISOString().slice(0, 10);
    await db.from("tutor_sessions").insert({
      tutor_id: booking.tutor_id,
      student_id: studentId,
      duration: hoursToDeduct,
      happened_at: happenedAt.slice(0, 10),
      note: booking.full_name || null,
    });

    // Update booking status
    await db.from("call_bookings").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({
      ok: true,
      hours,
      tutorId: booking.tutor_id,
      studentId,
    });
  } catch (err: any) {
    console.error("[bookings/complete] unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore completamento" }, { status: 500 });
  }
}
