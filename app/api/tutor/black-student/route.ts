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
  } catch (err) {
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
        readiness,
        risk_level,
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
        readiness: data.readiness,
        risk: data.risk_level,
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
