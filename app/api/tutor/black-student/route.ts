import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { adminAuth } from "@/lib/firebaseAdmin";
import { deriveOperationalStatus } from "@/lib/billingStatus";
import { normalizeStudentPhone } from "@/lib/students";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) => Boolean(email && email.toLowerCase() === ADMIN_EMAIL);
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type DbClient = ReturnType<typeof supabaseServer>;

type BlackStudentRow = {
  id: string;
  user_id: string | null;
  year_class: string | null;
  track: string | null;
  start_date: string | null;
  preferred_name: string | null;
  parent_name: string | null;
  student_email: string | null;
  parent_email: string | null;
  student_phone: string | null;
  parent_phone: string | null;
  goal: string | null;
  difficulty_focus: string | null;
  initial_avg: number | null;
  readiness: number | null;
  risk_level: string | null;
  ai_description: string | null;
  next_assessment_subject: string | null;
  next_assessment_date: string | null;
  status: string | null;
  tutor_id: string | null;
  last_contacted_at: string | null;
  last_active_at: string | null;
  videolesson_tutor_id: string | null;
  hours_paid: number | null;
  hours_consumed: number | null;
  tutor_assignments?: Array<{ tutor_id?: string | null }> | { tutor_id?: string | null } | null;
};

type TutorAssignmentRow = {
  tutor_id: string | null;
  role: string | null;
  hours_allocated: number | null;
  hourly_rate: number | null;
};

type ContactLogRow = {
  contacted_at: string | null;
  body: string | null;
  author_label: string | null;
  source: string | null;
  readiness_snapshot?: number | null;
};

async function resolveTutorId(email: string, db: DbClient) {
  const { data, error } = await db
    .from("tutors")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id || null;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeEmail(value?: string | null) {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function hasOwn(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeOptionalDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data prossima verifica non valida");
  }
  return trimmed.slice(0, 10);
}

function normalizeOptionalGenericDate(value: unknown, message: string) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(message);
  }
  return trimmed.slice(0, 10);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isFutureDateOnly(value?: string | null) {
  if (!value) return false;
  return value > todayDateString();
}

function buildStripeCustomerUrl(customerId?: string | null) {
  if (!customerId) return null;
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  const isLive = stripeKey.startsWith("sk_live_");
  return `https://dashboard.stripe.com${isLive ? "" : "/test"}/customers/${customerId}`;
}

function formatOverviewLine(label: string, value?: string | number | null) {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return `${label}: ${trimmed}`;
  }
  if (!Number.isFinite(value)) return null;
  return `${label}: ${value}`;
}

function dayDiff(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

function formatOverviewDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

function formatContactLogForPrompt(log: ContactLogRow) {
  const note = normalizeOptionalString(log.body)?.replace(/\s+/g, " ") || "Nessuna nota";
  const author = normalizeOptionalString(log.author_label) || "Sconosciuto";
  const source = normalizeOptionalString(log.source) || "non specificata";
  const readiness =
    log.readiness_snapshot != null && Number.isFinite(log.readiness_snapshot)
      ? ` | readiness: ${log.readiness_snapshot}`
      : "";
  return `- ${formatOverviewDate(log.contacted_at) || "data sconosciuta"} | autore: ${author} | source: ${source}${readiness} | nota: ${note}`;
}

function buildContactFrequencySummary(logs: ContactLogRow[]) {
  const now = new Date();
  const dates = logs
    .map((log) => (log.contacted_at ? new Date(log.contacted_at) : null))
    .filter((date): date is Date => Boolean(date) && !Number.isNaN(date!.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const total = logs.length;
  if (!dates.length) {
    return [
      "Contatti totali registrati: 0",
      "Frequenza contatti: nessun contatto registrato",
    ].join("\n");
  }

  const last = dates[dates.length - 1];
  const first = dates[0];
  const last30 = dates.filter((date) => dayDiff(date, now) <= 30).length;
  const last60 = dates.filter((date) => dayDiff(date, now) <= 60).length;
  const last90 = dates.filter((date) => dayDiff(date, now) <= 90).length;
  const gaps = dates.slice(1).map((date, index) => dayDiff(dates[index], date));
  const averageGap =
    gaps.length > 0
      ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
      : null;
  const monthlyCadence =
    dates.length > 1
      ? (total / Math.max(1, dayDiff(first, last))) * 30
      : last30;

  return [
    `Contatti totali registrati: ${total}`,
    `Primo contatto registrato: ${formatOverviewDate(first.toISOString())}`,
    `Ultimo contatto registrato: ${formatOverviewDate(last.toISOString())}`,
    `Giorni trascorsi dall'ultimo contatto: ${Math.max(0, Math.floor(dayDiff(last, now)))}`,
    `Contatti negli ultimi 30 giorni: ${last30}`,
    `Contatti negli ultimi 60 giorni: ${last60}`,
    `Contatti negli ultimi 90 giorni: ${last90}`,
    averageGap != null
      ? `Intervallo medio tra contatti: ${averageGap.toFixed(1)} giorni`
      : "Intervallo medio tra contatti: non disponibile",
    `Frequenza media stimata: ${monthlyCadence.toFixed(1)} contatti ogni 30 giorni`,
  ].join("\n");
}

function extractAssignmentTutorId(student: BlackStudentRow) {
  if (Array.isArray(student?.tutor_assignments)) {
    return student.tutor_assignments[0]?.tutor_id ?? null;
  }
  return student?.tutor_assignments?.tutor_id ?? null;
}

async function fetchBlackStudent(db: DbClient, studentId: string) {
  const { data, error } = await db
    .from("students")
    .select(
      `
      id,
      user_id,
      year_class,
      track,
      start_date,
      preferred_name,
      parent_name,
      student_email,
      parent_email,
      student_phone,
      parent_phone,
      goal,
      difficulty_focus,
      initial_avg,
      readiness,
      risk_level,
      ai_description,
      next_assessment_subject,
      next_assessment_date,
      status,
      tutor_id,
      last_contacted_at,
      last_active_at,
      videolesson_tutor_id,
      hours_paid,
      hours_consumed,
      tutor_assignments!left(tutor_id)
    `,
    )
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw error;
  return (data as BlackStudentRow | null) || null;
}

async function ensureLinkedStudent(db: DbClient, student: BlackStudentRow) {
  return { id: student.id };
}

async function loadCanonicalStudent(db: DbClient, studentId?: string | null) {
  if (!studentId) return null;
  const { data, error } = await db
    .from("students")
    .select("id, full_name, email, phone, current_average")
    .eq("id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadBillingProfile(
  db: DbClient,
  userId?: string | null,
  emailCandidates: Array<string | null | undefined> = [],
) {
  if (userId) {
    const { data, error } = await db
      .from("profiles")
      .select(
        "id, full_name, email, stripe_customer_id, stripe_subscription_status, stripe_cancel_at_period_end, stripe_current_period_end",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const normalizedEmails = Array.from(
    new Set(emailCandidates.map((value) => normalizeEmail(value)).filter(Boolean)),
  );

  for (const email of normalizedEmails) {
    const { data, error } = await db
      .from("profiles")
      .select(
        "id, full_name, email, stripe_customer_id, stripe_subscription_status, stripe_cancel_at_period_end, stripe_current_period_end",
      )
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  return null;
}

async function loadTutorAssignment(
  db: DbClient,
  blackStudentId: string,
  preferredTutorId?: string | null,
) {
  const { data, error } = await db
    .from("tutor_assignments")
    .select("tutor_id, role, hours_allocated, hourly_rate")
    .eq("student_id", blackStudentId);
  if (error) throw error;
  const rows = (data as TutorAssignmentRow[] | null) || [];
  if (!rows.length) return null;
  if (preferredTutorId) {
    const exact = rows.find((row) => row.tutor_id === preferredTutorId);
    if (exact) return exact;
  }
  const videolesson = rows.find((row) => (row.role || "").toLowerCase() === "videolezione");
  return videolesson || rows[0];
}

async function loadTutorMeta(db: DbClient, tutorId?: string | null) {
  if (!tutorId) return null;
  const { data, error } = await db
    .from("tutors")
    .select("id, full_name, email, phone")
    .eq("id", tutorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadContactLogs(db: DbClient, blackStudentId: string) {
  const { data, error } = await db
    .from("black_contact_logs")
    .select("contacted_at, body, author_label, source, readiness_snapshot")
    .eq("student_id", blackStudentId)
    .order("contacted_at", { ascending: true });
  if (error) throw error;
  return (data as ContactLogRow[] | null) || [];
}

async function resolveAuthorLabel(
  db: DbClient,
  viewerEmail: string | null,
  viewerTutorId: string | null,
  isAdmin: boolean,
) {
  if (viewerTutorId) {
    const tutor = await loadTutorMeta(db, viewerTutorId);
    if (tutor?.full_name) return tutor.full_name;
    if (tutor?.email) return tutor.email;
  }
  if (viewerEmail) return viewerEmail;
  return isAdmin ? "admin" : "tutor";
}

async function loadStudentProfile(db: DbClient, studentId?: string | null, userId?: string | null) {
  if (studentId) {
    const { data, error } = await db
      .from("student_profiles")
      .select("user_id, email, media_attuale")
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  if (!userId) return null;
  const { data, error } = await db
    .from("student_profiles")
    .select("user_id, email, media_attuale")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadNextAssessment(db: DbClient, studentId?: string | null, userId?: string | null) {
  const today = todayDateString();

  if (studentId) {
    const { data, error } = await db
      .from("student_assessments")
      .select("id, kind, date, subject, notes")
      .eq("student_id", studentId)
      .gt("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  if (!userId) return null;
  const { data, error } = await db
    .from("student_assessments")
    .select("id, kind, date, subject, notes")
    .eq("user_id", userId)
    .gt("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function serializeStudentSheet(db: DbClient, blackStudent: BlackStudentRow) {
  const linkedStudent = await ensureLinkedStudent(db, blackStudent);
  const canonicalStudent = await loadCanonicalStudent(db, linkedStudent.id);
  const billingProfile = await loadBillingProfile(db, blackStudent.user_id, [
    canonicalStudent?.email,
    blackStudent.student_email,
    blackStudent.parent_email,
  ]);
  const studentProfile = await loadStudentProfile(db, linkedStudent.id, blackStudent.user_id);
  const nextAssessment = await loadNextAssessment(db, linkedStudent.id, blackStudent.user_id);
  const tutorAssignment = await loadTutorAssignment(
    db,
    blackStudent.id,
    blackStudent.videolesson_tutor_id,
  );
  const assignedTutorId =
    blackStudent.videolesson_tutor_id || tutorAssignment?.tutor_id || null;
  const assignedTutor = await loadTutorMeta(db, assignedTutorId);
  const fallbackNextAssessmentDate = isFutureDateOnly(blackStudent.next_assessment_date)
    ? blackStudent.next_assessment_date
    : null;
  const hoursPaid = Number(blackStudent.hours_paid ?? 0);
  const hoursConsumed = Number(blackStudent.hours_consumed ?? 0);
  const hoursRemaining = Math.max(0, hoursPaid);

  return {
    id: blackStudent.id,
    studentId: linkedStudent.id,
    studentName:
      canonicalStudent?.full_name ||
      blackStudent.preferred_name ||
      blackStudent.student_email ||
      blackStudent.parent_email ||
      "Studente",
    accountName: billingProfile?.full_name || null,
    yearClass: blackStudent.year_class || null,
    track: blackStudent.track || null,
    startDate: blackStudent.start_date || null,
    parentName: blackStudent.parent_name || null,
    studentEmail: canonicalStudent?.email || blackStudent.student_email || null,
    parentEmail: blackStudent.parent_email || null,
    studentPhone: canonicalStudent?.phone || blackStudent.student_phone || null,
    parentPhone: blackStudent.parent_phone || null,
    stripeCustomerId: billingProfile?.stripe_customer_id || null,
    stripeCustomerUrl: buildStripeCustomerUrl(billingProfile?.stripe_customer_id || null),
    nextAssessmentId: nextAssessment?.id || null,
    nextAssessmentSubject:
      nextAssessment?.subject || (fallbackNextAssessmentDate ? blackStudent.next_assessment_subject : null) || null,
    nextAssessmentDate: nextAssessment?.date || fallbackNextAssessmentDate,
    goal: blackStudent.goal || null,
    difficultyFocus: blackStudent.difficulty_focus || null,
    initialAverage:
      blackStudent.initial_avg != null ? Number(blackStudent.initial_avg) : null,
    currentAverage:
      canonicalStudent?.current_average != null
        ? Number(canonicalStudent.current_average)
        : studentProfile?.media_attuale != null
          ? Number(studentProfile.media_attuale)
          : null,
    readiness: blackStudent.readiness != null ? Number(blackStudent.readiness) : null,
    riskLevel: blackStudent.risk_level || null,
    aiDescription: blackStudent.ai_description || null,
    status: deriveOperationalStatus({
      blackStatus: blackStudent.status || null,
      stripeStatus: billingProfile?.stripe_subscription_status || null,
      stripeCancelAtPeriodEnd: billingProfile?.stripe_cancel_at_period_end ?? null,
      stripeCurrentPeriodEnd: billingProfile?.stripe_current_period_end || null,
    }),
    renewalAt: billingProfile?.stripe_current_period_end || null,
    lastContactedAt: blackStudent.last_contacted_at || null,
    lastActiveAt: blackStudent.last_active_at || null,
    tutorId: assignedTutor?.id || null,
    tutorName: assignedTutor?.full_name || null,
    tutorEmail: assignedTutor?.email || null,
    tutorPhone: assignedTutor?.phone || null,
    hoursPaid,
    hoursConsumed,
    hoursRemaining,
    hoursAllocated:
      tutorAssignment?.hours_allocated != null ? Number(tutorAssignment.hours_allocated) : null,
    hourlyRate:
      tutorAssignment?.hourly_rate != null ? Number(tutorAssignment.hourly_rate) : null,
  };
}

async function generateStudentOverview(db: DbClient, blackStudent: BlackStudentRow) {
  if (!openai) {
    throw new Error("OPENAI_API_KEY non configurata");
  }

  const sheet = await serializeStudentSheet(db, blackStudent);
  const contactLogs = await loadContactLogs(db, blackStudent.id);
  const contactFrequencySummary = buildContactFrequencySummary(contactLogs);
  const fullContactHistory = contactLogs.length
    ? contactLogs.map((entry) => formatContactLogForPrompt(entry)).join("\n")
    : "Nessun contatto registrato";

  const context = [
    formatOverviewLine("Nome studente", sheet.studentName),
    formatOverviewLine("Nome account", sheet.accountName),
    formatOverviewLine("Classe", sheet.yearClass),
    formatOverviewLine("Stato percorso", sheet.status),
    formatOverviewLine("Rinnovo", sheet.renewalAt),
    formatOverviewLine("Ultimo contatto", sheet.lastContactedAt),
    formatOverviewLine("Ultimo accesso", sheet.lastActiveAt),
    formatOverviewLine("Prossima verifica", sheet.nextAssessmentSubject),
    formatOverviewLine("Data prossima verifica", sheet.nextAssessmentDate),
    formatOverviewLine("Obiettivo", sheet.goal),
    formatOverviewLine("Focus difficolta", sheet.difficultyFocus),
    formatOverviewLine("Media iniziale", sheet.initialAverage),
    formatOverviewLine("Media attuale", sheet.currentAverage),
    formatOverviewLine("Tutor assegnato", sheet.tutorName),
    formatOverviewLine("Ore residue da svolgere", sheet.hoursPaid),
    formatOverviewLine("Telefono studente", sheet.studentPhone),
    formatOverviewLine("Telefono genitore", sheet.parentPhone),
    formatOverviewLine("Email studente", sheet.studentEmail),
    formatOverviewLine("Email genitore", sheet.parentEmail),
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 420,
    messages: [
      {
        role: "system",
        content:
          "Sei un tutor operativo di Theoremz Black. Scrivi in italiano una overview pratica e breve dello studente usando solo le informazioni fornite. Non inventare dettagli. Devi considerare tutta la cronologia dei contatti e commentare esplicitamente quanto frequentemente viene contattato lo studente o la famiglia, se il follow-up sembra regolare oppure no, e cosa conviene fare adesso. Struttura obbligatoria: 1) un paragrafo iniziale di 3-5 frasi che descriva situazione, priorita, contesto e frequenza dei contatti; 2) una sezione finale intitolata 'Cosa fare adesso' con 3 bullet concrete e operative. Se mancano dati, dillo in modo sobrio e suggerisci la prossima azione utile.",
      },
      {
        role: "user",
        content: `Dati scheda studente:\n${context || "Nessun dato disponibile"}\n\nStatistiche complete contatti:\n${contactFrequencySummary}\n\nCronologia completa contatti:\n${fullContactHistory}`,
      },
    ],
  });

  const overview = completion.choices[0]?.message?.content?.trim();
  if (!overview) {
    throw new Error("Overview AI vuota");
  }
  return overview;
}

async function authorizeViewer(request: NextRequest, db: DbClient) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  let viewerEmail: string | null = null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    viewerEmail = decoded.email?.toLowerCase() || null;
  } catch {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  const isAdmin = isAdminEmail(viewerEmail);
  let viewerTutorId: string | null = null;
  if (!isAdmin && viewerEmail) {
    try {
      viewerTutorId = await resolveTutorId(viewerEmail, db);
    } catch (err: any) {
      return {
        error: NextResponse.json(
          { error: err?.message || "Errore lookup tutor" },
          { status: 500 },
        ),
      };
    }
    if (!viewerTutorId) {
      return { error: NextResponse.json({ error: "Tutor non autorizzato" }, { status: 403 }) };
    }
  }

  return { viewerEmail, viewerTutorId, isAdmin };
}

function canAccessStudent(
  blackStudent: BlackStudentRow,
  viewerTutorId: string | null,
  isAdmin: boolean,
) {
  if (isAdmin) return true;
  if (!viewerTutorId) return false;
  if (!blackStudent.videolesson_tutor_id) return true;
  const assignmentTutorId = extractAssignmentTutorId(blackStudent);
  return (
    blackStudent.videolesson_tutor_id === viewerTutorId || assignmentTutorId === viewerTutorId
  );
}

export async function GET(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  const auth = await authorizeViewer(request, db);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const studentId = (searchParams.get("studentId") || "").trim();
  if (!studentId) return NextResponse.json({ error: "studentId mancante" }, { status: 400 });

  try {
    const blackStudent = await fetchBlackStudent(db, studentId);
    if (!blackStudent) {
      return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
    }
    if (!canAccessStudent(blackStudent, auth.viewerTutorId, auth.isAdmin)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const student = await serializeStudentSheet(db, blackStudent);
    return NextResponse.json({ student });
  } catch (err: any) {
    console.error("[tutor/black-student] unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore scheda studente" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  const auth = await authorizeViewer(request, db);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  if (!studentId) return NextResponse.json({ error: "studentId mancante" }, { status: 400 });

  try {
    const blackStudent = await fetchBlackStudent(db, studentId);
    if (!blackStudent) {
      return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
    }
    if (!canAccessStudent(blackStudent, auth.viewerTutorId, auth.isAdmin)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const linkedStudent = await ensureLinkedStudent(db, blackStudent);
    const currentSheet = await serializeStudentSheet(db, {
      ...blackStudent,
    });

    const studentNameProvided = hasOwn(body, "studentName") || hasOwn(body, "name");
    const accountNameProvided = hasOwn(body, "accountName");
    const studentEmailProvided = hasOwn(body, "studentEmail");
    const studentPhoneProvided = hasOwn(body, "studentPhone");
    const parentNameProvided = hasOwn(body, "parentName");
    const parentEmailProvided = hasOwn(body, "parentEmail");
    const parentPhoneProvided = hasOwn(body, "parentPhone");
    const yearClassProvided = hasOwn(body, "yearClass");
    const trackProvided = hasOwn(body, "track");
    const startDateProvided = hasOwn(body, "startDate");
    const goalProvided = hasOwn(body, "goal");
    const difficultyFocusProvided = hasOwn(body, "difficultyFocus");
    const initialAverageProvided = hasOwn(body, "initialAverage");
    const currentAverageProvided = hasOwn(body, "currentAverage");
    const hoursPaidProvided = hasOwn(body, "hoursPaid");
    const hoursConsumedProvided = hasOwn(body, "hoursConsumed");
    const nextAssessmentSubjectProvided = hasOwn(body, "nextAssessmentSubject");
    const nextAssessmentDateProvided = hasOwn(body, "nextAssessmentDate");
    const nextAssessmentIdRaw =
      typeof body.nextAssessmentId === "string" ? body.nextAssessmentId.trim() : "";

    const studentName = normalizeOptionalString(body.studentName ?? body.name);
    const accountName = normalizeOptionalString(body.accountName);
    const studentEmail = normalizeOptionalString(body.studentEmail);
    const studentPhone = normalizeOptionalString(body.studentPhone);
    const parentName = normalizeOptionalString(body.parentName);
    const parentEmail = normalizeOptionalString(body.parentEmail);
    const parentPhone = normalizeOptionalString(body.parentPhone);
    const yearClass = normalizeOptionalString(body.yearClass);
    const track = normalizeOptionalString(body.track);
    const startDate = normalizeOptionalGenericDate(body.startDate, "Data inizio non valida");
    const goal = normalizeOptionalString(body.goal);
    const difficultyFocus = normalizeOptionalString(body.difficultyFocus);
    const nextAssessmentSubject = normalizeOptionalString(body.nextAssessmentSubject);
    const nextAssessmentDate = normalizeOptionalDate(body.nextAssessmentDate);

    let initialAverage: number | null | undefined = undefined;
    if (initialAverageProvided) {
      const rawValue = body.initialAverage;
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        initialAverage = null;
      } else {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) {
          return NextResponse.json({ error: "Media iniziale non valida" }, { status: 400 });
        }
        initialAverage = parsed;
      }
    }

    let currentAverage: number | null | undefined = undefined;
    if (currentAverageProvided) {
      const rawValue = body.currentAverage;
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        currentAverage = null;
      } else {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) {
          return NextResponse.json({ error: "Media attuale non valida" }, { status: 400 });
        }
        currentAverage = parsed;
      }
    }

    let hoursPaid: number | null | undefined = undefined;
    if (hoursPaidProvided) {
      const rawValue = body.hoursPaid;
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        hoursPaid = null;
      } else {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return NextResponse.json(
            { error: "Ore residue da svolgere non valide" },
            { status: 400 },
          );
        }
        hoursPaid = parsed;
      }
    }

    let hoursConsumed: number | null | undefined = undefined;
    if (hoursConsumedProvided) {
      const rawValue = body.hoursConsumed;
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        hoursConsumed = null;
      } else {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return NextResponse.json({ error: "Ore svolte non valide" }, { status: 400 });
        }
        hoursConsumed = parsed;
      }
    }

    const hasAnySupportedField =
      studentNameProvided ||
      accountNameProvided ||
      studentEmailProvided ||
      studentPhoneProvided ||
      parentNameProvided ||
      parentEmailProvided ||
      parentPhoneProvided ||
      yearClassProvided ||
      trackProvided ||
      startDateProvided ||
      goalProvided ||
      difficultyFocusProvided ||
      initialAverageProvided ||
      currentAverageProvided ||
      hoursPaidProvided ||
      hoursConsumedProvided ||
      nextAssessmentSubjectProvided ||
      nextAssessmentDateProvided;

    if (!hasAnySupportedField) {
      return NextResponse.json({ error: "nessun campo da aggiornare" }, { status: 400 });
    }

    const studentPatch: Record<string, unknown> = {};
    if (studentNameProvided) {
      studentPatch.full_name = studentName;
    }
    if (studentPhoneProvided) {
      studentPatch.phone = studentPhone;
      studentPatch.phone_normalized = normalizeStudentPhone(studentPhone);
    }
    if (studentEmailProvided) {
      studentPatch.email = studentEmail;
    }
    if (currentAverageProvided) {
      studentPatch.current_average = currentAverage ?? null;
    }
    if (Object.keys(studentPatch).length > 0) {
      studentPatch.updated_at = new Date().toISOString();
      const { error } = await db.from("students").update(studentPatch).eq("id", linkedStudent.id);
      if (error) throw error;
    }

    const profilePatch: Record<string, unknown> = {};
    if (accountNameProvided) {
      profilePatch.full_name = accountName;
    }
    if (Object.keys(profilePatch).length > 0 && blackStudent.user_id) {
      profilePatch.updated_at = new Date().toISOString();
      const { error } = await db
        .from("profiles")
        .update(profilePatch)
        .eq("id", blackStudent.user_id);
      if (error) throw error;
    }

    const blackPatch: Record<string, unknown> = {};
    if (studentNameProvided) {
      blackPatch.preferred_name = studentName;
      blackPatch.preferred_name_updated_at = new Date().toISOString();
    }
    if (studentPhoneProvided) {
      blackPatch.student_phone = studentPhone;
    }
    if (studentEmailProvided) {
      blackPatch.student_email = studentEmail;
    }
    if (parentNameProvided) {
      blackPatch.parent_name = parentName;
    }
    if (parentEmailProvided) {
      blackPatch.parent_email = parentEmail;
    }
    if (parentPhoneProvided) {
      blackPatch.parent_phone = parentPhone;
    }
    if (yearClassProvided) {
      blackPatch.year_class = yearClass;
    }
    if (trackProvided) {
      blackPatch.track = track;
    }
    if (startDateProvided) {
      blackPatch.start_date = startDate;
    }
    if (goalProvided) {
      blackPatch.goal = goal;
    }
    if (difficultyFocusProvided) {
      blackPatch.difficulty_focus = difficultyFocus;
    }
    if (initialAverageProvided) {
      blackPatch.initial_avg = initialAverage ?? null;
    }
    if (hoursPaidProvided) {
      blackPatch.hours_paid = hoursPaid ?? 0;
    }
    if (hoursConsumedProvided) {
      blackPatch.hours_consumed = hoursConsumed ?? 0;
    }

    if (nextAssessmentSubjectProvided || nextAssessmentDateProvided) {
      const finalSubject =
        nextAssessmentSubjectProvided ? nextAssessmentSubject : currentSheet.nextAssessmentSubject;
      const finalDate =
        nextAssessmentDateProvided ? nextAssessmentDate : currentSheet.nextAssessmentDate;

      if (!finalDate && finalSubject) {
        return NextResponse.json(
          { error: "Inserisci una data per la prossima verifica" },
          { status: 400 },
        );
      }

      if (finalDate && !isFutureDateOnly(finalDate)) {
        return NextResponse.json(
          { error: "La prossima verifica deve essere una data futura" },
          { status: 400 },
        );
      }

      if (!finalDate && !finalSubject) {
        if (nextAssessmentIdRaw || currentSheet.nextAssessmentId) {
          const { error } = await db
            .from("student_assessments")
            .delete()
            .eq("id", nextAssessmentIdRaw || currentSheet.nextAssessmentId);
          if (error) throw error;
        }
        blackPatch.next_assessment_subject = null;
        blackPatch.next_assessment_date = null;
      } else {
        const assessmentPayload = {
          user_id: blackStudent.user_id,
          student_id: linkedStudent.id,
          kind: "verifica",
          date: finalDate,
          subject: finalSubject,
          updated_at: new Date().toISOString(),
        };

        if (nextAssessmentIdRaw || currentSheet.nextAssessmentId) {
          const { error } = await db
            .from("student_assessments")
            .update(assessmentPayload)
            .eq("id", nextAssessmentIdRaw || currentSheet.nextAssessmentId);
          if (error) throw error;
        } else {
          const { error } = await db.from("student_assessments").insert({
            ...assessmentPayload,
            created_at: new Date().toISOString(),
          });
          if (error) throw error;
        }

        blackPatch.next_assessment_subject = finalSubject;
        blackPatch.next_assessment_date = finalDate;
      }
    }

    if (Object.keys(blackPatch).length > 0) {
      blackPatch.updated_at = new Date().toISOString();
      const { error } = await db.from("students").update(blackPatch).eq("id", studentId);
      if (error) throw error;
    }

    if (currentAverageProvided) {
      const stamp = new Date().toISOString();
      const { data: updatedProfiles, error } = await db
        .from("student_profiles")
        .update({ media_attuale: currentAverage ?? null, updated_at: stamp })
        .eq("student_id", linkedStudent.id)
        .select("user_id");
      if (error) throw error;

      if ((!updatedProfiles || updatedProfiles.length === 0) && blackStudent.user_id) {
        const fallbackUpdate = await db
          .from("student_profiles")
          .update({ media_attuale: currentAverage ?? null, updated_at: stamp })
          .eq("user_id", blackStudent.user_id)
          .select("user_id");
        if (fallbackUpdate.error) throw fallbackUpdate.error;
      }
    }

    if (studentEmailProvided) {
      const stamp = new Date().toISOString();
      const { data: updatedProfiles, error } = await db
        .from("student_profiles")
        .update({ email: studentEmail ?? null, updated_at: stamp })
        .eq("student_id", linkedStudent.id)
        .select("user_id");
      if (error) throw error;

      if ((!updatedProfiles || updatedProfiles.length === 0) && blackStudent.user_id) {
        const fallbackUpdate = await db
          .from("student_profiles")
          .update({ email: studentEmail ?? null, updated_at: stamp })
          .eq("user_id", blackStudent.user_id)
          .select("user_id");
        if (fallbackUpdate.error) throw fallbackUpdate.error;
      }
    }

    const refreshed = await fetchBlackStudent(db, studentId);
    if (!refreshed) {
      return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
    }

    const student = await serializeStudentSheet(db, refreshed);
    return NextResponse.json({ student });
  } catch (err: any) {
    console.error("[tutor/black-student] update error", err);
    return NextResponse.json({ error: err?.message || "Errore aggiornamento scheda" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  const auth = await authorizeViewer(request, db);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const action = normalizeOptionalString(body.action) || "mark_contacted";
  if (!studentId) return NextResponse.json({ error: "studentId mancante" }, { status: 400 });

  try {
    const blackStudent = await fetchBlackStudent(db, studentId);
    if (!blackStudent) {
      return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
    }
    if (!canAccessStudent(blackStudent, auth.viewerTutorId, auth.isAdmin)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (action === "generate_overview") {
      const overview = await generateStudentOverview(db, blackStudent);
      const updatedAt = new Date().toISOString();

      const { error: updateError } = await db
        .from("students")
        .update({
          ai_description: overview,
          updated_at: updatedAt,
        })
        .eq("id", studentId);
      if (updateError) throw updateError;

      const refreshed = await fetchBlackStudent(db, studentId);
      if (!refreshed) {
        return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
      }

      const student = await serializeStudentSheet(db, refreshed);
      return NextResponse.json({
        ok: true,
        student,
        overview,
      });
    }

    if (action !== "mark_contacted") {
      return NextResponse.json({ error: "azione non supportata" }, { status: 400 });
    }

    const contactAt = new Date().toISOString();
    const contactBody = normalizeOptionalString(body.contactBody);
    const authorLabel = await resolveAuthorLabel(
      db,
      auth.viewerEmail,
      auth.viewerTutorId,
      auth.isAdmin,
    );

    const { error: updateError } = await db
      .from("students")
      .update({
        last_contacted_at: contactAt,
        updated_at: contactAt,
      })
      .eq("id", studentId);
    if (updateError) throw updateError;

    const { error: logError } = await db.from("black_contact_logs").insert({
      student_id: studentId,
      contacted_at: contactAt,
      body: contactBody,
      source: "tutor_sheet",
      author_label: authorLabel,
    });
    if (logError) throw logError;

    const refreshed = await fetchBlackStudent(db, studentId);
    if (!refreshed) {
      return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
    }

    const student = await serializeStudentSheet(db, refreshed);
    return NextResponse.json({
      ok: true,
      student,
      contact: {
        contactedAt: contactAt,
        body: contactBody,
        authorLabel,
      },
    });
  } catch (err: any) {
    console.error("[tutor/black-student] contact error", err);
    return NextResponse.json({ error: err?.message || "Errore registrazione contatto" }, { status: 500 });
  }
}
