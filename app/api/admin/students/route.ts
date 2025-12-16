import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) => Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return { email: null };
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase() || null;
    if (!email || !isAdminEmail(email)) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    return { email };
  } catch (err) {
    console.error("[admin/students] auth error", err);
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  try {
    const { data, error } = await db
      .from("black_students")
      .select(
        `
        id,
        preferred_name,
        student_email,
        parent_email,
        student_phone,
        parent_phone,
        hours_paid,
        hours_consumed,
        status,
        videolesson_tutor_id,
        tutor:tutors!black_students_videolesson_tutor_id_fkey(id, display_name, full_name, email)
      `,
      )
      .not("videolesson_tutor_id", "is", null)
      .order("preferred_name", { ascending: true });
    if (error) throw error;
    const students = (data || []).map((s: any) => {
      const tutor = s?.tutor;
      const hoursPaid = Number(s?.hours_paid ?? 0);
      const hoursConsumed = Number(s?.hours_consumed ?? 0);
      const remaining = Math.max(0, hoursPaid, hoursPaid - hoursConsumed);
      return {
        id: s?.id as string,
        name:
          s?.preferred_name ||
          tutor?.full_name ||
          s?.student_email ||
          s?.parent_email ||
          "Studente",
        email: s?.student_email || s?.parent_email || null,
        phone: s?.student_phone || s?.parent_phone || null,
        tutorId: tutor?.id || s?.videolesson_tutor_id || null,
        tutorName: tutor?.display_name || tutor?.full_name || tutor?.email || null,
        hoursPaid,
        hoursConsumed,
        remainingPaid: remaining,
        isBlack: (s?.status || "").toLowerCase() !== "inactive",
      };
    });
    return NextResponse.json({ students });
  } catch (err: any) {
    console.error("[admin/students] unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore elenco studenti" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  try {
    const body = await request.json().catch(() => ({}));
    const studentId = String(body.studentId || "").trim();
    const hours = Number(body.hours);
    if (!studentId) return NextResponse.json({ error: "studentId mancante" }, { status: 400 });
    if (!Number.isFinite(hours) || hours <= 0) {
      return NextResponse.json({ error: "Ore non valide" }, { status: 400 });
    }
    const { data: student, error: studentErr } = await db
      .from("black_students")
      .select("id, hours_paid")
      .eq("id", studentId)
      .maybeSingle();
    if (studentErr) return NextResponse.json({ error: studentErr.message }, { status: 500 });
    if (!student) return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
    const nextPaid = Number(student.hours_paid ?? 0) + hours;
    const { error: updErr, data: updated } = await db
      .from("black_students")
      .update({ hours_paid: nextPaid })
      .eq("id", studentId)
      .select("id, hours_paid, hours_consumed")
      .maybeSingle();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    const remaining = Math.max(
      0,
      Number(updated?.hours_paid ?? 0),
      Number(updated?.hours_paid ?? 0) - Number(updated?.hours_consumed ?? 0),
    );
    return NextResponse.json({ ok: true, hoursPaid: updated?.hours_paid ?? nextPaid, remainingPaid: remaining });
  } catch (err: any) {
    console.error("[admin/students] add hours error", err);
    return NextResponse.json({ error: err?.message || "Errore aggiornamento ore" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  try {
    const body = await request.json().catch(() => ({}));
    const studentId = String(body.studentId || "").trim();
    if (!studentId) return NextResponse.json({ error: "studentId mancante" }, { status: 400 });

    const name = (body.name || body.preferredName || "").trim();
    const email = (body.email || body.studentEmail || body.parentEmail || "").trim().toLowerCase();
    const phone = (body.phone || body.studentPhone || body.parentPhone || "").trim();
    const tutorId = body.tutorId ? String(body.tutorId).trim() : null;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name) updates.preferred_name = name;
    if (email) {
      updates.student_email = email;
      updates.parent_email = email;
    }
    if (phone) {
      updates.student_phone = phone;
      updates.parent_phone = phone;
    }
    if (tutorId) updates.videolesson_tutor_id = tutorId;

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    if (tutorId) {
      const { data: tutor, error: tutorErr } = await db
        .from("tutors")
        .select("id, display_name, full_name, email")
        .eq("id", tutorId)
        .maybeSingle();
      if (tutorErr) return NextResponse.json({ error: tutorErr.message }, { status: 500 });
      if (!tutor) return NextResponse.json({ error: "Tutor non trovato" }, { status: 404 });
      await db
        .from("tutor_assignments")
        .upsert(
          { tutor_id: tutorId, student_id: studentId, role: "videolezione" },
          { onConflict: "tutor_id,student_id" },
        );
    }

    const { data: updated, error: updErr } = await db
      .from("black_students")
      .update(updates)
      .eq("id", studentId)
      .select(
        `
        id,
        preferred_name,
        student_email,
        parent_email,
        student_phone,
        parent_phone,
        hours_paid,
        hours_consumed,
        status,
        videolesson_tutor_id,
        tutor:tutors!black_students_videolesson_tutor_id_fkey(id, display_name, full_name, email)
      `,
      )
      .maybeSingle();

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    if (!updated) return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });

    const tutor = (updated as any)?.tutor;
    const hoursPaid = Number((updated as any)?.hours_paid ?? 0);
    const hoursConsumed = Number((updated as any)?.hours_consumed ?? 0);
    const remaining = Math.max(0, hoursPaid, hoursPaid - hoursConsumed);
    return NextResponse.json({
      student: {
        id: updated.id as string,
        name:
          (updated as any)?.preferred_name ||
          tutor?.full_name ||
          (updated as any)?.student_email ||
          (updated as any)?.parent_email ||
          "Studente",
        email: (updated as any)?.student_email || (updated as any)?.parent_email || null,
        phone: (updated as any)?.student_phone || (updated as any)?.parent_phone || null,
        tutorId: tutor?.id || (updated as any)?.videolesson_tutor_id || null,
        tutorName: tutor?.display_name || tutor?.full_name || tutor?.email || null,
        hoursPaid,
        hoursConsumed,
        remainingPaid: remaining,
        isBlack: ((updated as any)?.status || "").toLowerCase() !== "inactive",
      },
    });
  } catch (err: any) {
    console.error("[admin/students] patch error", err);
    return NextResponse.json({ error: err?.message || "Errore aggiornamento studente" }, { status: 500 });
  }
}
