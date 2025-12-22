import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) => Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function resolveTutorId(email: string, db: ReturnType<typeof supabaseServer>) {
  const { data, error } = await db
    .from("tutors")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id || null;
}

export async function GET(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const studentId = (searchParams.get("studentId") || "").trim();
  if (!studentId) return NextResponse.json({ error: "studentId mancante" }, { status: 400 });

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let viewerEmail: string | null = null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    viewerEmail = decoded.email?.toLowerCase() || null;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isAdmin = isAdminEmail(viewerEmail);
  let viewerTutorId: string | null = null;
  if (!isAdmin && viewerEmail) {
    try {
      viewerTutorId = await resolveTutorId(viewerEmail, db);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || "Errore lookup tutor" }, { status: 500 });
    }
    if (!viewerTutorId) {
      return NextResponse.json({ error: "Tutor non autorizzato" }, { status: 403 });
    }
  }

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
        year_class,
        track,
        start_date,
        goal,
        difficulty_focus,
        next_assessment_subject,
        next_assessment_date,
        ai_description,
        status,
        last_contacted_at,
        hours_paid,
        hours_consumed,
        videolesson_tutor_id,
        tutor_assignments!left(hourly_rate, tutor_id)
      `,
      )
      .eq("id", studentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });

    const hourlyRate = Array.isArray((data as any)?.tutor_assignments)
      ? (data as any).tutor_assignments[0]?.hourly_rate ?? null
      : (data as any)?.tutor_assignments?.hourly_rate ?? null;
    const assignmentTutorId = Array.isArray((data as any)?.tutor_assignments)
      ? (data as any).tutor_assignments[0]?.tutor_id ?? null
      : (data as any)?.tutor_assignments?.tutor_id ?? null;

    if (
      !isAdmin &&
      viewerTutorId &&
      data.videolesson_tutor_id &&
      data.videolesson_tutor_id !== viewerTutorId &&
      assignmentTutorId !== viewerTutorId
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const hoursPaid = Number(data.hours_paid ?? 0);
    const hoursConsumed = Number(data.hours_consumed ?? 0);
    const remainingPaid = Math.max(0, hoursPaid, hoursPaid - hoursConsumed);

    return NextResponse.json({
      student: {
        id: data.id,
        name:
          data.preferred_name ||
          data.student_email ||
          data.parent_email ||
          "Studente",
        email: data.student_email || data.parent_email || null,
        phone: data.student_phone || data.parent_phone || null,
        yearClass: data.year_class,
        track: data.track,
        startDate: data.start_date,
        goal: data.goal,
        difficultyFocus: data.difficulty_focus,
        nextAssessmentSubject: data.next_assessment_subject,
        nextAssessmentDate: data.next_assessment_date,
        aiDescription: data.ai_description,
        status: data.status,
        lastContactedAt: data.last_contacted_at,
        hoursPaid,
        hoursConsumed,
        remainingPaid,
        hourlyRate: hourlyRate != null ? Number(hourlyRate) : null,
      },
    });
  } catch (err: any) {
    console.error("[tutor/black-student] unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore scheda studente" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let viewerEmail: string | null = null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    viewerEmail = decoded.email?.toLowerCase() || null;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const goal = typeof body.goal === "string" ? body.goal.trim() : undefined;
  const difficultyFocus =
    typeof body.difficultyFocus === "string" ? body.difficultyFocus.trim() : undefined;
  const aiDescription =
    typeof body.aiDescription === "string" ? body.aiDescription.trim() : undefined;
  if (!studentId) return NextResponse.json({ error: "studentId mancante" }, { status: 400 });
  if (!name && goal === undefined && difficultyFocus === undefined && aiDescription === undefined) {
    return NextResponse.json({ error: "nessun campo da aggiornare" }, { status: 400 });
  }

  try {
    const { data: student, error } = await db
      .from("black_students")
      .select("id, preferred_name, student_email, parent_email, student_phone, parent_phone, videolesson_tutor_id, tutor_assignments(tutor_id)")
      .eq("id", studentId)
      .maybeSingle();
    if (error) throw error;
    if (!student) return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });

    const assignmentTutorId = Array.isArray((student as any)?.tutor_assignments)
      ? (student as any).tutor_assignments[0]?.tutor_id ?? null
      : (student as any)?.tutor_assignments?.tutor_id ?? null;
    const isAdmin = isAdminEmail(viewerEmail);

    if (
      !isAdmin &&
      viewerEmail &&
      student.videolesson_tutor_id &&
      student.videolesson_tutor_id !== (await resolveTutorId(viewerEmail, db)) &&
      assignmentTutorId !== (await resolveTutorId(viewerEmail, db))
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name) patch.preferred_name = name;
    if (goal !== undefined) patch.goal = goal || null;
    if (difficultyFocus !== undefined) patch.difficulty_focus = difficultyFocus || null;
    if (aiDescription !== undefined) patch.ai_description = aiDescription || null;

    const { error: updErr, data: updated } = await db
      .from("black_students")
      .update(patch)
      .eq("id", studentId)
      .select("id, preferred_name, goal, difficulty_focus, ai_description")
      .maybeSingle();
    if (updErr) throw updErr;
    return NextResponse.json({ student: updated });
  } catch (err: any) {
    console.error("[tutor/black-student] update error", err);
    return NextResponse.json({ error: err?.message || "Errore aggiornamento nome" }, { status: 500 });
  }
}
