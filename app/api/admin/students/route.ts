import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";
import { deriveOperationalStatus } from "@/lib/billingStatus";
import { ensureStudentRecord } from "@/lib/students";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) => Boolean(email && email.toLowerCase() === ADMIN_EMAIL);
const CONTACT_PRIORITY_WINDOW_DAYS = 30;
const SUBSCRIPTION_PRIORITY_WINDOW_DAYS = 90;
const PAST_ASSESSMENT_PRIORITY_WINDOW_DAYS = 45;
const UPCOMING_ASSESSMENT_PRIORITY_WINDOW_DAYS = 30;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeEmail(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function normalizeOptionalString(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeProgramKind(value?: string | null) {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "percorso") return "percorso";
  if (normalized === "lead") return "lead";
  if (normalized === "manual") return "manual";
  return "subscription";
}

function normalizeDigits(value?: string | null) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length ? digits : null;
}

function isFutureDateOnly(value?: string | null) {
  if (!value) return false;
  return value > todayDateString();
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function toTimeOrNull(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function diffDaysFromNow(value?: string | null) {
  const time = toTimeOrNull(value);
  if (time == null) return null;
  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60 * 24));
}

function diffDaysUntil(value?: string | null) {
  const time = toTimeOrNull(value);
  if (time == null) return null;
  return Math.max(0, (time - Date.now()) / (1000 * 60 * 60 * 24));
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function computeUrgencyScore({
  programKind,
  lastContactAt,
  startDate,
  lastAssessmentAt,
  upcomingAssessmentAt,
  currentAverage,
  desiredAverage,
}: {
  programKind?: string | null;
  lastContactAt?: string | null;
  startDate?: string | null;
  lastAssessmentAt?: string | null;
  upcomingAssessmentAt?: string | null;
  currentAverage?: number | null;
  desiredAverage?: number | null;
}) {
  let score = 0;

  if (programKind === "percorso") {
    score += 1000;
  }

  const daysSinceContact = diffDaysFromNow(lastContactAt);
  if (daysSinceContact != null && daysSinceContact < CONTACT_PRIORITY_WINDOW_DAYS) {
    score += (daysSinceContact / CONTACT_PRIORITY_WINDOW_DAYS) * 20;
  }

  const daysSinceSubscription = diffDaysFromNow(startDate);
  if (daysSinceSubscription != null && daysSinceSubscription < SUBSCRIPTION_PRIORITY_WINDOW_DAYS) {
    score +=
      ((SUBSCRIPTION_PRIORITY_WINDOW_DAYS - daysSinceSubscription) /
        SUBSCRIPTION_PRIORITY_WINDOW_DAYS) *
      10;
  }

  const daysSinceAssessment = diffDaysFromNow(lastAssessmentAt);
  if (
    daysSinceAssessment != null &&
    daysSinceAssessment < PAST_ASSESSMENT_PRIORITY_WINDOW_DAYS
  ) {
    score +=
      ((PAST_ASSESSMENT_PRIORITY_WINDOW_DAYS - daysSinceAssessment) /
        PAST_ASSESSMENT_PRIORITY_WINDOW_DAYS) *
      30;
  }

  const daysUntilAssessment = diffDaysUntil(upcomingAssessmentAt);
  if (
    daysUntilAssessment != null &&
    daysUntilAssessment < UPCOMING_ASSESSMENT_PRIORITY_WINDOW_DAYS
  ) {
    score +=
      ((UPCOMING_ASSESSMENT_PRIORITY_WINDOW_DAYS - daysUntilAssessment) /
        UPCOMING_ASSESSMENT_PRIORITY_WINDOW_DAYS) *
      40;
  }

  if (
    desiredAverage != null &&
    currentAverage != null &&
    Number.isFinite(desiredAverage) &&
    Number.isFinite(currentAverage) &&
    desiredAverage > 0
  ) {
    const gap = Math.max(0, desiredAverage - currentAverage);
    const gapRatio = gap / desiredAverage;
    score += Math.min(gapRatio / 0.2, 1) * 15;
  }

  return roundScore(score);
}

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
    const today = todayDateString();
    const { data, error } = await db
      .from("students")
      .select(
        `
        id,
        user_id,
        full_name,
        email,
        phone,
        current_average,
        preferred_name,
        program_kind,
        start_date,
        student_email,
        parent_email,
        student_phone,
        parent_phone,
        status,
        last_contacted_at,
        next_assessment_subject,
        next_assessment_date
      `,
      )
      .order("preferred_name", { ascending: true });
    if (error) throw error;

    const studentIds = Array.from(
      new Set((data || []).map((row: any) => row?.id).filter((value): value is string => typeof value === "string" && value.length > 0)),
    );
    const userIds = Array.from(
      new Set((data || []).map((row: any) => row?.user_id).filter((value): value is string => typeof value === "string" && value.length > 0)),
    );

    const studentMap = new Map<string, any>();
    if (studentIds.length > 0) {
      const { data: studentRows, error: studentError } = await db
        .from("students")
        .select("id, full_name, email, phone, current_average")
        .in("id", studentIds);
      if (studentError) throw studentError;
      for (const row of studentRows || []) {
        if (row?.id) studentMap.set(row.id, row);
      }
    }

    const profileMap = new Map<string, any>();
    const profileByEmailMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profileRows, error: profileError } = await db
        .from("profiles")
        .select("id, stripe_subscription_status, stripe_cancel_at_period_end, stripe_current_period_end")
        .in("id", userIds);
      if (profileError) throw profileError;
      for (const row of profileRows || []) {
        if (row?.id) profileMap.set(row.id, row);
      }
    }

    const emailCandidates = Array.from(
      new Set(
        (data || [])
          .map((row: any) => {
            const canonicalStudent = row?.id ? studentMap.get(row.id) : null;
            return (
              normalizeEmail(canonicalStudent?.email) ||
              normalizeEmail(row?.student_email) ||
              normalizeEmail(row?.parent_email)
            );
          })
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (emailCandidates.length > 0) {
      const { data: profileRowsByEmail, error: profileByEmailError } = await db
        .from("profiles")
        .select("id, email, stripe_subscription_status, stripe_cancel_at_period_end, stripe_current_period_end")
        .in("email", emailCandidates);
      if (profileByEmailError) throw profileByEmailError;
      for (const row of profileRowsByEmail || []) {
        const email = normalizeEmail(row?.email);
        if (email) profileByEmailMap.set(email, row);
      }
    }

    const profileByStudentId = new Map<string, any>();
    const profileByUserId = new Map<string, any>();
    if (studentIds.length > 0) {
      const { data: studentProfileRows, error: studentProfileError } = await db
        .from("student_profiles")
        .select("student_id, user_id, media_attuale, goal_grade")
        .in("student_id", studentIds);
      if (studentProfileError) throw studentProfileError;
      for (const row of studentProfileRows || []) {
        if (row?.student_id) profileByStudentId.set(row.student_id, row);
        if (row?.user_id) profileByUserId.set(row.user_id, row);
      }
    }

    if (userIds.length > 0) {
      const missingUserIds = userIds.filter((userId) => !profileByUserId.has(userId));
      if (missingUserIds.length > 0) {
        const { data: fallbackProfileRows, error: fallbackProfileError } = await db
          .from("student_profiles")
          .select("student_id, user_id, media_attuale, goal_grade")
          .in("user_id", missingUserIds);
        if (fallbackProfileError) throw fallbackProfileError;
        for (const row of fallbackProfileRows || []) {
          if (row?.student_id && !profileByStudentId.has(row.student_id)) {
            profileByStudentId.set(row.student_id, row);
          }
          if (row?.user_id && !profileByUserId.has(row.user_id)) {
            profileByUserId.set(row.user_id, row);
          }
        }
      }
    }

    const latestAssessmentByStudentId = new Map<string, string>();
    const latestAssessmentByUserId = new Map<string, string>();
    const upcomingAssessmentByStudentId = new Map<string, string>();
    const upcomingAssessmentByUserId = new Map<string, string>();
    const recentAssessmentThreshold = dateDaysAgo(PAST_ASSESSMENT_PRIORITY_WINDOW_DAYS);
    const upcomingAssessmentThreshold = (() => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + UPCOMING_ASSESSMENT_PRIORITY_WINDOW_DAYS);
      return date.toISOString().slice(0, 10);
    })();

    if (studentIds.length > 0) {
      const { data: assessmentRows, error: assessmentError } = await db
        .from("student_assessments")
        .select("student_id, date")
        .in("student_id", studentIds)
        .lte("date", today)
        .gte("date", recentAssessmentThreshold)
        .order("date", { ascending: false });
      if (assessmentError) throw assessmentError;
      for (const row of assessmentRows || []) {
        if (row?.student_id && row?.date && !latestAssessmentByStudentId.has(row.student_id)) {
          latestAssessmentByStudentId.set(row.student_id, row.date);
        }
      }

      const { data: upcomingAssessmentRows, error: upcomingAssessmentError } = await db
        .from("student_assessments")
        .select("student_id, date")
        .in("student_id", studentIds)
        .gte("date", today)
        .lte("date", upcomingAssessmentThreshold)
        .order("date", { ascending: true });
      if (upcomingAssessmentError) throw upcomingAssessmentError;
      for (const row of upcomingAssessmentRows || []) {
        if (
          row?.student_id &&
          row?.date &&
          !upcomingAssessmentByStudentId.has(row.student_id)
        ) {
          upcomingAssessmentByStudentId.set(row.student_id, row.date);
        }
      }
    }

    if (userIds.length > 0) {
      const { data: assessmentRowsByUser, error: assessmentByUserError } = await db
        .from("student_assessments")
        .select("user_id, date")
        .in("user_id", userIds)
        .lte("date", today)
        .gte("date", recentAssessmentThreshold)
        .order("date", { ascending: false });
      if (assessmentByUserError) throw assessmentByUserError;
      for (const row of assessmentRowsByUser || []) {
        if (row?.user_id && row?.date && !latestAssessmentByUserId.has(row.user_id)) {
          latestAssessmentByUserId.set(row.user_id, row.date);
        }
      }

      const { data: upcomingAssessmentRowsByUser, error: upcomingAssessmentByUserError } = await db
        .from("student_assessments")
        .select("user_id, date")
        .in("user_id", userIds)
        .gte("date", today)
        .lte("date", upcomingAssessmentThreshold)
        .order("date", { ascending: true });
      if (upcomingAssessmentByUserError) throw upcomingAssessmentByUserError;
      for (const row of upcomingAssessmentRowsByUser || []) {
        if (row?.user_id && row?.date && !upcomingAssessmentByUserId.has(row.user_id)) {
          upcomingAssessmentByUserId.set(row.user_id, row.date);
        }
      }
    }

    const students = (data || []).map((s: any) => {
      const canonicalStudent = s?.id ? studentMap.get(s.id) : null;
      const studentProfile =
        (s?.id ? profileByStudentId.get(s.id) : null) ||
        (s?.user_id ? profileByUserId.get(s.user_id) : null) ||
        null;
      const fallbackEmail =
        normalizeEmail(canonicalStudent?.email) ||
        normalizeEmail(s?.student_email) ||
        normalizeEmail(s?.parent_email);
      const billingProfile =
        (s?.user_id ? profileMap.get(s.user_id) : null) ||
        (fallbackEmail ? profileByEmailMap.get(fallbackEmail) : null);
      const nextAssessmentDate = isFutureDateOnly(s?.next_assessment_date)
        ? s.next_assessment_date
        : null;
      const currentAverage =
        canonicalStudent?.current_average != null
          ? Number(canonicalStudent.current_average)
          : studentProfile?.media_attuale != null
            ? Number(studentProfile.media_attuale)
            : null;
      const desiredAverage =
        studentProfile?.goal_grade != null ? Number(studentProfile.goal_grade) : null;
      const lastAssessmentAt =
        (s?.id ? latestAssessmentByStudentId.get(s.id) : null) ||
        (s?.user_id ? latestAssessmentByUserId.get(s.user_id) : null) ||
        null;
      const upcomingAssessmentAt =
        (s?.id ? upcomingAssessmentByStudentId.get(s.id) : null) ||
        (s?.user_id ? upcomingAssessmentByUserId.get(s.user_id) : null) ||
        nextAssessmentDate ||
        null;
      const urgencyScore = computeUrgencyScore({
        programKind: s?.program_kind || null,
        lastContactAt: s?.last_contacted_at || null,
        startDate: s?.start_date || null,
        lastAssessmentAt,
        upcomingAssessmentAt,
        currentAverage,
        desiredAverage,
      });
      return {
        id: s?.id as string,
        studentId: s?.id || null,
        programKind: s?.program_kind || "subscription",
        fullName:
          canonicalStudent?.full_name ||
          s?.preferred_name ||
          s?.student_email ||
          s?.parent_email ||
          "Studente",
        phone: s?.student_phone || canonicalStudent?.phone || s?.parent_phone || null,
        email: s?.student_email || canonicalStudent?.email || s?.parent_email || null,
        activationAt: s?.start_date || null,
        lastContactAt: s?.last_contacted_at || null,
        nextAssessmentAt: upcomingAssessmentAt,
        nextAssessmentLabel: nextAssessmentDate ? s?.next_assessment_subject || null : null,
        renewalAt: billingProfile?.stripe_current_period_end || null,
        urgencyScore,
        status: deriveOperationalStatus({
          blackStatus: s?.status || null,
          stripeStatus: billingProfile?.stripe_subscription_status || null,
          stripeCancelAtPeriodEnd: billingProfile?.stripe_cancel_at_period_end ?? null,
          stripeCurrentPeriodEnd: billingProfile?.stripe_current_period_end || null,
        }),
      };
    });

    students.sort((a, b) => {
      if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
      const contactCompare = toTimeOrNull(a.lastContactAt) ?? Number.MAX_SAFE_INTEGER;
      const otherContactCompare = toTimeOrNull(b.lastContactAt) ?? Number.MAX_SAFE_INTEGER;
      if (contactCompare !== otherContactCompare) return contactCompare - otherContactCompare;
      return a.fullName.localeCompare(b.fullName, "it");
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
    const action = String(body.action || "").trim().toLowerCase();

    if (action === "create_student") {
      const fullName =
        normalizeOptionalString(body.fullName) ||
        normalizeOptionalString(body.studentName) ||
        normalizeOptionalString(body.name);
      const studentEmail =
        normalizeEmail(body.email) || normalizeEmail(body.studentEmail);
      const studentPhone =
        normalizeOptionalString(body.phone) || normalizeOptionalString(body.studentPhone);
      const parentPhone = normalizeOptionalString(body.parentPhone);
      const parentEmail = normalizeEmail(body.parentEmail);
      const yearClass = normalizeOptionalString(body.yearClass);
      const nextAssessmentSubject = normalizeOptionalString(body.nextAssessmentSubject);
      const nextAssessmentDate = normalizeOptionalString(body.nextAssessmentDate);
      const startDate = normalizeOptionalString(body.startDate) || todayDateString();
      const programKind = normalizeProgramKind(body.programKind || "percorso");

      if (!fullName) {
        return NextResponse.json({ error: "Nome studente obbligatorio" }, { status: 400 });
      }
      if (!studentEmail && !studentPhone && !parentPhone) {
        return NextResponse.json(
          { error: "Inserisci almeno email o telefono dello studente" },
          { status: 400 },
        );
      }

      const candidateEmails = Array.from(
        new Set([studentEmail, parentEmail].filter((value): value is string => Boolean(value))),
      );
      let duplicateBlackId: string | null = null;

      if (candidateEmails.length > 0) {
        const { data: emailMatches, error: emailMatchesError } = await db
          .from("students")
          .select("id, student_email, parent_email")
          .in("student_email", candidateEmails);
        if (emailMatchesError) {
          return NextResponse.json({ error: emailMatchesError.message }, { status: 500 });
        }
        duplicateBlackId =
          emailMatches?.find((row) => row?.id)?.id ||
          duplicateBlackId;
      }

      if (!duplicateBlackId && candidateEmails.length > 0) {
        const { data: parentEmailMatches, error: parentEmailMatchesError } = await db
          .from("students")
          .select("id, student_email, parent_email")
          .in("parent_email", candidateEmails);
        if (parentEmailMatchesError) {
          return NextResponse.json({ error: parentEmailMatchesError.message }, { status: 500 });
        }
        duplicateBlackId =
          parentEmailMatches?.find((row) => row?.id)?.id ||
          duplicateBlackId;
      }

      const phoneDigits = normalizeDigits(studentPhone || parentPhone);
      if (!duplicateBlackId && phoneDigits) {
        const { data: studentPhoneMatches, error: studentPhoneMatchesError } = await db
          .from("students")
          .select("id, student_phone")
          .ilike("student_phone", `%${phoneDigits}%`)
          .limit(20);
        if (studentPhoneMatchesError) {
          return NextResponse.json({ error: studentPhoneMatchesError.message }, { status: 500 });
        }
        duplicateBlackId =
          studentPhoneMatches?.find((row) => normalizeDigits(row?.student_phone) === phoneDigits)
            ?.id || duplicateBlackId;
      }

      if (!duplicateBlackId && phoneDigits) {
        const { data: parentPhoneMatches, error: parentPhoneMatchesError } = await db
          .from("students")
          .select("id, parent_phone")
          .ilike("parent_phone", `%${phoneDigits}%`)
          .limit(20);
        if (parentPhoneMatchesError) {
          return NextResponse.json({ error: parentPhoneMatchesError.message }, { status: 500 });
        }
        duplicateBlackId =
          parentPhoneMatches?.find((row) => normalizeDigits(row?.parent_phone) === phoneDigits)?.id ||
          duplicateBlackId;
      }

      const studentRecord = await ensureStudentRecord(
        {
          authUid: null,
          fullName,
          email: studentEmail || parentEmail,
          phone: studentPhone || parentPhone,
          source: programKind === "percorso" ? "admin_percorso" : "admin_black",
        },
        db,
      );

      if (duplicateBlackId && duplicateBlackId !== studentRecord.id) {
        return NextResponse.json(
          { error: "Esiste già una scheda Black per questo studente" },
          { status: 409 },
        );
      }

      let linkedProfile: { id: string; email?: string | null } | null = null;
      if (candidateEmails.length > 0) {
        const { data: linkedProfiles, error: linkedProfileError } = await db
          .from("profiles")
          .select("id, email")
          .in("email", candidateEmails)
          .limit(1);
        if (linkedProfileError) {
          return NextResponse.json({ error: linkedProfileError.message }, { status: 500 });
        }
        linkedProfile = linkedProfiles?.[0] || null;
      }

      let profileId = linkedProfile?.id || null;
      if (!profileId) {
        const fallbackEmail =
          studentEmail ||
          parentEmail ||
          `${(studentPhone || parentPhone || `student-${Date.now()}`).replace(/\D/g, "") || `student-${Date.now()}`}@autogen.tz`;
        const profilePayload = {
          id: randomUUID(),
          email: fallbackEmail.toLowerCase(),
          full_name: fullName,
          role: "student",
          subscription_tier: "free",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error: profileErr } = await db.from("profiles").insert(profilePayload);
        if (profileErr) {
          return NextResponse.json({ error: profileErr.message }, { status: 500 });
        }
        profileId = profilePayload.id;
      }

      const studentPatch: Record<string, any> = {
        user_id: profileId,
        preferred_name: fullName,
        student_email: studentEmail || null,
        parent_email: parentEmail || null,
        student_phone: studentPhone || null,
        parent_phone: parentPhone || null,
        year_class: yearClass || null,
        status: "active",
        start_date: startDate,
        next_assessment_subject: nextAssessmentSubject || null,
        next_assessment_date: nextAssessmentDate || null,
        program_kind: programKind,
        updated_at: new Date().toISOString(),
      };

      const { data: created, error: createErr } = await db
        .from("students")
        .update(studentPatch)
        .eq("id", studentRecord.id)
        .select("id")
        .maybeSingle();
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        studentId: created?.id || null,
      });
    }

    const studentId = String(body.studentId || "").trim();
    const hours = Number(body.hours);
    if (!studentId) return NextResponse.json({ error: "studentId mancante" }, { status: 400 });
    if (!Number.isFinite(hours) || hours <= 0) {
      return NextResponse.json({ error: "Ore non valide" }, { status: 400 });
    }
    const { data: student, error: studentErr } = await db
      .from("students")
      .select("id, hours_paid")
      .eq("id", studentId)
      .maybeSingle();
    if (studentErr) return NextResponse.json({ error: studentErr.message }, { status: 500 });
    if (!student) return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
    const nextPaid = Number(student.hours_paid ?? 0) + hours;
    const { error: updErr, data: updated } = await db
      .from("students")
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

    const { data: existing, error: existingErr } = await db
      .from("students")
      .select("id, hours_paid, hours_consumed, videolesson_tutor_id")
      .eq("id", studentId)
      .maybeSingle();
    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });

    const name = (body.name || body.preferredName || "").trim();
    const email = (body.email || body.studentEmail || body.parentEmail || "").trim().toLowerCase();
    const phone = (body.phone || body.studentPhone || body.parentPhone || "").trim();
    const whatsappGroupLinkRaw = body.whatsappGroupLink ?? body.whatsapp_group_link;
    const tutorId = body.tutorId ? String(body.tutorId).trim() : null;
    const hoursPaidRaw = body.hoursPaid;
    const hoursConsumedRaw = body.hoursConsumed;
    const hourlyRateRaw = body.hourlyRate;
    const effectiveTutorId = tutorId || existing.videolesson_tutor_id || null;
    const wantsHourlyRateUpdate = hourlyRateRaw !== undefined;

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
    if (whatsappGroupLinkRaw !== undefined) {
      const cleaned = String(whatsappGroupLinkRaw || "").trim();
      updates.whatsapp_group_link = cleaned ? cleaned : null;
    }
    if (tutorId) updates.videolesson_tutor_id = tutorId;
    if (hoursPaidRaw !== undefined) {
      const next = Number(hoursPaidRaw);
      if (!Number.isFinite(next) || next < 0) {
        return NextResponse.json({ error: "hoursPaid non valido" }, { status: 400 });
      }
      updates.hours_paid = next;
    }
    if (hoursConsumedRaw !== undefined) {
      const next = Number(hoursConsumedRaw);
      if (!Number.isFinite(next) || next < 0) {
        return NextResponse.json({ error: "hoursConsumed non valido" }, { status: 400 });
      }
      updates.hours_consumed = next;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    if (wantsHourlyRateUpdate && !effectiveTutorId) {
      return NextResponse.json({ error: "Imposta un tutor per salvare la tariffa oraria" }, { status: 400 });
    }

    let existingAssignmentRate: number | null = null;
    if (effectiveTutorId) {
      const { data: assignment } = await db
        .from("tutor_assignments")
        .select("hourly_rate")
        .eq("student_id", studentId)
        .eq("tutor_id", effectiveTutorId)
        .maybeSingle();
      if (assignment?.hourly_rate != null) {
        existingAssignmentRate = Number(assignment.hourly_rate);
      }
    }

    if (tutorId) {
      const { data: tutor, error: tutorErr } = await db
        .from("tutors")
        .select("id, display_name, full_name, email")
        .eq("id", tutorId)
        .maybeSingle();
      if (tutorErr) return NextResponse.json({ error: tutorErr.message }, { status: 500 });
      if (!tutor) return NextResponse.json({ error: "Tutor non trovato" }, { status: 404 });
    }

    const { data: updated, error: updErr } = await db
      .from("students")
      .update(updates)
      .eq("id", studentId)
      .select(
        `
        id,
        preferred_name,
        program_kind,
        student_email,
        parent_email,
        student_phone,
        parent_phone,
        whatsapp_group_link,
        hours_paid,
        hours_consumed,
        status,
        videolesson_tutor_id,
        tutor:tutors!students_videolesson_tutor_id_fkey(id, display_name, full_name, email)
      `,
      )
      .maybeSingle();

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    if (!updated) return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });

    if (effectiveTutorId && (tutorId || wantsHourlyRateUpdate)) {
      await db
        .from("tutor_assignments")
        .upsert(
          { tutor_id: effectiveTutorId, student_id: studentId, role: "videolezione", hourly_rate: hourlyRateRaw ?? existingAssignmentRate ?? null },
          { onConflict: "tutor_id,student_id" },
        );
    }

    let hourlyRate: number | null = existingAssignmentRate;
    if (effectiveTutorId) {
      const { data: rateRow } = await db
        .from("tutor_assignments")
        .select("hourly_rate")
        .eq("student_id", studentId)
        .eq("tutor_id", effectiveTutorId)
        .maybeSingle();
      if (rateRow?.hourly_rate != null) {
        hourlyRate = Number(rateRow.hourly_rate);
      }
    }

    const tutor = (updated as any)?.tutor;
    const hoursPaid = Number((updated as any)?.hours_paid ?? 0);
    const hoursConsumed = Number((updated as any)?.hours_consumed ?? 0);
    const remaining = Math.max(0, hoursPaid, hoursPaid - hoursConsumed);
    return NextResponse.json({
      student: {
        id: updated.id as string,
        programKind: (updated as any)?.program_kind || "subscription",
        name:
          (updated as any)?.preferred_name ||
          tutor?.full_name ||
          (updated as any)?.student_email ||
          (updated as any)?.parent_email ||
          "Studente",
        email: (updated as any)?.student_email || (updated as any)?.parent_email || null,
        phone: (updated as any)?.student_phone || (updated as any)?.parent_phone || null,
        whatsappGroupLink: (updated as any)?.whatsapp_group_link || null,
        tutorId: tutor?.id || (updated as any)?.videolesson_tutor_id || null,
        tutorName: tutor?.display_name || tutor?.full_name || tutor?.email || null,
        hoursPaid,
        hoursConsumed,
        remainingPaid: remaining,
        hourlyRate,
        isBlack: ((updated as any)?.status || "").toLowerCase() !== "inactive",
      },
    });
  } catch (err: any) {
    console.error("[admin/students] patch error", err);
    return NextResponse.json({ error: err?.message || "Errore aggiornamento studente" }, { status: 500 });
  }
}
