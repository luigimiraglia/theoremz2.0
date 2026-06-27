import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";
import { upsertCanonicalLead } from "@/lib/canonicalLeads";

const CYCLES = new Set(["medie", "liceo", "altro"]);
const SUBJECTS = new Map([
  ["matematica", "Matematica"],
  ["fisica", "Fisica"],
]);
const NEEDS = new Map([
  ["theory", "Non capisco la teoria"],
  ["exercises", "Mi blocco negli esercizi"],
  ["test", "Ho una verifica/interrogazione vicina"],
  ["method", "Mi manca un metodo di studio"],
]);
const URGENCIES = new Map([
  ["today", "Oggi o domani"],
  ["week", "Questa settimana"],
  ["test_date", "Prima della prossima verifica"],
  ["not_urgent", "Non urgente"],
]);

type OnboardingBody = {
  cycle?: string;
  year?: number;
  indirizzo?: string;
  schoolTrackCode?: string;
  subject?: string;
  subjectCode?: string;
  topic?: string;
  topicCode?: string;
  needCode?: string;
  urgencyCode?: string;
  phone?: string;
  wantsTutorHelp?: boolean;
  returnTo?: string;
};

async function getClaims(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

function cleanText(value: unknown, max = 120) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanPhone(value: unknown) {
  const raw = cleanText(value, 40);
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+()\s.-]/g, "").trim();
  return cleaned || null;
}

function cleanReturnTo(value: unknown) {
  const path = cleanText(value, 500);
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export async function POST(req: Request) {
  const claims = await getClaims(req);
  if (!claims?.uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as OnboardingBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const cycle = CYCLES.has(String(body.cycle)) ? String(body.cycle) : null;
  const year = Number(body.year);
  const schoolYear = Number.isFinite(year) ? Math.max(1, Math.min(5, Math.trunc(year))) : null;
  const indirizzo = cleanText(body.indirizzo, 64);
  const schoolTrackCode = cleanSlug(body.schoolTrackCode, 64) || slugify(indirizzo);
  const subjectCode = cleanSlug(body.subjectCode, 32);
  const topicCode = cleanSlug(body.topicCode, 80);
  const needCode = cleanSlug(body.needCode, 40);
  const urgencyCode = cleanSlug(body.urgencyCode, 40) || "not_urgent";
  const subject = subjectCode && SUBJECTS.has(subjectCode) ? subjectCode : null;
  const subjectLabel = subject ? SUBJECTS.get(subject) || subject : null;
  const topic = cleanText(body.topic, 180);
  const needLabel = needCode && NEEDS.has(needCode) ? NEEDS.get(needCode) || needCode : null;
  const urgencyLabel = URGENCIES.get(urgencyCode) || URGENCIES.get("not_urgent") || "Non urgente";
  const phone = cleanPhone(body.phone);
  const wantsTutorHelp = Boolean(body.wantsTutorHelp && phone);
  const returnTo = cleanReturnTo(body.returnTo);
  const completedAt = new Date().toISOString();

  if (!cycle || !schoolYear || !indirizzo || !subject || !subjectLabel || !topic || !topicCode || !needCode || !needLabel) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  const fullName =
    cleanText(claims.name, 180) ||
    cleanText(claims.email?.split("@")[0], 180) ||
    null;
  const email = cleanText(claims.email, 180)?.toLowerCase() || null;

  try {
    const student = await syncLiteProfilePatch(claims.uid, {
      full_name: fullName,
      email,
      phone,
      cycle,
      indirizzo,
      school_year: schoolYear,
      weak_subjects: [subject],
      weak_topics: [topic],
      current_topics: [topic],
      onboarding_completed_at: completedAt,
      onboarding_version: "student-segmentation-v2",
      onboarding_return_to: returnTo,
      tutor_help_requested: wantsTutorHelp,
      tutor_help_requested_at: wantsTutorHelp ? completedAt : null,
      onboarding_segment: {
        cycle,
        schoolYear,
        schoolTrackCode,
        schoolTrackLabel: indirizzo,
        subject,
        subjectLabel,
        topic,
        topicCode,
        needCode,
        needLabel,
        urgencyCode,
        urgencyLabel,
        hasPhone: Boolean(phone),
        wantsTutorHelp,
      },
      current_focus_subject: subject,
      current_focus_topic: topic,
      current_focus_topic_code: topicCode,
      current_focus_need: needCode,
      help_urgency: urgencyCode,
    });

    if (wantsTutorHelp && phone) {
      await upsertCanonicalLead({
        fullName,
        email,
        phone,
        channel: "phone",
        source: "student_onboarding",
        funnel: "quick_contact",
        status: "active",
        responseStatus: "pending",
        studentId: student?.id || null,
        pageUrl: returnTo,
        note: `Richiesta aiuto gratuito tutor: ${subjectLabel} - ${topic} (${needLabel}, ${urgencyLabel})`,
        metadata: {
          cycle,
          schoolYear,
          indirizzo,
          schoolTrackCode,
          subject,
          subjectLabel,
          topic,
          topicCode,
          needCode,
          needLabel,
          urgencyCode,
          urgencyLabel,
          onboardingVersion: "student-segmentation-v2",
        },
      });
    }
  } catch (error) {
    console.error("[me-onboarding] save failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, returnTo });
}

function cleanSlug(value: unknown, max = 80) {
  const text = cleanText(value, max);
  if (!text) return null;
  const slug = text.toLowerCase().replace(/[^a-z0-9_/-]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || null;
}

function slugify(value: string | null) {
  if (!value) return null;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || null;
}
