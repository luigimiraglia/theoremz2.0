import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const webhookSecret = process.env.MANYCHAT_WEBHOOK_SECRET;
const personaOverride = process.env.MANYCHAT_WHATSAPP_PERSONA;
const aiModel = process.env.MANYCHAT_OPENAI_MODEL || "gpt-4o-mini";
const aiMaxTokens = Number(process.env.MANYCHAT_OPENAI_MAX_TOKENS || 320);
const aiTemperature = Number(process.env.MANYCHAT_OPENAI_TEMPERATURE || 0.4);

const ACTIVE_BLACK_STATUSES = new Set([
  "active",
  "trial",
  "trialing",
  "past_due",
  "unpaid",
]);

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
  student_email?: string | null;
  parent_email?: string | null;
  student_phone?: string | null;
  parent_phone?: string | null;
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
  fullName: string | null;
  email: string | null;
  phone: string | null;
  yearClass: string | null;
  track: string | null;
  status: string | null;
  subscriptionTier: string | null;
  isBlack: boolean;
  source: "black_students" | "student_profiles" | "fallback";
};

function jsonResponse(message: string, status = 200) {
  return NextResponse.json(
    {
      version: "v2",
      content: { type: "text", text: message },
    },
    { status }
  );
}

function missingConfigResponse(reason: string) {
  return NextResponse.json({ error: reason }, { status: 500 });
}

function getStringAtPath(payload: any, path: string[]) {
  let current: any = payload;
  for (const key of path) {
    if (current === null || current === undefined) return null;
    current = current[key];
  }
  return typeof current === "string" ? current.trim() || null : null;
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

function buildFuzzyPattern(digits: string) {
  const tailLength = Math.min(8, digits.length);
  const tail = digits.slice(-tailLength);
  if (tail.length < 6) return null;
  return `%${tail.split("").join("%")}%`;
}

function buildPhoneFilters(rawPhone: string) {
  const digits = normalizeDigits(rawPhone);
  if (!digits) return { eq: [], fuzzy: null };
  const variants = new Set<string>();
  const push = (value?: string | null) => {
    if (!value) return;
    const cleaned = value.replace(/\s+/g, "");
    if (cleaned.length >= 6) variants.add(cleaned);
  };

  push(digits);
  if (digits.startsWith("00") && digits.length > 6) push(digits.slice(2));
  if (digits.startsWith("0039") && digits.length > 6) push(digits.slice(4));
  if (digits.startsWith("39") && digits.length > 6) push(digits.slice(2));
  if (digits.startsWith("0") && digits.length > 6) push(digits.slice(1));

  const trimmedLeadingZeros = digits.replace(/^0+/, "");
  if (trimmedLeadingZeros.length >= 6) {
    push(`39${trimmedLeadingZeros}`);
    push(`0039${trimmedLeadingZeros}`);
  }

  const eqValues = new Set<string>();
  for (const value of variants) {
    eqValues.add(value);
    eqValues.add(`+${value.replace(/^\+/, "")}`);
  }

  const fuzzy = buildFuzzyPattern(digits);
  return { eq: Array.from(eqValues), fuzzy };
}

function buildOrFilter(columns: string[], eqValues: string[], fuzzy?: string | null) {
  const parts: string[] = [];
  for (const column of columns) {
    for (const value of eqValues) {
      parts.push(`${column}.eq.${value}`);
    }
    if (fuzzy) {
      parts.push(`${column}.ilike.${fuzzy}`);
    }
  }
  return parts.join(",");
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
  const fullName = profile?.full_name || row.student_email || row.parent_email || null;

  return {
    userId: row.user_id,
    fullName,
    email: row.student_email || row.parent_email || null,
    phone: row.student_phone || row.parent_phone || null,
    yearClass: row.year_class || null,
    track: row.track || null,
    status,
    subscriptionTier,
    isBlack,
    source: "black_students",
  };
}

function mapStudentProfile(row: StudentProfileRow): ResolvedContact {
  const subscriptionTier = row.is_black ? "black" : null;
  const isBlack = Boolean(row.is_black);
  return {
    userId: row.user_id,
    fullName: row.full_name || row.email || null,
    email: row.email || null,
    phone: row.phone || null,
    yearClass: null,
    track: null,
    status: null,
    subscriptionTier,
    isBlack,
    source: "student_profiles",
  };
}

function buildFallbackContact(name: string | null, phone: string | null): ResolvedContact {
  return {
    userId: "guest",
    fullName: name,
    email: null,
    phone,
    yearClass: null,
    track: null,
    status: null,
    subscriptionTier: null,
    isBlack: false,
    source: "fallback",
  };
}

async function resolveContact(
  db: ReturnType<typeof supabaseServer>,
  phone: string
): Promise<ResolvedContact | null> {
  const { eq, fuzzy } = buildPhoneFilters(phone);
  if (!eq.length && !fuzzy) return null;

  const studentFilter = buildOrFilter(["student_phone", "parent_phone"], eq, fuzzy);
  if (studentFilter) {
    const { data, error } = await db
      .from("black_students")
      .select(
        "id, user_id, status, year_class, track, student_email, parent_email, student_phone, parent_phone, profiles:profiles!black_students_user_id_fkey(full_name, subscription_tier)"
      )
      .or(studentFilter)
      .limit(1);
    if (error) throw new Error(`black_students lookup failed: ${error.message}`);
    if (data && data.length) {
      return mapBlackStudent(data[0] as BlackStudentRow);
    }
  }

  const profileFilter = buildOrFilter(["phone"], eq, fuzzy);
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

  return `${persona}

${header}

Regole:
- Rispondi sempre in italiano e firma idealmente come Luigi.
- Mantieni uno stile da WhatsApp: frasi brevi, niente markdown complesso.
- Se servono follow-up, proponili in modo naturale (es. "ti va se ne parliamo in call?").
- Se non hai abbastanza contesto, fai domande mirate invece di inventare dettagli.`;
}

async function generateAiReply(contact: ResolvedContact, message: string, subscriberName: string | null) {
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

  const completion = await openai.chat.completions.create({
    model: aiModel,
    temperature: Number.isFinite(aiTemperature) ? aiTemperature : 0.4,
    max_tokens: Number.isFinite(aiMaxTokens) ? aiMaxTokens : 320,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const content = completion.choices[0]?.message?.content || "";
  return content.trim() || "Fammi un attimo capire meglio la situazione 😊";
}

function verifySecret(req: Request) {
  if (!webhookSecret) return null;
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return "missing_authorization";
  const expected = `Bearer ${webhookSecret}`;
  return authHeader === expected ? null : "invalid_authorization";
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

  const db = supabaseServer();
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
      "Questo numero non risulta abbonato a Theoremz Black. Se pensi sia un errore, scrivimi a team@theoremz.com 💌"
    );
  }

  try {
    const resolvedContact = contact ?? buildFallbackContact(subscriberName, rawPhone);
    const reply = await generateAiReply(resolvedContact, messageText, subscriberName);
    return jsonResponse(reply);
  } catch (error) {
    console.error("[manychat-whatsapp] ai error", error);
    return jsonResponse(
      "Mi sfugge proprio la risposta giusta 😅 Riprovo tra un attimo oppure scrivimi dentro l'app."
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
