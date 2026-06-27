import { supabaseServer } from "@/lib/supabase";

type CanonicalLeadInput = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  instagramHandle?: string | null;
  channel?: "instagram" | "whatsapp" | "phone" | "email" | "black" | "unknown" | string | null;
  source?: string | null;
  funnel?: "manual" | "ilmetodo" | "quiz" | "quick_contact" | "whatsapp_prospect" | "black_churn" | "black_onboarding" | "other" | string | null;
  status?: "active" | "completed" | "dropped" | string | null;
  responseStatus?: "pending" | "responded" | "no_response" | "paused" | string | null;
  currentStep?: number | null;
  nextFollowUpAt?: string | Date | null;
  lastContactedAt?: string | Date | null;
  completedAt?: string | Date | null;
  respondedAt?: string | Date | null;
  noResponseAt?: string | Date | null;
  pausedAt?: string | Date | null;
  studentId?: string | null;
  pageUrl?: string | null;
  note?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  metadata?: Record<string, unknown> | null;
  legacyRefs?: Record<string, unknown> | null;
  fallbackKey?: string | null;
};

function compactString(value?: string | null, max = 500) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function normalizePhoneDigits(raw?: string | null) {
  if (!raw || raw.includes("@")) return null;
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length >= 10) {
    digits = digits.replace(/^0+/, "");
  }
  if (digits.length === 10 && !digits.startsWith("39")) {
    digits = `39${digits}`;
  }
  return digits || null;
}

export function normalizeCanonicalLeadPhone(raw?: string | null) {
  const digits = normalizePhoneDigits(raw);
  return digits ? `+${digits}` : null;
}

function normalizeInstagram(raw?: string | null) {
  const cleaned = compactString(raw, 120)?.replace(/^@+/, "").toLowerCase();
  return cleaned || null;
}

function normalizeDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildContactKey(input: CanonicalLeadInput, phone: string | null, instagram: string | null) {
  const phoneDigits = normalizePhoneDigits(phone || input.phone);
  if (phoneDigits) return `phone:${phoneDigits}`;

  const email = compactString(input.email, 180)?.toLowerCase();
  if (email) return `email:${email}`;

  if (instagram) return `ig:${instagram}`;

  const fallback = compactString(input.fallbackKey, 180);
  return fallback || null;
}

export async function upsertCanonicalLead(input: CanonicalLeadInput) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const phone = normalizeCanonicalLeadPhone(input.phone);
  const instagram = normalizeInstagram(input.instagramHandle);
  const contactKey = buildContactKey(input, phone, instagram);
  if (!contactKey) return null;

  const db = supabaseServer();
  const { data, error } = await db.rpc("upsert_canonical_lead", {
    _contact_key: contactKey,
    _full_name: compactString(input.fullName, 180),
    _email: compactString(input.email, 180)?.toLowerCase() || null,
    _phone: phone,
    _instagram: instagram,
    _channel: compactString(input.channel, 40) || "unknown",
    _source: compactString(input.source, 80) || "manual",
    _funnel: compactString(input.funnel, 40) || "manual",
    _status: compactString(input.status, 40) || "active",
    _response_status: compactString(input.responseStatus, 40) || "pending",
    _current_step: Number.isFinite(input.currentStep) ? Number(input.currentStep) : 0,
    _next_follow_up_at: normalizeDate(input.nextFollowUpAt),
    _last_contacted_at: normalizeDate(input.lastContactedAt),
    _completed_at: normalizeDate(input.completedAt),
    _responded_at: normalizeDate(input.respondedAt),
    _no_response_at: normalizeDate(input.noResponseAt),
    _paused_at: normalizeDate(input.pausedAt),
    _student_id: compactString(input.studentId, 80),
    _page_url: compactString(input.pageUrl, 500),
    _note: compactString(input.note, 1000),
    _created_at: normalizeDate(input.createdAt),
    _updated_at: normalizeDate(input.updatedAt),
    _metadata: input.metadata || {},
    _legacy_refs: input.legacyRefs || {},
  });

  if (error) throw error;
  return typeof data === "string" ? data : null;
}
