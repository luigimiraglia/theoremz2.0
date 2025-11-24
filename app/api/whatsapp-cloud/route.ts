import http from "http";
import https from "https";
import { spawn } from "child_process";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const hasOpenAIClient = Boolean(openai);
const personaOverride = process.env.MANYCHAT_WHATSAPP_PERSONA;
const aiModel = process.env.MANYCHAT_OPENAI_MODEL || "gpt-4o-mini";
const aiVisionModel = process.env.MANYCHAT_OPENAI_VISION_MODEL || "gpt-4o";
const aiMaxTokens = Number(process.env.MANYCHAT_OPENAI_MAX_TOKENS || 320);
const aiTemperature = Number(process.env.MANYCHAT_OPENAI_TEMPERATURE || 0.4);
const graphApiVersion = process.env.WHATSAPP_GRAPH_VERSION || "v20.0";
const cloudPhoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || "";
const metaAccessToken = process.env.META_ACCESS_TOKEN || "";
const graphVerifyToken = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN || "";
const NON_BLACK_ACADEMIC_REPLY =
  "Certo ti aiuto subito! Posso avere prima la mail del tuo account? Ricorda che il supporto sugli esercizi è riservato agli abbonati Theoremz Black.";
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // allow larger WhatsApp uploads
const INLINE_IMAGE_TARGET_BYTES = 4 * 1024 * 1024;
const IMAGE_FETCH_TIMEOUT_MS = 12_000;
const MAX_IMAGE_REDIRECTS = 3;
const IMAGE_FETCH_USER_AGENT = "Mozilla/5.0 (compatible; TheoremzWhatsAppBot/1.0)";
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_JPEG_QUALITY = 82;
const IMAGE_ONLY_PROMPT = "Guarda l'immagine allegata e dimmi come posso aiutarti.";
const manychatAttachmentToken = process.env.MANYCHAT_ATTACHMENT_TOKEN?.trim() || "";
const whatsappGraphToken = process.env.WHATSAPP_GRAPH_TOKEN?.trim() || "";
const telegramMonitorChats = (process.env.TELEGRAM_WHATSAPP_MONITOR_CHATS || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";

const ACTIVE_BLACK_STATUSES = new Set([
  "active",
  "trial",
  "trialing",
  "past_due",
  "unpaid",
]);
const WHATSAPP_MESSAGES_TABLE = "black_whatsapp_messages";
const RECENT_GRADES_LIMIT = 3;
const UPCOMING_ASSESSMENTS_LIMIT = 3;

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
  goal?: string | null;
  difficulty_focus?: string | null;
  readiness?: number | null;
  risk_level?: string | null;
  next_assessment_subject?: string | null;
  next_assessment_date?: string | null;
  last_contacted_at?: string | null;
  last_active_at?: string | null;
  initial_avg?: number | null;
  current_avg?: number | null;
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
  studentEmail?: string | null;
  parentEmail?: string | null;
  studentPhone?: string | null;
  parentPhone?: string | null;
  goal?: string | null;
  difficultyFocus?: string | null;
  readiness?: number | null;
  riskLevel?: string | null;
  nextAssessmentSubject?: string | null;
  nextAssessmentDate?: string | null;
  lastContactedAt?: string | null;
  lastActiveAt?: string | null;
  initialAvg?: number | null;
  currentAvg?: number | null;
  academicSnapshot?: StudentAcademicSnapshot | null;
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

type GradeSnapshot = {
  subject: string | null;
  score: number | null;
  max_score: number | null;
  when_at: string | null;
};

type AssessmentSnapshot = {
  subject: string | null;
  when_at: string | null;
};

type StudentAcademicSnapshot = {
  latestGrades: GradeSnapshot[];
  upcomingAssessments: AssessmentSnapshot[];
};

type JsonResponseOptions = {
  status?: number;
  isBlack?: boolean;
};

function jsonResponse(message: string, options?: JsonResponseOptions) {
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

function missingConfigResponse(reason: string) {
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

function extractPhone(payload: any) {
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

function extractMessageText(payload: any) {
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

type ImageSource = {
  url: string;
  headers?: Record<string, string> | null;
};

function sanitizeHeaderValue(value: any) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function mergeHeaders(...sources: Array<Record<string, any> | undefined | null>) {
  const result: Record<string, string> = {};
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const [key, rawValue] of Object.entries(source)) {
      const normalizedKey = key.trim();
      if (!normalizedKey) continue;
      const value = sanitizeHeaderValue(rawValue);
      if (!value) continue;
      result[normalizedKey] = value;
    }
  }
  return Object.keys(result).length ? result : null;
}

function buildImageSource(value: any): ImageSource | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase().startsWith("data:")) {
      return { url: trimmed };
    }
    const looksJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"));
    if (looksJson) {
      try {
        return buildImageSource(JSON.parse(trimmed));
      } catch {
        const match = trimmed.match(/https?:\/\/[^\s"'}]+/i);
        return match ? { url: match[0] } : null;
      }
    }
    const match = trimmed.match(/https?:\/\/[^\s"'}]+/i);
    if (match) return { url: match[0] };
    return null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = buildImageSource(entry);
      if (resolved) return resolved;
    }
    return null;
  }
  if (typeof value === "object") {
    const headers =
      mergeHeaders(
        (value as any).headers,
        (value as any).meta?.headers,
        (value as any).payload?.headers
      ) || null;
    const directKeys = ["image_url", "url", "href", "link", "src", "media_url", "download_url"];
    for (const key of directKeys) {
      const candidate = (value as any)[key];
      const resolved = buildImageSource(candidate);
      if (resolved) {
        return { url: resolved.url, headers: resolved.headers || headers };
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
      if (!(key in value)) continue;
      const resolved = buildImageSource((value as any)[key]);
      if (resolved) {
        return {
          url: resolved.url,
          headers: headers || resolved.headers || null,
        };
      }
    }
  }
  return null;
}

function enrichImageSource(source: ImageSource | null): ImageSource | null {
  if (!source?.url) return source;
  try {
    const parsed = new URL(source.url);
    const host = parsed.hostname.toLowerCase();
    const headers = { ...(source.headers || {}) };
    let mutated = false;
    if (manychatAttachmentToken && host.includes("manychat")) {
      if (!headers.Authorization) {
        headers.Authorization = `Bearer ${manychatAttachmentToken}`;
        mutated = true;
      }
    }
    if (whatsappGraphToken && (host.includes("facebook.com") || host.includes("whatsapp.net"))) {
      if (!headers.Authorization) {
        headers.Authorization = `Bearer ${whatsappGraphToken}`;
        mutated = true;
      }
      if (!parsed.searchParams.get("access_token")) {
        parsed.searchParams.set("access_token", whatsappGraphToken);
        mutated = true;
      }
    }
    return mutated
      ? {
          url: parsed.toString(),
          headers,
        }
      : source;
  } catch {
    return source;
  }
}

function extractImageSource(payload: any) {
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
    const resolved = buildImageSource(value);
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
    const resolved = buildImageSource(source);
    if (resolved) return resolved;
  }

  const deepString = deepFindStringByKey(payload, (key) => {
    const lower = key.toLowerCase();
    return lower.includes("image_url") || lower === "image" || lower === "media_url";
  });
  return buildImageSource(deepString);
}


let sharpModulePromise: Promise<any> | null = null;
async function loadSharp() {
  if (!sharpModulePromise) {
    sharpModulePromise = import("sharp")
      .then((mod) => (mod.default ? mod.default : mod))
      .catch((error) => {
        console.warn("[manychat-whatsapp] sharp import failed", error);
        return null;
      });
  }
  return sharpModulePromise;
}

async function normalizeImageBuffer(result: ImageBufferResult): Promise<ImageBufferResult> {
  const sharp = await loadSharp();
  if (!sharp) return result;
  try {
    const base = sharp(result.buffer, { failOn: "none", limitInputPixels: 64_000_000 });
    const metadata = await base.metadata();
    let pipeline = sharp(result.buffer, { failOn: "none", limitInputPixels: 64_000_000 }).rotate();
    const width = metadata.width ?? 0;
    if (width > IMAGE_MAX_WIDTH) {
      pipeline = pipeline.resize({
        width: IMAGE_MAX_WIDTH,
        withoutEnlargement: true,
        fit: "inside",
      });
    }
    const output = await pipeline.jpeg({ quality: IMAGE_JPEG_QUALITY }).toBuffer();
    return { buffer: output, contentType: "image/jpeg" };
  } catch (error) {
    console.warn("[manychat-whatsapp] image normalization skipped", (error as Error).message);
    return result;
  }
}

async function maybeNormalizeImage(result: ImageBufferResult): Promise<ImageBufferResult> {
  if (!result.buffer?.length) return result;
  const type = (result.contentType || "").toLowerCase();
  const needsResize =
    result.buffer.byteLength > INLINE_IMAGE_TARGET_BYTES || !type.includes("jpeg");
  if (!needsResize) return result;
  return normalizeImageBuffer(result);
}


type ImageBufferResult = { buffer: Buffer; contentType: string | null };

function buildRequestHeaders(extra?: Record<string, string> | null) {
  return {
    "User-Agent": IMAGE_FETCH_USER_AGENT,
    ...((extra as Record<string, string>) || {}),
  };
}

async function fetchImageUsingFetch(image: ImageSource): Promise<ImageBufferResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(image.url, {
      signal: controller.signal,
      cache: "no-store",
      headers: buildRequestHeaders(image.headers),
    });
    if (!response.ok) {
      throw new Error(`fetch_failed_${response.status}`);
    }
    const contentLength = Number(response.headers.get("content-length") || "0");
    if (contentLength && contentLength > MAX_IMAGE_BYTES) {
      throw new Error("image_too_large");
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("image_too_large");
    }
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get("content-type"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function downloadImageWithNode(image: ImageSource, depth = 0): Promise<ImageBufferResult> {
  return new Promise((resolve, reject) => {
    if (depth > MAX_IMAGE_REDIRECTS) {
      reject(new Error("too_many_redirects"));
      return;
    }
    const urlObject = new URL(image.url);
    const client = urlObject.protocol === "https:" ? https : http;
    const request = client.request(
      urlObject,
      {
        method: "GET",
        headers: buildRequestHeaders(image.headers),
      },
      (response) => {
        const status = response.statusCode || 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          const nextUrl = new URL(response.headers.location, image.url).toString();
          response.resume();
          request.destroy();
          downloadImageWithNode({ ...image, url: nextUrl }, depth + 1).then(resolve).catch(reject);
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`http_status_${status}`));
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        response.on("data", (chunk) => {
          const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += bufferChunk.length;
          if (total > MAX_IMAGE_BYTES) {
            response.destroy();
            reject(new Error("image_too_large"));
            return;
          }
          chunks.push(bufferChunk);
        });
        response.on("end", () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: response.headers["content-type"] || null,
          });
        });
        response.on("error", (error) => {
          reject(error);
        });
      }
    );
    request.setTimeout(IMAGE_FETCH_TIMEOUT_MS, () => {
      request.destroy(new Error("timeout"));
      reject(new Error("timeout"));
    });
    request.on("error", (error) => {
      reject(error);
    });
    request.end();
  });
}

function encodeImageBuffer(buffer: Buffer, contentType?: string | null) {
  const finalType = contentType && contentType.includes("/") ? contentType : "image/jpeg";
  const base64 = buffer.toString("base64");
  return `data:${finalType};base64,${base64}`;
}

function extractSubscriberName(payload: any) {
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

function toNumberOrNull(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPhoneTail(rawPhone: string) {
  const digits = normalizeDigits(rawPhone);
  if (!digits) return null;
  const tail = digits.slice(-10);
  return tail.length >= 6 ? tail : null;
}

function buildExactFilter(columns: string[], value: string | null) {
  if (!value) return "";
  const escaped = value.replace(/,/g, "\\,").replace(/\./g, "\\.");
  return columns.map((column) => `${column}.eq.${escaped}`).join(",");
}

function buildFuzzyTailPattern(tail: string | null) {
  if (!tail) return "";
  const digits = tail.replace(/\D+/g, "");
  if (!digits) return "";
  const fuzzy = digits.split("").join("%");
  return `%${fuzzy}%`;
}

function buildSuffixFilter(columns: string[], tail: string | null) {
  if (!tail) return "";
  const pattern = buildFuzzyTailPattern(tail);
  if (!pattern) return "";
  const escaped = pattern.replace(/,/g, "\\,");
  return columns.map((column) => `${column}.ilike.${escaped}`).join(",");
}

function matchesPhoneTail(phoneValue: string | null | undefined, tail: string | null) {
  if (!phoneValue || !tail) return false;
  const phoneDigits = normalizeDigits(phoneValue);
  const tailDigits = normalizeDigits(tail);
  if (!phoneDigits || !tailDigits) return false;
  const phoneSuffix = phoneDigits.slice(-10);
  const tailSuffix = tailDigits.slice(-10);
  return phoneSuffix === tailSuffix;
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
  const studentEmail = row.student_email || null;
  const parentEmail = row.parent_email || null;
  const studentPhone = row.student_phone || null;
  const parentPhone = row.parent_phone || null;
  const fullName =
    row.student_name || profile?.full_name || studentEmail || parentEmail || null;

  return {
    userId: row.user_id,
    studentId: row.id,
    fullName,
    email: studentEmail || parentEmail || null,
    phone: studentPhone || parentPhone || null,
    studentEmail,
    parentEmail,
    studentPhone,
    parentPhone,
    yearClass: row.year_class || null,
    track: row.track || null,
    status,
    subscriptionTier,
    isBlack,
    source: "black_students",
    aiSummary: row.ai_description || null,
    goal: row.goal || null,
    difficultyFocus: row.difficulty_focus || null,
    readiness: toNumberOrNull(row.readiness),
    riskLevel: row.risk_level || null,
    nextAssessmentSubject: row.next_assessment_subject || null,
    nextAssessmentDate: row.next_assessment_date || null,
    lastContactedAt: row.last_contacted_at || null,
    lastActiveAt: row.last_active_at || null,
    initialAvg: toNumberOrNull(row.initial_avg),
    currentAvg: toNumberOrNull(row.current_avg),
    academicSnapshot: null,
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
    studentEmail: row.email || null,
    parentEmail: null,
    studentPhone: row.phone || null,
    parentPhone: null,
    yearClass: null,
    track: null,
    status: null,
    subscriptionTier,
    isBlack,
    source: "student_profiles",
    aiSummary: null,
    goal: null,
    difficultyFocus: null,
    readiness: null,
    riskLevel: null,
    nextAssessmentSubject: null,
    nextAssessmentDate: null,
    lastContactedAt: null,
    lastActiveAt: null,
    initialAvg: null,
    currentAvg: null,
    academicSnapshot: null,
  };
}

function buildFallbackContact(name: string | null, phone: string | null): ResolvedContact {
  return {
    userId: "guest",
    studentId: null,
    fullName: name || phone,
    email: null,
    phone,
    studentEmail: null,
    parentEmail: null,
    studentPhone: phone,
    parentPhone: null,
    yearClass: null,
    track: null,
    status: null,
    subscriptionTier: null,
    isBlack: false,
    source: "fallback",
    aiSummary: null,
    goal: null,
    difficultyFocus: null,
    readiness: null,
    riskLevel: null,
    nextAssessmentSubject: null,
    nextAssessmentDate: null,
    lastContactedAt: null,
    lastActiveAt: null,
    initialAvg: null,
    currentAvg: null,
    academicSnapshot: null,
  };
}

function formatDateForPrompt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

function sanitizeWhatsappText(value: string) {
  if (!value) return "";
  let text = value.replace(/\r/g, "");
  const emphasisRegexes = [
    /\*\*([\s\S]*?)\*\*/g,
    /__([\s\S]*?)__/g,
    /~~([\s\S]*?)~~/g,
    /`([^`]+)`/g,
  ];
  for (const regex of emphasisRegexes) {
    text = text.replace(regex, "$1");
  }
  text = text.replace(/\\\(/g, "(").replace(/\\\)/g, ")");
  text = text.replace(/\\\[/g, "[").replace(/\\\]/g, "]");
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  text = text.replace(/\$(.*?)\$/g, "$1");
  text = text.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, (match) =>
    match.replace(/\\[a-zA-Z]+/g, "")
  );
  text = text.replace(/\\([a-zA-Z]+)/g, "$1");
  text = text.replace(/^[#>*-]+\s+/gm, "");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  return text;
}

async function fetchStudentAcademicSnapshot(
  db: ReturnType<typeof supabaseServer>,
  studentId: string
): Promise<StudentAcademicSnapshot> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [gradesRes, assessmentsRes] = await Promise.all([
    db
      .from("black_grades")
      .select("subject, score, max_score, when_at")
      .eq("student_id", studentId)
      .order("when_at", { ascending: false })
      .limit(RECENT_GRADES_LIMIT),
    db
      .from("black_assessments")
      .select("subject, when_at")
      .eq("student_id", studentId)
      .gte("when_at", todayIso)
      .order("when_at", { ascending: true })
      .limit(UPCOMING_ASSESSMENTS_LIMIT),
  ]);

  if (gradesRes.error) {
    console.warn("[manychat-whatsapp] grades fetch failed", gradesRes.error.message);
  }
  if (assessmentsRes.error) {
    console.warn("[manychat-whatsapp] assessments fetch failed", assessmentsRes.error.message);
  }

  const latestGrades =
    gradesRes.data?.map((row: any) => ({
      subject: row.subject || null,
      score: toNumberOrNull(row.score),
      max_score: toNumberOrNull(row.max_score),
      when_at: row.when_at || null,
    })) ?? [];

  const upcomingAssessments =
    assessmentsRes.data?.map((row: any) => ({
      subject: row.subject || null,
      when_at: row.when_at || null,
    })) ?? [];

  return { latestGrades, upcomingAssessments };
}

async function ensureAcademicSnapshot({
  db,
  contact,
}: {
  db: ReturnType<typeof supabaseServer>;
  contact: ResolvedContact;
}): Promise<ResolvedContact> {
  if (!contact.studentId || contact.academicSnapshot) return contact;
  try {
    const snapshot = await fetchStudentAcademicSnapshot(db, contact.studentId);
    return { ...contact, academicSnapshot: snapshot };
  } catch (error) {
    console.error("[manychat-whatsapp] academic snapshot failed", error);
    return contact;
  }
}

function escapeTelegramHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function notifyWhatsappMonitor({
  contact,
  subscriberName,
  rawPhone,
  rawMessage,
  processedMessage,
  imageUrl,
}: {
  contact: ResolvedContact;
  subscriberName: string | null;
  rawPhone: string | null;
  rawMessage?: string | null;
  processedMessage: string;
  imageUrl?: string | null;
}) {
  if (!telegramBotToken || !telegramMonitorChats.length) return;
  const name = contact.fullName || subscriberName || "Sconosciuto";
  const intro = contact.isBlack ? "👨‍🎓 Studente Black" : "🧲 Lead WhatsApp";
  const parts: string[] = [
    `${intro}`,
    `👤 <b>${escapeTelegramHtml(name)}</b>`,
  ];
  if (contact.email) parts.push(`✉️ ${escapeTelegramHtml(contact.email)}`);
  if (rawPhone) parts.push(`📞 ${escapeTelegramHtml(rawPhone)}`);
  else if (contact.phone) parts.push(`📞 ${escapeTelegramHtml(contact.phone)}`);
  if (contact.yearClass) parts.push(`🏫 Classe: ${escapeTelegramHtml(contact.yearClass)}`);
  if (contact.track) parts.push(`📚 Percorso: ${escapeTelegramHtml(contact.track)}`);
  const shownText = rawMessage?.trim()
    ? rawMessage
    : imageUrl
    ? "Messaggio senza testo (solo immagine)."
    : processedMessage;
  parts.push(`💬 ${escapeTelegramHtml(shownText)}`);
  if (imageUrl) {
    parts.push(`🖼️ <a href="${escapeTelegramHtml(imageUrl)}">Apri immagine</a>`);
  }
  const text = parts.join("\n");
  await Promise.all(
    telegramMonitorChats.map(async (chatId) => {
      try {
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: !imageUrl,
          }),
        });
      } catch (err) {
        console.error("[manychat-whatsapp] telegram notify failed", err);
      }
    })
  );
}

async function resolveContact(
  db: ReturnType<typeof supabaseServer>,
  phone: string
): Promise<ResolvedContact | null> {
  const normalizedFull = normalizeE164Phone(phone);
  const digitsOnly = normalizeDigits(phone);
  const localDigits = digitsOnly?.replace(/^39/, "");
  const tail = extractPhoneTail(phone);
  const exactCandidates = Array.from(
    new Set(
      [
        normalizedFull,
        digitsOnly ? `+${digitsOnly}` : null,
        digitsOnly || null,
        localDigits ? `+${localDigits}` : null,
        localDigits || null,
      ].filter(Boolean)
    )
  );

  const tryBlackLookup = async (filter: string, tailHint?: string | null) => {
    const { data, error } = await db
      .from("black_students")
      .select(
        "id, user_id, status, year_class, track, student_name, student_email, parent_email, student_phone, parent_phone, ai_description, goal, difficulty_focus, readiness, risk_level, next_assessment_subject, next_assessment_date, last_contacted_at, last_active_at, initial_avg, current_avg, profiles:profiles!black_students_user_id_fkey(full_name, subscription_tier)"
      )
      .or(filter)
      .limit(5);
    if (error) throw new Error(`black_students lookup failed: ${error.message}`);
    const rows = (data as BlackStudentRow[]) || [];
    if (!rows.length) return null;
    const matchByTail =
      tailHint &&
      rows.find(
        (row) =>
          matchesPhoneTail(row.student_phone, tailHint) ||
          matchesPhoneTail(row.parent_phone, tailHint)
      );
    const picked = matchByTail || rows[0];
    if (picked) return mapBlackStudent(picked);
    return null;
  };

  for (const candidate of exactCandidates) {
    const exactFilter = buildExactFilter(["student_phone", "parent_phone"], candidate);
    if (exactFilter) {
      const hit = await tryBlackLookup(exactFilter, tail);
      if (hit) return hit;
    }
  }

  if (tail) {
    const studentFilter = buildSuffixFilter(["student_phone", "parent_phone"], tail);
    if (studentFilter) {
      const hit = await tryBlackLookup(studentFilter, tail);
      if (hit) return hit;
    }
  }

  const tryProfileLookup = async (filter: string, tailHint?: string | null) => {
    const { data, error } = await db
      .from("student_profiles")
      .select("user_id, full_name, phone, email, is_black")
      .or(filter)
      .limit(5);
    if (error) throw new Error(`student_profiles lookup failed: ${error.message}`);
    const rows = (data as StudentProfileRow[]) || [];
    if (!rows.length) return null;
    const matchByTail =
      tailHint && rows.find((row) => matchesPhoneTail(row.phone, tailHint));
    const picked = matchByTail || rows[0];
    if (picked) return mapStudentProfile(picked);
    return null;
  };

  for (const candidate of exactCandidates) {
    const exactProfileFilter = buildExactFilter(["phone"], candidate);
    if (!exactProfileFilter) continue;
    const hit = await tryProfileLookup(exactProfileFilter, tail);
    if (hit) return hit;
  }

  if (tail) {
    const profileFilter = buildSuffixFilter(["phone"], tail);
    if (profileFilter) {
      const hit = await tryProfileLookup(profileFilter, tail);
      if (hit) return hit;
    }
  }

  if (tail) {
    const fallback = await resolveContactFromLogs(db, tail);
    if (fallback) return fallback;
  }

  return null;
}

async function resolveContactFromLogs(
  db: ReturnType<typeof supabaseServer>,
  phoneTail: string
): Promise<ResolvedContact | null> {
  const { data, error } = await db
    .from(WHATSAPP_MESSAGES_TABLE)
    .select("student_id")
    .eq("phone_tail", phoneTail)
    .not("student_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[manychat-whatsapp] history contact lookup failed", error.message);
    return null;
  }
  const studentId = data?.[0]?.student_id;
  if (!studentId) return null;
  const { data: studentRow, error: studentError } = await db
    .from("black_students")
    .select(
      "id, user_id, status, year_class, track, student_name, student_email, parent_email, student_phone, parent_phone, ai_description, goal, difficulty_focus, readiness, risk_level, next_assessment_subject, next_assessment_date, last_contacted_at, last_active_at, initial_avg, current_avg, profiles:profiles!black_students_user_id_fkey(full_name, subscription_tier)"
    )
    .eq("id", studentId)
    .maybeSingle();
  if (studentError) {
    console.error("[manychat-whatsapp] history contact student fetch failed", studentError.message);
    return null;
  }
  if (!studentRow) return null;
  return mapBlackStudent(studentRow as BlackStudentRow);
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

async function downloadImageWithCurl(image: ImageSource): Promise<ImageBufferResult> {
  return new Promise((resolve, reject) => {
    const args = ["-sS", "-L", "--max-time", String(Math.ceil(IMAGE_FETCH_TIMEOUT_MS / 1000)), "-k"];
    if (image.headers) {
      for (const [key, value] of Object.entries(image.headers)) {
        if (!value) continue;
        args.push("-H", `${key}: ${value}`);
      }
    }
    args.push(image.url);
    const proc = spawn("curl", args);
    const chunks: Buffer[] = [];
    let total = 0;
    proc.stdout.on("data", (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > MAX_IMAGE_BYTES) {
        proc.kill("SIGKILL");
        reject(new Error("image_too_large"));
        return;
      }
      chunks.push(buf);
    });
    proc.stderr.resume();
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`curl_exit_${code}`));
        return;
      }
      resolve({ buffer: Buffer.concat(chunks), contentType: null });
    });
  });
}

async function resolveImageDataUrl(image?: ImageSource | string | null): Promise<string | null> {
  if (!image) return null;
  const source =
    typeof image === "string"
      ? { url: image, headers: metaAccessToken ? { Authorization: `Bearer ${metaAccessToken}` } : undefined }
      : image;
  if (!source?.url) return null;
  try {
    const direct = await fetchImageUsingFetch(source);
    console.info("[manychat-whatsapp] primary image fetch success", {
      imageUrl: source.url,
      hasCustomHeaders: Boolean(source.headers),
    });
    const normalized = await maybeNormalizeImage(direct);
    return encodeImageBuffer(normalized.buffer, normalized.contentType || direct.contentType);
  } catch (primaryError) {
    console.warn("[manychat-whatsapp] primary image fetch failed", {
      imageUrl: source?.url,
      hasCustomHeaders: Boolean(source?.headers),
      error: (primaryError as Error).message,
    });
    try {
      const fallback = await downloadImageWithNode(source);
      console.info("[manychat-whatsapp] http fallback success", {
        imageUrl: source.url,
      });
      const normalized = await maybeNormalizeImage(fallback);
      return encodeImageBuffer(normalized.buffer, normalized.contentType || fallback.contentType);
    } catch (secondaryError) {
      console.warn("[manychat-whatsapp] http fallback failed, trying curl", {
        imageUrl: source?.url,
        hasCustomHeaders: Boolean(source?.headers),
        error: (secondaryError as Error).message,
      });
      try {
        const curlResult = await downloadImageWithCurl(source);
        console.info("[manychat-whatsapp] curl image fetch success", {
          imageUrl: source.url,
        });
        const normalized = await maybeNormalizeImage(curlResult);
        return encodeImageBuffer(normalized.buffer, normalized.contentType || curlResult.contentType);
      } catch (curlError) {
        console.error("[manychat-whatsapp] curl image fetch failed", {
          imageUrl: source?.url,
          hasCustomHeaders: Boolean(source?.headers),
          error: (curlError as Error).message,
        });
        return null;
      }
    }
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
  const stamp = new Date().toISOString();
  const baseSelect =
    "id, user_id, status, year_class, track, student_name, student_email, parent_email, student_phone, parent_phone, ai_description, goal, difficulty_focus, readiness, risk_level, next_assessment_subject, next_assessment_date, last_contacted_at, last_active_at, initial_avg, current_avg, profiles:profiles!black_students_user_id_fkey(full_name, subscription_tier)";

  const { data: studentRow, error } = await db
    .from("black_students")
    .select(baseSelect)
    .or(`student_email.ilike.${escaped},parent_email.ilike.${escaped}`)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[manychat-whatsapp] link email failed", error.message);
    return { status: "error" as const };
  }

  if (studentRow?.id) {
    const lowerStudentEmail = (studentRow.student_email || "").toLowerCase();
    const lowerParentEmail = (studentRow.parent_email || "").toLowerCase();
    const isParentEmail = lowerParentEmail === normalized && lowerParentEmail !== lowerStudentEmail;
    const targetColumn = isParentEmail ? "parent_phone" : "student_phone";
    const needsUpdate = !studentRow[targetColumn as keyof typeof studentRow] ||
      studentRow[targetColumn as keyof typeof studentRow] !== phone;
    if (needsUpdate) {
      const { error: updateErr } = await db
        .from("black_students")
        .update({ [targetColumn]: phone, updated_at: stamp })
        .eq("id", studentRow.id);
      if (updateErr) {
        console.error("[manychat-whatsapp] phone update failed", updateErr.message);
        return { status: "error" as const };
      }
      (studentRow as any)[targetColumn] = phone;
    }
    return { status: "linked" as const, studentId: studentRow.id, contact: mapBlackStudent(studentRow as BlackStudentRow) };
  }

  const { data: profileRow, error: profileErr } = await db
    .from("student_profiles")
    .select("user_id, full_name, phone, email, is_black")
    .ilike("email", escaped)
    .maybeSingle();
  if (profileErr) {
    console.error("[manychat-whatsapp] link email profile lookup failed", profileErr.message);
    return { status: "error" as const };
  }
  if (!profileRow) {
    return { status: "not_found" as const };
  }

  let updatedProfile = profileRow;
  if (phone && phone !== profileRow.phone) {
    const { error: updateProfileErr } = await db
      .from("student_profiles")
      .update({ phone, updated_at: stamp })
      .eq("user_id", profileRow.user_id);
    if (updateProfileErr) {
      console.error("[manychat-whatsapp] profile phone update failed", updateProfileErr.message);
    } else {
      updatedProfile = { ...profileRow, phone };
    }
  }

  if (profileRow.is_black) {
    const { data: blackByUser, error: blackByUserErr } = await db
      .from("black_students")
      .select(baseSelect)
      .eq("user_id", profileRow.user_id)
      .limit(1)
      .maybeSingle();
    if (blackByUserErr) {
      console.error("[manychat-whatsapp] link email black lookup by user failed", blackByUserErr.message);
    }
    if (blackByUser) {
      const targetColumn = blackByUser.student_phone ? "parent_phone" : "student_phone";
      const needsUpdate = !blackByUser[targetColumn as keyof typeof blackByUser] ||
        blackByUser[targetColumn as keyof typeof blackByUser] !== phone;
      if (needsUpdate) {
        const { error: updateErr } = await db
          .from("black_students")
          .update({ [targetColumn]: phone, updated_at: stamp })
          .eq("id", blackByUser.id);
        if (updateErr) {
          console.error("[manychat-whatsapp] phone update failed", updateErr.message);
        } else {
          (blackByUser as any)[targetColumn] = phone;
        }
      }
      return { status: "linked" as const, studentId: blackByUser.id, contact: mapBlackStudent(blackByUser as BlackStudentRow) };
    }
    return { status: "linked" as const, studentId: null, contact: mapStudentProfile(updatedProfile as StudentProfileRow) };
  }

  return { status: "not_found" as const, contact: mapStudentProfile(updatedProfile as StudentProfileRow) };
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
  imageDataUrl,
}: {
  message: string;
  history: ConversationMessage[];
  subscriberName: string | null;
  imageDataUrl?: string | null;
}) {
  const defaultReply =
    "Ciao! Sono Luigi di Theoremz Black 👋 Ti spiego subito come funziona il programma se mi dai qualche dettaglio in più.";
  if (!openai) {
    return sanitizeWhatsappText(defaultReply);
  }
  const leadName = subscriberName || "potenziale cliente";
  const formattedHistory = history.map((entry) =>
    entry.role === "user"
      ? `Richiesta precedente: ${entry.content}`
      : `Risposta precedente: ${entry.content}`
  );
  const context = formattedHistory.length ? formattedHistory.join("\n") : "(nessuno)";
  const userPrompt = `Conversazione precedente:
${context}

Nuovo messaggio da ${leadName}:
"""
${message || "Guarda l'immagine allegata e rispondi di conseguenza."}
"""

Rispondi con tono amichevole, chiaro e professionale, includendo call-to-action concrete (es. link theoremz.com/black).`;

  const userContent: any = imageDataUrl
    ? [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : userPrompt;

  const modelToUse = imageDataUrl ? aiVisionModel || "gpt-4o" : aiModel;
  const completion = await openai.chat.completions.create({
    model: modelToUse,
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
        content: userContent,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content?.trim();
  const fallback =
    "Ti racconto volentieri come funziona Theoremz Black: è un percorso personalizzato con tutor e AI, ti mando tutte le info e i link ❤️";
  return sanitizeWhatsappText(content || fallback);
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
  const contactForAI = await ensureAcademicSnapshot({ db, contact: resolvedContact });
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
      contactForAI,
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
    const fallbackMessage = sanitizeWhatsappText(
      "Mi sfugge proprio la risposta giusta 😅 Riprovo tra un attimo oppure scrivimi dentro l'app."
    );
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
  imageDataUrl,
  contact,
}: {
  db: ReturnType<typeof supabaseServer>;
  messageText: string;
  subscriberName: string | null;
  rawPhone: string | null;
  phoneTail: string | null;
  imageUrl?: string | null;
  imageDataUrl?: string | null;
  contact?: ResolvedContact | null;
}) {
  const emailCandidate = extractEmailCandidate(messageText);
  if (emailCandidate) {
    const normalizedPhone = normalizeE164Phone(rawPhone || phoneTail);
    if (!normalizedPhone) {
      return jsonResponse("Per collegarti ho bisogno del numero completo con cui mi stai scrivendo 😊");
    }
    const link = await linkEmailToPhone(db, emailCandidate, normalizedPhone);
    if (link.status === "linked") {
      const refreshedContact =
        (link.contact && link.contact.isBlack ? link.contact : null) ||
        (await resolveContact(db, normalizedPhone));
      if (refreshedContact && refreshedContact.isBlack) {
        return handleBlackConversation({
          db,
          resolvedContact: refreshedContact,
          messageText,
          subscriberName,
          phoneTail: extractPhoneTail(normalizedPhone),
          imageUrl,
          imageDataUrl,
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

  const logStudentId = contact?.studentId || null;
  const { history, total } = await fetchConversationHistory(
    db,
    logStudentId,
    phoneTail
  );
  let runningCount = total;
  await logConversationMessage({
    db,
    studentId: logStudentId,
    phoneTail,
    role: "user",
    content: messageText,
    meta: {
      subscriberName,
      inquiryId: inquiry.id,
      imageUrl,
      contactSource: contact?.source,
    },
  });
  runningCount += 1;

  const reply = await generateInfoReply({
    message: messageText,
    history,
    subscriberName,
    imageDataUrl: imageDataUrl || imageUrl || null,
  });
  await logConversationMessage({
    db,
    studentId: logStudentId,
    phoneTail,
    role: "assistant",
    content: reply,
    meta: { inquiryId: inquiry.id, contactSource: contact?.source },
  });
  runningCount += 1;
  await handleConversationRetention({ db, studentId: null, phoneTail, totalCount: runningCount });
  await updateInquiryCounters({ db, inquiryId: inquiry.id, increment: 2 });
  return jsonResponse(reply, { isBlack: false });
}

function formatAverageForPrompt(current?: number | null, initial?: number | null) {
  const formatValue = (value: number) =>
    Number.isInteger(value) ? String(value) : value?.toFixed(1) ?? "";
  if (current == null && initial == null) return null;
  const currentText = current != null ? `${formatValue(current)}/10` : null;
  const initialText = initial != null ? `${formatValue(initial)}/10` : null;
  if (currentText && initialText) {
    return `Media attuale ${currentText} (iniziale ${initialText})`;
  }
  if (currentText) return `Media attuale ${currentText}`;
  if (initialText) return `Media iniziale ${initialText}`;
  return null;
}

function formatReadinessForPrompt(readiness?: number | null, risk?: string | null) {
  if (readiness == null && !risk) return null;
  const rounded = typeof readiness === "number" ? Math.round(readiness) : null;
  const riskLabel = risk ? ` (${risk})` : "";
  if (rounded == null) return `Livello di rischio${riskLabel}`.trim();
  return `Readiness ${rounded}/100${riskLabel}`;
}

function formatScoreForPrompt(score?: number | null, max?: number | null) {
  const formatValue = (value: number) =>
    Number.isInteger(value) ? String(value) : value?.toFixed(1) ?? "";
  if (score == null && max == null) return null;
  if (score != null && max != null) return `${formatValue(score)}/${formatValue(max)}`;
  const value = score ?? max;
  if (value == null) return null;
  return formatValue(value);
}

function buildGradeSummary(grades?: GradeSnapshot[] | null) {
  if (!grades?.length) return null;
  const formatted = grades
    .map((grade) => {
      if (!grade.subject && grade.score == null) return null;
      const subject = grade.subject || "materia";
      const score = formatScoreForPrompt(grade.score ?? null, grade.max_score ?? null);
      const date = formatDateForPrompt(grade.when_at);
      return [subject, score, date ? `(${date})` : null].filter(Boolean).join(" ");
    })
    .filter(Boolean);
  return formatted.length ? formatted.join("; ") : null;
}

function buildAssessmentSummary(entries?: AssessmentSnapshot[] | null) {
  if (!entries?.length) return null;
  const formatted = entries
    .map((assessment) => {
      if (!assessment.subject && !assessment.when_at) return null;
      const subject = assessment.subject || "verifica";
      const date = formatDateForPrompt(assessment.when_at);
      return date ? `${subject} ${date}` : subject;
    })
    .filter(Boolean);
  return formatted.length ? formatted.join("; ") : null;
}

function buildSystemPrompt(contact: ResolvedContact) {
  const persona =
    personaOverride?.trim() ||
    "Sei Luigi Miraglia, fondatore di Theoremz Black. Rispondi su WhatsApp ai tuoi studenti in prima persona, tono amichevole ma autorevole. Dai consigli pratici, sii diretto e conciso (2-3 paragrafi o meno).";

  const details: string[] = [];
  if (contact.fullName) details.push(`Nome: ${contact.fullName}`);
  if (contact.yearClass) details.push(`Classe: ${contact.yearClass}`);
  if (contact.track) details.push(`Percorso: ${contact.track}`);
  if (contact.studentEmail) details.push(`Email studente: ${contact.studentEmail}`);
  if (contact.parentEmail) details.push(`Email genitore: ${contact.parentEmail}`);
  if (!contact.studentEmail && contact.email) details.push(`Email principale: ${contact.email}`);
  if (contact.studentPhone) details.push(`Telefono studente: ${contact.studentPhone}`);
  if (contact.parentPhone && contact.parentPhone !== contact.studentPhone) {
    details.push(`Telefono genitore: ${contact.parentPhone}`);
  } else if (contact.phone && !contact.studentPhone) {
    details.push(`Telefono principale: ${contact.phone}`);
  }

  const header = details.length
    ? `Dati sullo studente:
${details.join("\n")}`
    : "Non hai dati aggiuntivi sullo studente oltre al messaggio.";

  const academicLines: string[] = [];
  const readinessLine = formatReadinessForPrompt(contact.readiness, contact.riskLevel);
  if (readinessLine) academicLines.push(readinessLine);
  const avgLine = formatAverageForPrompt(contact.currentAvg, contact.initialAvg);
  if (avgLine) academicLines.push(avgLine);
  if (contact.goal) academicLines.push(`Goal dichiarato: ${contact.goal}`);
  if (contact.difficultyFocus) {
    academicLines.push(`Difficoltà principali: ${contact.difficultyFocus}`);
  }
  if (contact.nextAssessmentSubject || contact.nextAssessmentDate) {
    const date = formatDateForPrompt(contact.nextAssessmentDate);
    academicLines.push(
      `Prossima verifica: ${contact.nextAssessmentSubject || "materia"}${
        date ? ` ${date}` : ""
      }`
    );
  }
  const latestGradesSummary = buildGradeSummary(contact.academicSnapshot?.latestGrades);
  if (latestGradesSummary) academicLines.push(`Ultimi voti: ${latestGradesSummary}`);
  const upcomingAssessmentsSummary = buildAssessmentSummary(
    contact.academicSnapshot?.upcomingAssessments
  );
  if (upcomingAssessmentsSummary) {
    academicLines.push(`Verifiche in agenda: ${upcomingAssessmentsSummary}`);
  }

  const academicBlock = academicLines.length
    ? `Dati accademici disponibili:
${academicLines.join("\n")}`
    : "";

  const summarySection = contact.aiSummary ? `Nota tutor esistente:\n${contact.aiSummary}` : "";
  const contextSections = [header, academicBlock, summarySection].filter(Boolean);
  const contextText = contextSections.join("\n\n");

  return `${persona}

${contextText}

Regole:
- Rispondi sempre in italiano e in prima persona come Luigi, ma non aggiungere firme o nomi alla fine.
- Mantieni uno stile da WhatsApp: frasi brevi, niente markdown complesso o Latex.
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

  const temperature = Number.isFinite(aiTemperature) ? aiTemperature : 0.4;
  const maxTokens = Number.isFinite(aiMaxTokens) ? aiMaxTokens : 320;

  if (imageUrl) {
    const userMessage: any = {
      role: "user",
      content: [
        { type: "text", text: userContent },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    };
    const baseMessages = [{ role: "system", content: systemPrompt }, ...formattedHistory];
    const candidates = Array.from(
      new Set(
        [
          (aiVisionModel && aiVisionModel.trim()) || "gpt-4o",
          aiModel && aiModel.trim(),
        ].filter(Boolean)
      )
    );
    let lastError: any = null;
    for (const modelName of candidates) {
      try {
        const completion = await openai.chat.completions.create({
          model: modelName,
          temperature,
          max_tokens: maxTokens,
          messages: [...baseMessages, userMessage],
        });
        const content = completion.choices[0]?.message?.content || "";
        const trimmed = content.trim();
        if (trimmed) return sanitizeWhatsappText(trimmed);
        return sanitizeWhatsappText("Fammi un attimo capire meglio la situazione 😊");
      } catch (error) {
        lastError = error;
        const status = (error as any)?.status ?? (error as any)?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          console.warn("[manychat-whatsapp] vision model unavailable, retrying fallback", {
            model: modelName,
            error: (error as Error).message,
          });
          continue;
        }
        throw error;
      }
    }
    if (lastError) throw lastError;
  }

  const completion = await openai.chat.completions.create({
    model: aiModel,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: userContent },
    ],
  });

  const content = completion.choices[0]?.message?.content || "";
  const trimmed = content.trim();
  return sanitizeWhatsappText(trimmed || "Fammi un attimo capire meglio la situazione 😊");
}

type WhatsAppMessageInput = {
  messageText: string;
  subscriberName: string | null;
  rawPhone: string | null;
  imageUrl?: string | null;
};

async function handleWhatsAppMessage({
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
  const remoteImageUrl = imageUrl ?? null;

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

  const resolvedContact = contact ?? buildFallbackContact(subscriberName, rawPhone);

  notifyWhatsappMonitor({
    contact: resolvedContact,
    subscriberName,
    rawPhone,
    rawMessage: messageText,
    processedMessage: messageText,
    imageUrl,
  }).catch((err) => console.error("[manychat-whatsapp] telegram monitor error", err));

  if (resolvedContact.isBlack) {
    return handleBlackConversation({
      db,
      resolvedContact,
      messageText,
      subscriberName,
      phoneTail,
      imageUrl: remoteImageUrl,
      imageDataUrl: resolvedImageDataUrl,
    });
  }

  return handleLeadConversation({
    db,
    messageText,
    subscriberName,
    rawPhone,
    phoneTail,
    imageUrl: remoteImageUrl,
    imageDataUrl: resolvedImageDataUrl,
    contact: resolvedContact,
  });
}

export async function POST(req: Request) {
  if (!openai) return missingConfigResponse("missing_openai_api_key");
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages;
  if (!messages?.length) {
    return NextResponse.json({ ok: true });
  }

  const phoneNumberId = value?.metadata?.phone_number_id || cloudPhoneNumberId;
  if (!phoneNumberId) {
    console.error("[whatsapp-cloud] missing phone_number_id");
    return NextResponse.json({ error: "missing_phone_number_id" }, { status: 500 });
  }

  for (const message of messages) {
    const rawPhone = message?.from || value?.contacts?.[0]?.wa_id || null;
    if (!rawPhone) continue;
    const subscriberName = value?.contacts?.[0]?.profile?.name || null;
    const text = extractCloudText(message);
    let imageUrl: string | null = null;
    if (message?.type === "image") {
      imageUrl = buildGraphImageUrl(message.image?.id);
    } else if (message?.document?.mime_type?.startsWith("image/")) {
      imageUrl = buildGraphImageUrl(message.document?.id);
    }

    const response = await handleWhatsAppMessage({
      messageText: text || IMAGE_ONLY_PROMPT,
      subscriberName,
      rawPhone,
      imageUrl,
    });

    const replyPayload = await response.json().catch(() => null);
    const replyText =
      replyPayload?.content?.text ||
      replyPayload?.text ||
      replyPayload?.message ||
      "Fammi capire meglio la situazione 😊";
    await sendCloudReply({ phoneNumberId, to: rawPhone, body: replyText });
  }

  return NextResponse.json({ ok: true });
}

function extractCloudText(message: any): string | null {
  if (!message) return null;
  const type = message.type;
  if (type === "text") return message.text?.body || null;
  if (type === "button") return message.button?.text || null;
  if (type === "interactive") {
    const interactive = message.interactive;
    if (!interactive) return null;
    if (interactive.type === "list_reply") {
      return interactive.list_reply?.title || interactive.list_reply?.description || null;
    }
    if (interactive.type === "button_reply") {
      return interactive.button_reply?.title || null;
    }
    return interactive?.body?.text || null;
  }
  if (type === "sticker") return "Lo sticker non contiene testo.";
  return message[type]?.caption || null;
}

function buildGraphImageUrl(mediaId?: string | null) {
  if (!mediaId || !metaAccessToken) return null;
  const token = encodeURIComponent(metaAccessToken);
  return `https://graph.facebook.com/${graphApiVersion || "v20.0"}/${mediaId}/media?access_token=${token}`;
}

async function sendCloudReply({
  phoneNumberId,
  to,
  body,
}: {
  phoneNumberId: string;
  to: string;
  body: string;
}) {
  if (!metaAccessToken) {
    console.error("[whatsapp-cloud] missing META_ACCESS_TOKEN");
    return;
  }
  const endpoint = `https://graph.facebook.com/${graphApiVersion || "v20.0"}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${metaAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorPayload = await res.json().catch(() => ({ error: res.statusText }));
    console.error("[whatsapp-cloud] send failed", errorPayload);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && challenge && graphVerifyToken && token === graphVerifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
