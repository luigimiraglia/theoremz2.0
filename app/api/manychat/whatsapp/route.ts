import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
export const hasOpenAIClient = Boolean(openai);
const webhookSecret = process.env.MANYCHAT_WEBHOOK_SECRET;
const personaOverride = process.env.MANYCHAT_WHATSAPP_PERSONA;
const aiModel = process.env.MANYCHAT_OPENAI_MODEL || "gpt-4o-mini";
const aiVisionModel = process.env.MANYCHAT_OPENAI_VISION_MODEL || "gpt-4o";
const aiMaxTokens = Number(process.env.MANYCHAT_OPENAI_MAX_TOKENS || 320);
const aiTemperature = Number(process.env.MANYCHAT_OPENAI_TEMPERATURE || 0.4);
const NON_BLACK_ACADEMIC_REPLY =
  "Certo ti aiuto subito! Posso avere prima la mail del tuo account? Ricorda che il supporto sugli esercizi è riservato agli abbonati Theoremz Black.";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB safety limit
export const IMAGE_ONLY_PROMPT = "Guarda l'immagine allegata, ti spiego come risolverla.";

const ACTIVE_BLACK_STATUSES = new Set([
  "active",
  "trial",
  "trialing",
  "past_due",
  "unpaid",
]);
const WHATSAPP_MESSAGES_TABLE = "black_whatsapp_messages";

type SupabaseProfileRow = {
  full_name?: string | null;
  subscription_tier?: string | null;
};

type BlackStudentRow = {
  id: string;
  user_id: string;
  status?: string | null;
  year_class?: string | null;
  track?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  parent_email?: string | null;
  student_phone?: string | null;
  parent_phone?: string | null;
  ai_description?: string | null;
  profiles?: SupabaseProfileRow | SupabaseProfileRow[] | null;
};

type StudentProfileRow = {
  user_id: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  is_black?: boolean | null;
};

type ResolvedContact = {
  userId: string;
  studentId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  yearClass: string | null;
  track: string | null;
  status: string | null;
  subscriptionTier: string | null;
  isBlack: boolean;
  source: "black_students" | "student_profiles" | "fallback";
  aiSummary?: string | null;
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type InquiryRecord = {
  id: string;
  phone_tail: string;
  intent: string | null;
  status: string;
  email?: string | null;
  message_count?: number | null;
};

type JsonResponseOptions = {
  status?: number;
  isBlack?: boolean;
};

export function jsonResponse(message: string, options?: JsonResponseOptions) {
  const status = options?.status ?? 200;
  const isBlack = options?.isBlack ?? false;
  return NextResponse.json(
    {
      version: "v2",
      content: { type: "text", text: message },
      black: isBlack,
    },
    { status }
  );
}

export function missingConfigResponse(reason: string) {
  return NextResponse.json({ error: reason }, { status: 500 });
}

function getStringAtPath(payload: any, path: string[]) {
  const value = getValueAtPath(payload, path);
  return typeof value === "string" ? value.trim() || null : null;
}

function getValueAtPath(payload: any, path: string[]) {
  let current: any = payload;
  for (const key of path) {
    if (current === null || current === undefined) return null;
    current = current[key];
  }
  return current;
}

function extractFirstString(payload: any, paths: string[][]) {
  for (const path of paths) {
    const value = getStringAtPath(payload, path);
    if (value) return value;
  }
  return null;
}

function deepFindStringByKey(payload: any, matcher: (key: string) => boolean) {
  if (!payload || typeof payload !== "object") return null;
  const stack = [payload];
  const seen = new Set<any>();
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    for (const [key, value] of Object.entries(current)) {
      if (matcher(key) && typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      }
      if (value && typeof value === "object") stack.push(value as any);
    }
  }
  return null;
}

export function extractPhone(payload: any) {
  const phonePaths = [
    ["subscriber", "phone"],
    ["subscriber", "whatsapp"],
    ["data", "subscriber", "phone"],
    ["data", "subscriber", "whatsapp"],
    ["contact", "phone"],
    ["data", "contact", "phone"],
    ["data", "contact", "whatsapp"],
    ["message", "from"],
    ["raw_message", "from"],
    ["data", "raw_message", "from"],
    ["phone"],
  ];
  const direct = extractFirstString(payload, phonePaths);
  if (direct) return direct;
  return deepFindStringByKey(payload, (key) => key.toLowerCase().includes("phone"));
}

export function extractMessageText(payload: any) {
  const messagePaths = [
    ["message", "text"],
    ["message", "body"],
    ["data", "message", "text"],
    ["data", "message", "body"],
    ["raw_message", "text"],
    ["raw_message", "body"],
    ["data", "raw_message", "text"],
    ["data", "raw_message", "body"],
    ["event", "text"],
    ["content", "text"],
    ["text"],
    ["input"],
  ];
  const direct = extractFirstString(payload, messagePaths);
  if (direct) return direct;
  return deepFindStringByKey(payload, (key) => key.toLowerCase() === "text" || key.toLowerCase() === "body");
}

function resolveImageUrlCandidate(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("data:") || lower.startsWith("http://") || lower.startsWith("https://")) {
      return trimmed;
    }
    const looksJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
    if (looksJson) {
      try {
        return resolveImageUrlCandidate(JSON.parse(trimmed));
      } catch {
        const match = trimmed.match(/https?:\/\/[^\s"'}]+/i);
        return match ? match[0] : null;
      }
    }
    const match = trimmed.match(/https?:\/\/[^\s"'}]+/i);
    return match ? match[0] : null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = resolveImageUrlCandidate(entry);
      if (resolved) return resolved;
    }
    return null;
  }
  if (typeof value === "object") {
    const directKeys = ["image_url", "url", "href", "link", "src", "media_url"];
    for (const key of directKeys) {
      if (key in value) {
        const resolved = resolveImageUrlCandidate((value as any)[key]);
        if (resolved) return resolved;
      }
    }
    const nestedKeys = [
      "payload",
      "data",
      "attachment",
      "attachments",
      "image",
      "images",
      "media",
      "content",
      "message",
      "file",
      "value",
    ];
    for (const key of nestedKeys) {
      if (key in value) {
        const resolved = resolveImageUrlCandidate((value as any)[key]);
        if (resolved) return resolved;
      }
    }
  }
  return null;
}

export function extractImageUrl(payload: any) {
  const imagePaths = [
    ["image_url"],
    ["image"],
    ["media_url"],
    ["message", "image_url"],
    ["message", "image"],
    ["message", "media_url"],
    ["message", "attachment"],
    ["message", "attachments", "0"],
    ["raw_message", "image"],
    ["raw_message", "image_url"],
    ["raw_message", "attachments", "0"],
    ["data", "message", "image"],
    ["data", "message", "image_url"],
    ["data", "message", "attachments", "0"],
    ["data", "raw_message", "image"],
    ["data", "raw_message", "image_url"],
    ["data", "raw_message", "attachments", "0"],
    ["content", "image_url"],
    ["content", "image"],
    ["attachments", "0"],
    ["attachment"],
    ["last_received_attachment"],
  ];
  for (const path of imagePaths) {
    const value = getValueAtPath(payload, path);
    const resolved = resolveImageUrlCandidate(value);
    if (resolved) return resolved;
  }

  const fallbackSources = [
    payload?.message?.attachments,
    payload?.message?.attachment,
    payload?.raw_message?.attachments,
    payload?.raw_message?.attachment,
    payload?.data?.message?.attachments,
    payload?.data?.message?.attachment,
    payload?.data?.raw_message?.attachments,
    payload?.data?.raw_message?.attachment,
    payload?.attachments,
    payload?.attachment,
    payload?.content?.attachments,
    payload?.image,
  ];
  for (const source of fallbackSources) {
    const resolved = resolveImageUrlCandidate(source);
    if (resolved) return resolved;
  }

  const deepString = deepFindStringByKey(payload, (key) => {
    const lower = key.toLowerCase();
    return lower.includes("image_url") || lower === "image" || lower === "media_url";
  });
  return resolveImageUrlCandidate(deepString);
}

export function extractSubscriberName(payload: any) {
  const namePaths = [
    ["subscriber", "name"],
    ["subscriber", "full_name"],
    ["data", "subscriber", "name"],
    ["data", "subscriber", "full_name"],
    ["contact", "name"],
    ["data", "contact", "name"],
    ["subscriber", "first_name"],
    ["subscriber", "last_name"],
    ["data", "subscriber", "first_name"],
    ["data", "subscriber", "last_name"],
  ];

  const direct = extractFirstString(payload, namePaths.slice(0, 6));
  if (direct) return direct;

  const first = extractFirstString(payload, [namePaths[6], namePaths[8]]);
  const last = extractFirstString(payload, [namePaths[7], namePaths[9]]);
  const composed = [first, last].filter(Boolean).join(" ").trim();
  return composed || null;
}

function normalizeDigits(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D+/g, "");
  return digits || null;
}

function extractPhoneTail(rawPhone: string) {
  const digits = normalizeDigits(rawPhone);
  if (!digits) return null;
  const tail = digits.slice(-10);
  return tail.length >= 6 ? tail : null;
}

function buildSuffixFilter(columns: string[], tail: string | null) {
  if (!tail) return "";
  const escaped = tail.replace(/,/g, "\\,").replace(/%/g, "\\%").replace(/_/g, "\\_");
  return columns.map((column) => `${column}.ilike.%${escaped}`).join(",");
}

function unwrapProfile<T>(value: T | T[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapBlackStudent(row: BlackStudentRow): ResolvedContact {
  const profile = unwrapProfile(row.profiles);
  const status = row.status ? row.status.toLowerCase() : null;
  const subscriptionTier = profile?.subscription_tier || null;
  const isBlack = Boolean(
    (status && ACTIVE_BLACK_STATUSES.has(status)) || subscriptionTier === "black"
  );
  const fullName = row.student_name || profile?.full_name || row.student_email || row.parent_email || null;

  return {
    userId: row.user_id,
    studentId: row.id,
    fullName,
    email: row.student_email || row.parent_email || null,
    phone: row.student_phone || row.parent_phone || null,
    yearClass: row.year_class || null,
    track: row.track || null,
    status,
    subscriptionTier,
    isBlack,
    source: "black_students",
    aiSummary: row.ai_description || null,
  };
}

function mapStudentProfile(row: StudentProfileRow): ResolvedContact {
  const subscriptionTier = row.is_black ? "black" : null;
  const isBlack = Boolean(row.is_black);
  return {
    userId: row.user_id,
    studentId: null,
    fullName: row.full_name || row.email || null,
    email: row.email || null,
    phone: row.phone || null,
    yearClass: null,
    track: null,
    status: null,
    subscriptionTier,
    isBlack,
    source: "student_profiles",
    aiSummary: null,
  };
}

function buildFallbackContact(name: string | null, phone: string | null): ResolvedContact {
  return {
    userId: "guest",
    studentId: null,
    fullName: name,
    email: null,
    phone,
    yearClass: null,
    track: null,
    status: null,
    subscriptionTier: null,
    isBlack: false,
    source: "fallback",
    aiSummary: null,
  };
}

async function resolveContact(
  db: ReturnType<typeof supabaseServer>,
  phone: string
): Promise<ResolvedContact | null> {
  const tail = extractPhoneTail(phone);
  if (!tail) return null;

  const studentFilter = buildSuffixFilter(["student_phone", "parent_phone"], tail);
  if (studentFilter) {
    const { data, error } = await db
      .from("black_students")
      .select(
        "id, user_id, status, year_class, track, student_name, student_email, parent_email, student_phone, parent_phone, ai_description, profiles:profiles!black_students_user_id_fkey(full_name, subscription_tier)"
      )
      .or(studentFilter)
      .limit(1);
    if (error) throw new Error(`black_students lookup failed: ${error.message}`);
    if (data && data.length) {
      return mapBlackStudent(data[0] as BlackStudentRow);
    }
  }

  const profileFilter = buildSuffixFilter(["phone"], tail);
  if (profileFilter) {
    const { data, error } = await db
      .from("student_profiles")
      .select("user_id, full_name, phone, email, is_black")
      .or(profileFilter)
      .limit(1);
    if (error) throw new Error(`student_profiles lookup failed: ${error.message}`);
    if (data && data.length) {
      return mapStudentProfile(data[0] as StudentProfileRow);
    }
  }

  return null;
}

async function fetchConversationHistory(
  db: ReturnType<typeof supabaseServer>,
  studentId: string | null,
  phoneTail: string | null,
  limit = 20
): Promise<{ history: ConversationMessage[]; total: number }> {
  if (!studentId && !phoneTail) return { history: [], total: 0 };
  let query = db
    .from(WHATSAPP_MESSAGES_TABLE)
    .select("role, content", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (studentId) {
    query = query.eq("student_id", studentId);
  } else if (phoneTail) {
    query = query.eq("phone_tail", phoneTail);
  }
  const { data, error, count } = await query;
  if (error) {
    console.error("[manychat-whatsapp] history fetch failed", error.message);
    return { history: [], total: 0 };
  }
  return {
    history: (data ?? []).reverse() as ConversationMessage[],
    total: typeof count === "number" ? count : data?.length ?? 0,
  };
}

async function logConversationMessage({
  db,
  studentId,
  phoneTail,
  role,
  content,
  meta,
}: {
  db: ReturnType<typeof supabaseServer>;
  studentId: string | null;
  phoneTail: string | null;
  role: "user" | "assistant";
  content: string;
  meta?: Record<string, any> | null;
}) {
  if (!studentId && !phoneTail) return;
  const payload = {
    student_id: studentId,
    phone_tail: phoneTail,
    role,
    content,
    meta: meta ?? null,
  };
  const { error } = await db.from(WHATSAPP_MESSAGES_TABLE).insert(payload);
  if (error) {
    console.error("[manychat-whatsapp] log insert failed", error.message);
  }
}

async function pruneOldMessages({
  db,
  studentId,
  phoneTail,
  deleteCount,
}: {
  db: ReturnType<typeof supabaseServer>;
  studentId: string | null;
  phoneTail: string | null;
  deleteCount: number;
}) {
  if (!deleteCount || deleteCount <= 0) return;
  if (!studentId && !phoneTail) return;
  let query = db
    .from(WHATSAPP_MESSAGES_TABLE)
    .select("id")
    .order("created_at", { ascending: true })
    .limit(deleteCount);
  if (studentId) {
    query = query.eq("student_id", studentId);
  } else if (phoneTail) {
    query = query.eq("phone_tail", phoneTail);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[manychat-whatsapp] prune lookup failed", error.message);
    return;
  }
  if (!data?.length) return;
  const ids = data.map((row: any) => row.id);
  const { error: deleteErr } = await db.from(WHATSAPP_MESSAGES_TABLE).delete().in("id", ids);
  if (deleteErr) {
    console.error("[manychat-whatsapp] prune delete failed", deleteErr.message);
  }
}

async function summarizeConversation({
  studentId,
  phoneTail,
  db,
}: {
  studentId: string | null;
  phoneTail: string | null;
  db: ReturnType<typeof supabaseServer>;
}) {
  if (!openai || (!studentId && !phoneTail)) return;
  let transcriptQuery = db
    .from(WHATSAPP_MESSAGES_TABLE)
    .select("role, content")
    .order("created_at", { ascending: true })
    .limit(70);
  if (studentId) transcriptQuery = transcriptQuery.eq("student_id", studentId);
  else if (phoneTail) transcriptQuery = transcriptQuery.eq("phone_tail", phoneTail);
  const { data: transcript, error: transcriptErr } = await transcriptQuery;
  if (transcriptErr) {
    console.error("[manychat-whatsapp] summary fetch failed", transcriptErr.message);
    return;
  }
  if (!transcript?.length || !studentId) return;

  const { data: studentRow, error: studentErr } = await db
    .from("black_students")
    .select("ai_description, profiles:profiles!black_students_user_id_fkey(full_name)")
    .eq("id", studentId)
    .maybeSingle();
  if (studentErr) {
    console.error("[manychat-whatsapp] summary student fetch failed", studentErr.message);
    return;
  }
  const existingSummary = studentRow?.ai_description || "";
  const profileEntry = unwrapProfile(studentRow?.profiles);
  const studentName = profileEntry?.full_name || "studente";
  const transcriptText = transcript
    .map((entry) => `${entry.role === "user" ? "Studente" : "Luigi"}: ${entry.content}`)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: aiModel,
      temperature: 0.3,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: "Sei un tutor senior di Theoremz Black: sintetizza le conversazioni WhatsApp e aggiorna la descrizione dello studente.",
        },
        {
          role: "user",
          content: `Descrizione attuale di ${studentName}:
"""
${existingSummary || "(nessuna)"}
"""

Chat recente:
"""
${transcriptText}
"""

Fondi le informazioni in un'unica nota chiara (4-6 frasi) con tono professionale e concreto.`,
        },
      ],
    });
    const summary = completion.choices[0]?.message?.content?.trim();
    if (summary) {
      await db
        .from("black_students")
        .update({ ai_description: summary, updated_at: new Date().toISOString() })
        .eq("id", studentId);
    }
  } catch (err) {
    console.error("[manychat-whatsapp] summary completion failed", err);
  }
}

async function handleConversationRetention({
  db,
  studentId,
  phoneTail,
  totalCount,
}: {
  db: ReturnType<typeof supabaseServer>;
  studentId: string | null;
  phoneTail: string | null;
  totalCount: number;
}) {
  if (totalCount <= 70) return;
  await summarizeConversation({ studentId, phoneTail, db });
  await pruneOldMessages({ db, studentId, phoneTail, deleteCount: 50 });
}

async function resolveImageDataUrl(imageUrl?: string | null): Promise<string | null> {
  if (!imageUrl) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      console.error("[manychat-whatsapp] image fetch failed", {
        imageUrl,
        status: response.status,
      });
      return null;
    }
    const contentLength = Number(response.headers.get("content-length") || "0");
    if (contentLength && contentLength > MAX_IMAGE_BYTES) {
      console.warn("[manychat-whatsapp] image too large", { contentLength, imageUrl });
      return null;
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      console.warn("[manychat-whatsapp] image exceeded limit after download", {
        size: arrayBuffer.byteLength,
        imageUrl,
      });
      return null;
    }
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("[manychat-whatsapp] image fetch error", { imageUrl, error });
    return null;
  }
}

function inferLeadIntent(message: string) {
  const text = message.toLowerCase();
  const infoKeywords = [
    "prezzo",
    "prezzi",
    "costo",
    "quanto",
    "abbon",
    "piano",
    "informazioni",
    "info",
    "iscriver",
    "come funziona",
    "pagare",
    "quanto costa",
    "theoremz black",
  ];
  if (infoKeywords.some((keyword) => text.includes(keyword))) return "info" as const;
  return "academic" as const;
}

function extractEmailCandidate(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function normalizeE164Phone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D+/g, "");
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith("00")) normalized = normalized.slice(2);
  if (normalized.startsWith("0") && normalized.length > 9) normalized = normalized.replace(/^0+/, "");
  if (!normalized.startsWith("39") && normalized.length === 10) {
    normalized = `39${normalized}`;
  }
  return `+${normalized}`;
}

function escapeSupabaseValue(value: string) {
  return value.replace(/,/g, "\\,").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function linkEmailToPhone(db: ReturnType<typeof supabaseServer>, email: string, phone: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { status: "invalid" as const };
  const escaped = escapeSupabaseValue(normalized);
  const { data, error } = await db
    .from("black_students")
    .select("id")
    .or(`student_email.ilike.${escaped},parent_email.ilike.${escaped}`)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[manychat-whatsapp] link email failed", error.message);
    return { status: "error" as const };
  }
  if (!data?.id) {
    return { status: "not_found" as const };
  }
  const stamp = new Date().toISOString();
  const { error: updateErr } = await db
    .from("black_students")
    .update({ student_phone: phone, updated_at: stamp })
    .eq("id", data.id);
  if (updateErr) {
    console.error("[manychat-whatsapp] phone update failed", updateErr.message);
    return { status: "error" as const };
  }
  return { status: "linked" as const, studentId: data.id };
}

async function getInquiryByPhoneTail(db: ReturnType<typeof supabaseServer>, phoneTail: string) {
  const { data, error } = await db
    .from("black_whatsapp_inquiries")
    .select("id, phone_tail, intent, status, email, message_count")
    .eq("phone_tail", phoneTail)
    .maybeSingle();
  if (error) {
    console.error("[manychat-whatsapp] inquiry lookup failed", error.message);
    return null;
  }
  return (data as InquiryRecord) || null;
}

async function createInquiryRecord({
  db,
  phoneTail,
  intent,
  subscriberName,
}: {
  db: ReturnType<typeof supabaseServer>;
  phoneTail: string;
  intent: string;
  subscriberName: string | null;
}) {
  const payload = {
    phone_tail: phoneTail,
    intent,
    status: "open",
    meta: subscriberName ? { name: subscriberName } : null,
  };
  const { data, error } = await db
    .from("black_whatsapp_inquiries")
    .insert(payload)
    .select("id, phone_tail, intent, status, email, message_count")
    .single();
  if (error) {
    console.error("[manychat-whatsapp] inquiry insert failed", error.message);
    throw new Error(error.message);
  }
  return data as InquiryRecord;
}

async function updateInquiryCounters({
  db,
  inquiryId,
  increment,
}: {
  db: ReturnType<typeof supabaseServer>;
  inquiryId: string;
  increment: number;
}) {
  const { data, error } = await db
    .from("black_whatsapp_inquiries")
    .select("message_count")
    .eq("id", inquiryId)
    .maybeSingle();
  if (error) {
    console.error("[manychat-whatsapp] inquiry counter read failed", error.message);
    return;
  }
  const current = Number(data?.message_count ?? 0);
  const nextCount = current + increment;
  const { error: updateErr } = await db
    .from("black_whatsapp_inquiries")
    .update({
      message_count: nextCount,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);
  if (updateErr) {
    console.error("[manychat-whatsapp] inquiry counter update failed", updateErr.message);
  }
}

async function generateInfoReply({
  message,
  history,
  subscriberName,
}: {
  message: string;
  history: ConversationMessage[];
  subscriberName: string | null;
}) {
  if (!openai) {
    return "Ciao! Sono Luigi di Theoremz Black 👋 Ti spiego subito come funziona il programma se mi dai qualche dettaglio in più.";
  }
  const leadName = subscriberName || "potenziale cliente";
  const formattedHistory = history.map((entry) =>
    entry.role === "user"
      ? `Richiesta precedente: ${entry.content}`
      : `Risposta precedente: ${entry.content}`
  );
  const context = formattedHistory.length ? formattedHistory.join("\n") : "(nessuno)";
  const completion = await openai.chat.completions.create({
    model: aiModel,
    temperature: 0.6,
    max_tokens: 320,
    messages: [
      {
        role: "system",
        content:
          "Sei Luigi Miraglia e stai parlando con un potenziale studente interessato a Theoremz Black su WhatsApp. Spiega il valore del programma, rispondi alle domande commerciali e sii cordiale (tono umano, massimo 3 paragrafi).",
      },
      {
        role: "user",
        content: `Conversazione precedente:
${context}

Nuovo messaggio da ${leadName}:
"""
${message}
"""

Rispondi con tono amichevole, chiaro e professionale, includendo call-to-action concrete (es. link theoremz.com/black).`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ||
    "Ti racconto volentieri come funziona Theoremz Black: è un percorso personalizzato con tutor e AI, ti mando tutte le info e i link ❤️";
}

async function handleBlackConversation({
  db,
  resolvedContact,
  messageText,
  subscriberName,
  phoneTail,
  imageUrl,
  imageDataUrl,
}: {
  db: ReturnType<typeof supabaseServer>;
  resolvedContact: ResolvedContact;
  messageText: string;
  subscriberName: string | null;
  phoneTail: string | null;
  imageUrl?: string | null;
  imageDataUrl?: string | null;
}) {
  const { history, total } = await fetchConversationHistory(db, resolvedContact.studentId, phoneTail);
  let runningCount = total;
  const canLog = Boolean(phoneTail || resolvedContact.studentId);
  if (canLog) {
    await logConversationMessage({
      db,
      studentId: resolvedContact.studentId,
      phoneTail,
      role: "user",
      content: messageText,
      meta: { subscriberName, imageUrl },
    });
    runningCount += 1;
  }
  try {
    const reply = await generateAiReply(
      resolvedContact,
      messageText,
      subscriberName,
      history,
      imageDataUrl || imageUrl || undefined
    );
    if (canLog) {
      await logConversationMessage({
        db,
        studentId: resolvedContact.studentId,
        phoneTail,
        role: "assistant",
        content: reply,
        meta: { model: aiModel },
      });
      runningCount += 1;
      await handleConversationRetention({
        db,
        studentId: resolvedContact.studentId,
        phoneTail,
        totalCount: runningCount,
      });
    }
    return jsonResponse(reply, { isBlack: resolvedContact.isBlack });
  } catch (error) {
    console.error("[manychat-whatsapp] ai error", error);
    const fallbackMessage =
      "Mi sfugge proprio la risposta giusta 😅 Riprovo tra un attimo oppure scrivimi dentro l'app.";
    if (canLog) {
      await logConversationMessage({
        db,
        studentId: resolvedContact.studentId,
        phoneTail,
        role: "assistant",
        content: fallbackMessage,
        meta: { model: aiModel, error: (error as Error)?.message },
      });
      runningCount += 1;
      await handleConversationRetention({
        db,
        studentId: resolvedContact.studentId,
        phoneTail,
        totalCount: runningCount,
      });
    }
    return jsonResponse(fallbackMessage, { isBlack: resolvedContact.isBlack });
  }
}

async function handleLeadConversation({
  db,
  messageText,
  subscriberName,
  rawPhone,
  phoneTail,
  imageUrl,
}: {
  db: ReturnType<typeof supabaseServer>;
  messageText: string;
  subscriberName: string | null;
  rawPhone: string | null;
  phoneTail: string | null;
  imageUrl?: string | null;
}) {
  const emailCandidate = extractEmailCandidate(messageText);
  if (emailCandidate) {
    const normalizedPhone = normalizeE164Phone(rawPhone || phoneTail);
    if (!normalizedPhone) {
      return jsonResponse("Per collegarti ho bisogno del numero completo con cui mi stai scrivendo 😊");
    }
    const link = await linkEmailToPhone(db, emailCandidate, normalizedPhone);
    if (link.status === "linked" && link.studentId) {
      const refreshedContact = await resolveContact(db, normalizedPhone);
      if (refreshedContact && refreshedContact.isBlack) {
        return handleBlackConversation({
          db,
          resolvedContact: refreshedContact,
          messageText,
          subscriberName,
          phoneTail: extractPhoneTail(normalizedPhone),
        });
      }
      return jsonResponse("Grazie! Ho collegato la tua mail: scrivimi ora dall'app per riprendere la chat ✌️");
    }
    return jsonResponse("Questa mail non risulta nei nostri account, puoi ricontrollare? 😊");
  }

  if (!phoneTail) {
    return jsonResponse("Per aiutarti devo avere il tuo numero completo su WhatsApp. Puoi riprovare? 😊");
  }

  const intent = inferLeadIntent(messageText);
  if (intent !== "info") {
    return jsonResponse(NON_BLACK_ACADEMIC_REPLY);
  }

  let inquiry = await getInquiryByPhoneTail(db, phoneTail);
  if (!inquiry) {
    inquiry = await createInquiryRecord({ db, phoneTail, intent, subscriberName });
  }

  if (inquiry.intent !== "info") {
    return jsonResponse(NON_BLACK_ACADEMIC_REPLY);
  }

  const { history, total } = await fetchConversationHistory(db, null, phoneTail);
  let runningCount = total;
  await logConversationMessage({
    db,
    studentId: null,
    phoneTail,
    role: "user",
    content: messageText,
    meta: { subscriberName, inquiryId: inquiry.id, imageUrl },
  });
  runningCount += 1;

  const reply = await generateInfoReply({ message: messageText, history, subscriberName });
  await logConversationMessage({
    db,
    studentId: null,
    phoneTail,
    role: "assistant",
    content: reply,
    meta: { inquiryId: inquiry.id },
  });
  runningCount += 1;
  await handleConversationRetention({ db, studentId: null, phoneTail, totalCount: runningCount });
  await updateInquiryCounters({ db, inquiryId: inquiry.id, increment: 2 });
  return jsonResponse(reply, { isBlack: false });
}

function buildSystemPrompt(contact: ResolvedContact) {
  const persona =
    personaOverride?.trim() ||
    "Sei Luigi Miraglia, fondatore di Theoremz Black. Rispondi su WhatsApp ai tuoi studenti in prima persona, tono amichevole ma autorevole. Dai consigli pratici, sii diretto e conciso (2-3 paragrafi o meno).";

  const details: string[] = [];
  if (contact.fullName) details.push(`Nome: ${contact.fullName}`);
  if (contact.yearClass) details.push(`Classe: ${contact.yearClass}`);
  if (contact.track) details.push(`Percorso: ${contact.track}`);
  if (contact.email) details.push(`Email: ${contact.email}`);
  if (contact.phone) details.push(`Telefono: ${contact.phone}`);

  const header = details.length
    ? `Dati sullo studente:
${details.join("\n")}`
    : "Non hai dati aggiuntivi sullo studente oltre al messaggio.";

  const summarySection = contact.aiSummary
    ? `\nNota tutor esistente:\n${contact.aiSummary}`
    : "";

  return `${persona}

${header}
${summarySection}

Regole:
- Rispondi sempre in italiano e in prima persona come Luigi, ma non aggiungere firme o nomi alla fine.
- Mantieni uno stile da WhatsApp: frasi brevi, niente markdown complesso.
- Non proporre chiamate o call a meno che lo studente non lo chieda esplicitamente; se serve un follow-up limita la risposta al testo.
- Se non hai abbastanza contesto, fai domande mirate invece di inventare dettagli.`;
}

async function generateAiReply(
  contact: ResolvedContact,
  message: string,
  subscriberName: string | null,
  history: ConversationMessage[],
  imageUrl?: string | null
) {
  if (!openai) throw new Error("OpenAI client not configured");
  const systemPrompt = buildSystemPrompt(contact);
  const addressedName = subscriberName || contact.fullName;
  const userContent = addressedName
    ? `Messaggio da ${addressedName} su WhatsApp:
"""
${message}
"""

Rispondi come Luigi, facendo riferimento diretto al testo e usando lo stesso canale.`
    : `Messaggio WhatsApp ricevuto:
"""
${message}
"""

Rispondi come Luigi.`;

  const formattedHistory = (history || []).map((entry) => ({
    role: entry.role,
    content:
      entry.role === "user"
        ? `Messaggio precedente dello studente:\n"""${entry.content}"""`
        : entry.content,
  }));

  const userMessage: any = imageUrl
    ? {
        role: "user",
        content: [
          { type: "text", text: userContent },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }
    : { role: "user", content: userContent };

  const modelToUse = imageUrl ? aiVisionModel || aiModel : aiModel;
  const completion = await openai.chat.completions.create({
    model: modelToUse,
    temperature: Number.isFinite(aiTemperature) ? aiTemperature : 0.4,
    max_tokens: Number.isFinite(aiMaxTokens) ? aiMaxTokens : 320,
    messages: [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      userMessage,
    ],
  });

  const content = completion.choices[0]?.message?.content || "";
  return content.trim() || "Fammi un attimo capire meglio la situazione 😊";
}

export function verifySecret(req: Request) {
  if (!webhookSecret) return null;
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return "missing_authorization";
  const expected = `Bearer ${webhookSecret}`;
  return authHeader === expected ? null : "invalid_authorization";
}

type WhatsAppMessageInput = {
  messageText: string;
  subscriberName: string | null;
  rawPhone: string | null;
  imageUrl?: string | null;
};

export async function handleWhatsAppMessage({
  messageText,
  subscriberName,
  rawPhone,
  imageUrl,
}: WhatsAppMessageInput) {
  const db = supabaseServer();
  const phoneTail = rawPhone ? extractPhoneTail(rawPhone) : null;

  let resolvedImageDataUrl: string | null = null;
  if (imageUrl) {
    resolvedImageDataUrl = await resolveImageDataUrl(imageUrl);
    if (!resolvedImageDataUrl) {
      console.warn("[manychat-whatsapp] image normalization failed", { imageUrl });
    }
  }

  let contact: ResolvedContact | null = null;
  if (rawPhone) {
    try {
      contact = await resolveContact(db, rawPhone);
    } catch (error) {
      console.error("[manychat-whatsapp] lookup error", error);
    }
  } else {
    console.warn("[manychat-whatsapp] missing phone number in payload");
  }

  if (contact && contact.source !== "fallback" && !contact.isBlack) {
    return jsonResponse(
      "Questo numero non risulta abbonato a Theoremz Black. Se pensi sia un errore, scrivimi a team@theoremz.com 💌",
      { isBlack: false }
    );
  }

  const resolvedContact = contact ?? buildFallbackContact(subscriberName, rawPhone);

  if (resolvedContact.isBlack) {
    return handleBlackConversation({
      db,
      resolvedContact,
      messageText,
      subscriberName,
      phoneTail,
      imageUrl: imageUrl ?? null,
      imageDataUrl: resolvedImageDataUrl,
    });
  }

  return handleLeadConversation({
    db,
    messageText,
    subscriberName,
    rawPhone,
    phoneTail,
    imageUrl: imageUrl ?? null,
  });
}

export async function POST(req: Request) {
  if (!openai) return missingConfigResponse("missing_openai_api_key");
  const authError = verifySecret(req);
  if (authError) return NextResponse.json({ error: authError }, { status: 401 });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const messageText = extractMessageText(payload);
  if (!messageText) {
    return jsonResponse("Non ho ricevuto nessun messaggio da elaborare 😅");
  }

  const subscriberName = extractSubscriberName(payload);
  const rawPhone = extractPhone(payload);

  return handleWhatsAppMessage({
    messageText,
    subscriberName,
    rawPhone,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
