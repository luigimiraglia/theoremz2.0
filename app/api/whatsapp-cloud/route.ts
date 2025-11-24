import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase";

const verifyToken = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN?.trim() || "";
const graphApiVersion = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";
const cloudPhoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() || "";
const metaAccessToken = process.env.META_ACCESS_TOKEN?.trim() || "";
const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || "";
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const VISION_MODEL = "gpt-4o";
const IMAGE_ONLY_PROMPT = "Guarda l'immagine allegata e dimmi come posso aiutarti.";
const HAS_SUPABASE_ENV = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = HAS_SUPABASE_ENV ? supabaseServer() : null;
const WHATSAPP_MESSAGES_TABLE = "black_whatsapp_messages";
const WHATSAPP_CONVERSATIONS_TABLE = "black_whatsapp_conversations";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
const OPERATOR_CHAT_IDS: number[] = (process.env.WHATSAPP_OPERATOR_CHAT_IDS || "")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v))
  .slice(0, 5);
const HISTORY_LIMIT = 20;
const SUMMARY_THRESHOLD = 70;
const PRUNE_DELETE_COUNT = 50;
const ASK_EMAIL_MESSAGE = "Non trovo un abbonamento Black con questo numero. Scrivimi l'email del tuo account così lo collego.";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && verifyToken && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
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
    const phoneE164 = normalizePhone(rawPhone);
    const text = extractCloudText(message);
    const imageSource = buildImageSourceFromCloud(message);
    const imageDataUrl = imageSource ? await downloadImageAsDataUrl(imageSource) : null;
    const phoneTail = extractPhoneTail(rawPhone);
    const studentResult = await fetchBlackStudentWithContext(phoneTail);
    const baseConversation = await fetchConversation(phoneTail);
    const conversationType = deriveConversationType(baseConversation?.type as ConversationType, studentResult?.student || null);
    const conversationStatus = (baseConversation?.status as ConversationStatus) || "waiting_tutor";

    const inboundText =
      text && imageDataUrl
        ? `${text}\n\n(Nota: è presente anche un'immagine allegata.)`
        : text || IMAGE_ONLY_PROMPT;

    const conversation = await upsertConversation({
      phoneTail,
      phoneE164,
      studentId: studentResult?.student.id,
      status: conversationStatus,
      type: conversationType,
      lastMessage: inboundText,
      bot: baseConversation?.bot ?? null,
    });

    // Log inbound message
    await logConversationMessage(studentResult?.student.id || null, phoneTail, "user", inboundText);

    if (conversationStatus !== "bot") {
      await notifyOperators({
        conversation: {
          ...(conversation || { phone_tail: phoneTail }),
          status: conversationStatus,
          type: conversationType,
        },
        text: text || "(nessun testo, solo media)",
        rawPhone,
      });
      // Optional soft ack for first contact
      if (!baseConversation?.last_message_at && phoneE164) {
        await sendCloudReply({
          phoneNumberId,
          to: rawPhone,
          body: "Grazie, ti risponde un tutor a breve.",
        });
      }
      continue;
    }

    // BOT mode
    if (!studentResult) {
      const emailCandidate = extractEmailCandidate(text);
      if (emailCandidate && supabase) {
        const linked = await linkEmailToPhone(emailCandidate, rawPhone);
        if (linked) {
          const refreshed = await fetchBlackStudentWithContext(extractPhoneTail(rawPhone));
          if (refreshed) {
            const { student, contextText } = refreshed;
            const historyResult = await fetchConversationHistory(student.id, phoneTail, HISTORY_LIMIT);
            const emailOnly =
              emailCandidate &&
              text &&
              text.trim().toLowerCase() === emailCandidate.trim().toLowerCase();
            const promptText =
              text && imageDataUrl
                ? `${text}\n\n(Nota: è presente anche un'immagine allegata.)`
                : text || IMAGE_ONLY_PROMPT;
            const reply = emailOnly
              ? "Perfetto, ho collegato la tua email all'account. Scrivimi pure la domanda o manda una foto dell'esercizio."
              : await generateReply(promptText, imageDataUrl, contextText, historyResult.history);
            await logConversationMessage(student.id, phoneTail, "assistant", reply);
            const totalCount = historyResult.total + 1;
            if (totalCount >= SUMMARY_THRESHOLD) {
              await summarizeAndPrune(student.id);
            }
            await upsertConversation({
              phoneTail,
              phoneE164,
              studentId: student.id,
              status: "bot",
              type: "black",
              lastMessage: reply,
            });
            await sendCloudReply({ phoneNumberId, to: rawPhone, body: reply || "Ciao" });
            continue;
          }
          await sendCloudReply({
            phoneNumberId,
            to: rawPhone,
            body: "Ho collegato la mail, scrivimi di nuovo il messaggio così ti rispondo.",
          });
          continue;
        }
      }
      const reply =
        conversationType === "prospect" || conversationType === "altro"
          ? await generateSalesReply(text || "")
          : ASK_EMAIL_MESSAGE;
      await logConversationMessage(null, phoneTail, "assistant", reply);
      await upsertConversation({
        phoneTail,
        phoneE164,
        status: "bot",
        type: conversationType,
        lastMessage: reply,
      });
      await sendCloudReply({ phoneNumberId, to: rawPhone, body: reply || "Ciao" });
      continue;
    }

    const { student, contextText } = studentResult;
    const historyResult = await fetchConversationHistory(student.id, phoneTail, HISTORY_LIMIT);
    const reply = await generateReply(inboundText, imageDataUrl, contextText, historyResult.history);

    await logConversationMessage(student.id, phoneTail, "assistant", reply);
    const totalCount = historyResult.total + 1;
    if (totalCount >= SUMMARY_THRESHOLD) {
      await summarizeAndPrune(student.id);
    }

    await upsertConversation({
      phoneTail,
      phoneE164,
      studentId: student.id,
      status: "bot",
      type: "black",
      lastMessage: reply,
    });

    await sendCloudReply({ phoneNumberId, to: rawPhone, body: reply || "Ciao" });
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

type CloudImage = {
  id: string;
  mime_type?: string;
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type ConversationStatus = "bot" | "waiting_tutor" | "tutor";
type ConversationType = "black" | "prospect" | "genitore" | "insegnante" | "altro";

function extractPhoneTail(rawPhone: string | null) {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D+/g, "");
  if (digits.length < 6) return null;
  return digits.slice(-10);
}

type BlackStudentRow = {
  id: string;
  student_name?: string | null;
  student_email?: string | null;
  parent_email?: string | null;
  year_class?: string | null;
  track?: string | null;
  goal?: string | null;
  difficulty_focus?: string | null;
  readiness?: number | null;
  ai_description?: string | null;
  next_assessment_subject?: string | null;
  next_assessment_date?: string | null;
};

async function fetchBlackStudentWithContext(phoneTail: string | null): Promise<{ student: BlackStudentRow; contextText: string | null } | null> {
  if (!phoneTail || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("black_students")
      .select(
        "id, student_name, student_email, parent_email, year_class, track, goal, difficulty_focus, readiness, ai_description, next_assessment_subject, next_assessment_date"
      )
      .eq("status", "active")
      .or(`student_phone.ilike.%${phoneTail},parent_phone.ilike.%${phoneTail}`)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[whatsapp-cloud] supabase context lookup error", error);
      return null;
    }
    if (!data) return null;
    const contextText = buildStudentContext(data as BlackStudentRow);
    return { student: data as BlackStudentRow, contextText };
  } catch (err) {
    console.error("[whatsapp-cloud] context fetch failed", err);
    return null;
  }
}

function buildStudentContext(student: BlackStudentRow | null) {
  if (!student) return null;
  const parts: string[] = [];
  if (student.student_name) parts.push(`Nome: ${student.student_name}`);
  if (student.student_email) parts.push(`Email studente: ${student.student_email}`);
  if (student.parent_email) parts.push(`Email genitore: ${student.parent_email}`);
  if (student.year_class) parts.push(`Classe: ${student.year_class}`);
  if (student.track) parts.push(`Percorso: ${student.track}`);
  if (student.goal) parts.push(`Goal: ${student.goal}`);
  if (student.difficulty_focus) parts.push(`Difficoltà: ${student.difficulty_focus}`);
  if (typeof student.readiness === "number") parts.push(`Readiness: ${student.readiness}/100`);
  if (student.next_assessment_subject || student.next_assessment_date) {
    const dateLabel = student.next_assessment_date || "";
    parts.push(`Prossima verifica: ${student.next_assessment_subject || "—"} ${dateLabel}`.trim());
  }
  if (student.ai_description) {
    parts.push(`Nota tutor: ${student.ai_description}`);
  }
  return parts.length ? parts.join("\n") : null;
}

function extractEmailCandidate(text?: string | null) {
  if (!text) return null;
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function normalizePhone(raw: string | null) {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith("00")) normalized = normalized.slice(2);
  if (normalized.startsWith("0") && normalized.length > 9) normalized = normalized.replace(/^0+/, "");
  if (!normalized.startsWith("39") && normalized.length === 10) {
    normalized = `39${normalized}`;
  }
  return `+${normalized}`;
}

type ConversationRow = {
  id?: string;
  phone_tail: string;
  phone_e164?: string | null;
  student_id?: string | null;
  status?: ConversationStatus;
  type?: ConversationType;
  bot?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
};

function deriveConversationType(existing: ConversationType | null | undefined, student: BlackStudentRow | null) {
  if (existing) return existing;
  return student ? "black" : "prospect";
}

async function fetchConversation(phoneTail: string | null): Promise<ConversationRow | null> {
  if (!supabase || !phoneTail) return null;
  try {
    const { data, error } = await supabase
      .from(WHATSAPP_CONVERSATIONS_TABLE)
      .select("*")
      .eq("phone_tail", phoneTail)
      .maybeSingle();
    if (error) throw error;
    return (data as ConversationRow) || null;
  } catch (err) {
    console.error("[whatsapp-cloud] conversation fetch failed", err);
    return null;
  }
}

async function upsertConversation({
  phoneTail,
  phoneE164,
  studentId,
  status,
  type,
  bot,
  lastMessage,
}: {
  phoneTail: string | null;
  phoneE164?: string | null;
  studentId?: string | null;
  status?: ConversationStatus | null;
  type?: ConversationType | null;
  bot?: string | null;
  lastMessage?: string | null;
}): Promise<ConversationRow | null> {
  if (!supabase || !phoneTail) return null;
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    phone_tail: phoneTail,
    updated_at: now,
  };
  if (phoneE164) payload.phone_e164 = phoneE164;
  if (studentId) payload.student_id = studentId;
  if (status) payload.status = status;
  if (type) payload.type = type;
  if (bot !== undefined) payload.bot = bot;
  if (lastMessage) {
    payload.last_message_at = now;
    payload.last_message_preview = lastMessage.replace(/\s+/g, " ").slice(0, 200);
  }
  try {
    const { data, error } = await supabase
      .from(WHATSAPP_CONVERSATIONS_TABLE)
      .upsert(payload, { onConflict: "phone_tail" })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as ConversationRow) || null;
  } catch (err) {
    console.error("[whatsapp-cloud] conversation upsert failed", err);
    return null;
  }
}

async function notifyOperators({
  conversation,
  text,
  rawPhone,
}: {
  conversation: ConversationRow;
  text: string | null | undefined;
  rawPhone: string | null;
}) {
  if (!TELEGRAM_BOT_TOKEN || !OPERATOR_CHAT_IDS.length) return;
  const status = conversation.status || "waiting_tutor";
  const type = conversation.type || "prospect";
  const header = `💬 WA (${status}) — ${type}`;
  const phoneLine = `Numero: ${rawPhone || conversation.phone_e164 || conversation.phone_tail}`;
  const convIdLine = conversation.id ? `ID: ${conversation.id}` : null;
  const body = text || "(messaggio senza testo)";
  const hints =
    "Comandi: /wa <telefono|email|nome> messaggio · /wastatus <telefono> bot|waiting|tutor · /watype <telefono> black|prospect|genitore|insegnante|altro · /wabot <telefono> nome_bot";
  const message = [header, phoneLine, convIdLine, "", body, "", hints]
    .filter(Boolean)
    .join("\n");
  await Promise.all(
    OPERATOR_CHAT_IDS.map((chatId) =>
      sendTelegramMessage(chatId, message).catch((err) =>
        console.error("[whatsapp-cloud] notify operator failed", { chatId, err })
      )
    )
  );
}

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function linkEmailToPhone(email: string, rawPhone: string | null) {
  if (!supabase) return false;
  const normalizedPhone = normalizePhone(rawPhone);
  if (!normalizedPhone) return false;
  try {
    const { data, error } = await supabase
      .from("black_students")
      .select("id, student_phone, parent_phone")
      .or(`student_email.ilike.${email},parent_email.ilike.${email}`)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[whatsapp-cloud] link email lookup error", error);
      return false;
    }
    if (!data?.id) return false;
    const targetColumn = data.student_phone ? "parent_phone" : "student_phone";
    if (data[targetColumn as "student_phone" | "parent_phone"] === normalizedPhone) {
      return true;
    }
    const { error: updateErr } = await supabase
      .from("black_students")
      .update({ [targetColumn]: normalizedPhone, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updateErr) {
      console.error("[whatsapp-cloud] link email update error", updateErr);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp-cloud] link email failure", err);
    return false;
  }
}

function buildImageSourceFromCloud(message: any): CloudImage | null {
  if (!message) return null;
  if (message.type === "image" && message.image?.id) {
    return { id: message.image.id, mime_type: message.image.mime_type };
  }
  if (message.document?.mime_type?.startsWith("image/") && message.document?.id) {
    return { id: message.document.id, mime_type: message.document.mime_type };
  }
  return null;
}

async function downloadImageAsDataUrl(image: CloudImage) {
  if (!image?.id || !metaAccessToken) return null;
  const url = `https://graph.facebook.com/${graphApiVersion}/${image.id}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${metaAccessToken}` };

  try {
    let targetUrl = url;
    let mimeType: string | null = image.mime_type || null;

    // First call may return JSON with signed URL
    const metaRes = await fetch(targetUrl, { headers });
    if (!metaRes.ok) throw new Error(`graph_meta_${metaRes.status}`);

    const metaContentType = metaRes.headers.get("content-type") || "";
    if (metaContentType.includes("application/json")) {
      const metaJson = await metaRes.json();
      if (metaJson?.url) {
        targetUrl = metaJson.url;
        mimeType = metaJson?.mime_type || mimeType;
      } else {
        throw new Error("graph_meta_missing_url");
      }
    } else {
      // metadata already returned binary
      const arrayBuffer = await metaRes.arrayBuffer();
      const contentType = metaRes.headers.get("content-type") || mimeType || "image/jpeg";
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return `data:${contentType};base64,${base64}`;
    }

    const mediaRes = await fetch(targetUrl, { headers });
    if (!mediaRes.ok) throw new Error(`graph_media_${mediaRes.status}`);
    const arrayBuffer = await mediaRes.arrayBuffer();
    const contentType = mediaRes.headers.get("content-type") || mimeType || "image/jpeg";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("[whatsapp-cloud] image download failed", { id: image?.id, error });
    return null;
  }
}

async function generateReply(
  text: string,
  imageDataUrl?: string | null,
  studentContext?: string | null,
  history?: ConversationMessage[]
) {
  if (!openai) return "Ciao! Non riesco a rispondere ora perché manca la configurazione dell'AI.";
  const systemPromptBase = `Sei Luigi Miraglia, tutor di matematica di Theoremz Black. Rispondi ai messaggi WhatsApp in italiano, con tono umano e poche frasi.
Obiettivi:
- Capisci cosa chiede lo studente (anche dalle immagini) e fornisci spiegazioni chiare.
- Se la domanda è ambigua, chiedi tu chiarimenti specifici.
- Non offrire call o link promozionali finché non sono richiesti.
- NON usare Latex, Markdown, simboli speciali o formattazioni: rispondi solo in testo semplice, con formule scritte in modo leggibile su WhatsApp (es: 2x^2 + 3x = 5, (a+b)^2 = a^2 + 2ab + b^2).
- Spiega in modo facilissimo e super esplicito, tono naturale e umano. Spezza in frasi brevi, aggiungi righe vuote per leggibilità quando utile.`;
  const contextBlock =
    studentContext && typeof studentContext === "string"
      ? `\n\nDati sullo studente (usa solo se pertinenti, altrimenti ignora):\n${studentContext}`
      : "";
  const systemPrompt = `${systemPromptBase}${contextBlock}`;

  const formattedHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = (history || []).map(
    (item) => ({
      role: item.role,
      content: item.content,
    })
  );

  const userMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = imageDataUrl
    ? {
        role: "user",
        content: [
          { type: "text", text },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      }
    : { role: "user", content: text };

  try {
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.4,
      max_tokens: 320,
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        userMessage,
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || "Ciao!";
  } catch (error) {
    console.error("[whatsapp-cloud] openai error", error);
    return "Non riesco a rispondere ora per un errore tecnico.";
  }
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
  const endpoint = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${metaAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errPayload = await response.json().catch(() => ({ error: response.statusText }));
    console.error("[whatsapp-cloud] send failed", errPayload);
  }
}

async function fetchConversationHistory(
  studentId: string | null,
  phoneTail: string | null,
  limit = HISTORY_LIMIT
): Promise<{ history: ConversationMessage[]; total: number }> {
  if (!supabase) return { history: [], total: 0 };
  try {
    const query = supabase.from(WHATSAPP_MESSAGES_TABLE).select("role, content", { count: "exact" });
    if (studentId) {
      query.eq("student_id", studentId);
    } else if (phoneTail) {
      query.eq("phone_tail", phoneTail);
    } else {
      return { history: [], total: 0 };
    }
    const { data, error, count } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return {
      history: (data || []).reverse() as ConversationMessage[],
      total: typeof count === "number" ? count : data?.length || 0,
    };
  } catch (err) {
    console.error("[whatsapp-cloud] history fetch failed", err);
    return { history: [], total: 0 };
  }
}

async function logConversationMessage(
  studentId: string | null,
  phoneTail: string | null,
  role: "user" | "assistant",
  content: string
) {
  if (!supabase) return;
  try {
    await supabase.from(WHATSAPP_MESSAGES_TABLE).insert({
      student_id: studentId,
      phone_tail: phoneTail,
      role,
      content,
    });
  } catch (err) {
    console.error("[whatsapp-cloud] log insert failed", err);
  }
}

async function summarizeAndPrune(studentId: string) {
  if (!openai || !supabase) return;
  try {
    const { data, error } = await supabase
      .from(WHATSAPP_MESSAGES_TABLE)
      .select("role, content")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true })
      .limit(70);
    if (error) throw error;
    if (!data?.length) return;

    const transcript = data
      .map((entry) => `${entry.role === "user" ? "Studente" : "Luigi"}: ${entry.content}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.3,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: "Sei un tutor Theoremz Black. Riassumi la chat in 4-6 frasi chiare come nota tutor.",
        },
        { role: "user", content: transcript },
      ],
    });
    const summary = completion.choices[0]?.message?.content?.trim();
    if (summary) {
      await supabase
        .from("black_students")
        .update({ ai_description: summary, updated_at: new Date().toISOString() })
        .eq("id", studentId);
    }

    const { data: toDelete, error: selectErr } = await supabase
      .from(WHATSAPP_MESSAGES_TABLE)
      .select("id")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true })
      .limit(PRUNE_DELETE_COUNT);
    if (selectErr) throw selectErr;
    if (toDelete?.length) {
      await supabase.from(WHATSAPP_MESSAGES_TABLE).delete().in(
        "id",
        toDelete.map((row: any) => row.id)
      );
    }
  } catch (err) {
    console.error("[whatsapp-cloud] summarize/prune failed", err);
  }
}
