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
const HISTORY_LIMIT = 20;
const SUMMARY_THRESHOLD = 70;
const PRUNE_DELETE_COUNT = 50;
const ASK_EMAIL_MESSAGE = "Non trovo un abbonamento Black con questo numero. Scrivimi l'email del tuo account così lo collego.";
const NON_BLACK_CLARIFY_MESSAGE =
  "Dimmi se vuoi info sui nostri programmi (Black, quiz, percorsi) oppure se ti serve una mano su matematica: ti indirizzo subito.";
const INSIGHTS_MODEL = "gpt-4o-mini";
const GRADES_LIMIT = 5;

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
    const text = extractCloudText(message);
    const imageSource = buildImageSourceFromCloud(message);
    const imageDataUrl = imageSource ? await downloadImageAsDataUrl(imageSource) : null;
    const phoneTail = extractPhoneTail(rawPhone);
    const studentResult = await fetchBlackStudentWithContext(phoneTail);

    if (!studentResult) {
      const handled = await handleNonBlackFlow({
        rawPhone,
        phoneTail,
        phoneNumberId,
        text,
        imageDataUrl,
      });
      if (!handled) {
        await sendCloudReply({ phoneNumberId, to: rawPhone, body: NON_BLACK_CLARIFY_MESSAGE });
      }
      continue;
    }

    const { student, contextText } = studentResult;
    const historyResult = await fetchConversationHistory(student.id, phoneTail, HISTORY_LIMIT);

    const promptText =
      text && imageDataUrl
        ? `${text}\n\n(Nota: è presente anche un'immagine allegata.)`
        : text || IMAGE_ONLY_PROMPT;
    const reply = await generateReply(promptText, imageDataUrl, contextText, historyResult.history);

    await logConversationMessage(student.id, phoneTail, "user", promptText);
    await logConversationMessage(student.id, phoneTail, "assistant", reply);
    await extractAndStoreInsights({
      studentId: student.id,
      phoneTail,
      messageText: text || "",
      history: historyResult.history,
    });
    const totalCount = historyResult.total + 2;
    if (totalCount >= SUMMARY_THRESHOLD) {
      await summarizeAndPrune(student.id);
    }

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
  metrics?: {
    avg_math?: number | null;
    avg_physics?: number | null;
    recent_grades?: { subject?: string | null; score?: number | null; max_score?: number | null; when_at?: string | null }[];
  } | null;
};

async function fetchBlackStudentWithContext(phoneTail: string | null): Promise<{ student: BlackStudentRow; contextText: string | null } | null> {
  if (!phoneTail || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("black_students")
      .select(
        "id, student_name, student_email, parent_email, year_class, track, goal, difficulty_focus, readiness, ai_description, next_assessment_subject, next_assessment_date, metrics"
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
  const metrics = student.metrics || {};
  if (typeof metrics.avg_math === "number") parts.push(`Media matematica: ${metrics.avg_math.toFixed(1)}/10`);
  if (typeof metrics.avg_physics === "number") parts.push(`Media fisica: ${metrics.avg_physics.toFixed(1)}/10`);
  if (metrics.recent_grades?.length) {
    const gradesText = metrics.recent_grades
      .map((g) => {
        const subj = g.subject || "materia";
        const score =
          typeof g.score === "number" && typeof g.max_score === "number"
            ? `${g.score}/${g.max_score}`
            : g.score != null
            ? `${g.score}`
            : "";
        const date = g.when_at || "";
        return [subj, score, date].filter(Boolean).join(" ");
      })
      .filter(Boolean)
      .join("; ");
    if (gradesText) parts.push(`Voti recenti: ${gradesText}`);
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

function normalizeAssessmentDate(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const today = new Date();
  const currentYear = today.getFullYear();

  const parseWithYear = (dateStr: string) => {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const tryIso = parseWithYear(trimmed);
  if (tryIso) {
    if (tryIso < today) return null;
    return tryIso.toISOString().slice(0, 10);
  }

  const ddMm = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/);
  if (ddMm) {
    const day = Number(ddMm[1]);
    const month = Number(ddMm[2]) - 1;
    let year = ddMm[3] ? Number(ddMm[3]) : currentYear;
    if (year < 100) year = 2000 + year;
    let candidate = new Date(Date.UTC(year, month, day));
    if (candidate < today) {
      candidate = new Date(Date.UTC(year + 1, month, day));
    }
    if (Number.isNaN(candidate.getTime())) return null;
    return candidate.toISOString().slice(0, 10);
  }

  return null;
}

type NonBlackPayload = {
  rawPhone: string;
  phoneTail: string | null;
  phoneNumberId: string;
  text: string | null;
  imageDataUrl: string | null;
};

async function handleNonBlackFlow(payload: NonBlackPayload) {
  const { rawPhone, phoneTail, phoneNumberId, text, imageDataUrl } = payload;
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
        await logConversationMessage(student.id, phoneTail, "user", promptText);
        await logConversationMessage(student.id, phoneTail, "assistant", reply);
        const totalCount = historyResult.total + 2;
        if (totalCount >= SUMMARY_THRESHOLD) {
          await summarizeAndPrune(student.id);
        }
        await sendCloudReply({ phoneNumberId, to: rawPhone, body: reply || "Ciao" });
        return true;
      }
      await sendCloudReply({
        phoneNumberId,
        to: rawPhone,
        body: "Ho collegato la mail, scrivimi di nuovo il messaggio così ti rispondo.",
      });
      return true;
    } else {
      await sendCloudReply({
        phoneNumberId,
        to: rawPhone,
        body: "Questa mail non risulta nei nostri abbonati, puoi ricontrollare?",
      });
      return true;
    }
  }

  const intent = classifyNonBlackIntent(text);
  if (intent === "sales") {
    const reply = await generateSalesReply(text || "");
    await sendCloudReply({ phoneNumberId, to: rawPhone, body: reply });
    return true;
  }
  if (intent === "math") {
    await sendCloudReply({ phoneNumberId, to: rawPhone, body: ASK_EMAIL_MESSAGE });
    return true;
  }
  return false;
}

function classifyNonBlackIntent(text?: string | null): "sales" | "math" | "clarify" {
  if (!text) return "clarify";
  const lower = text.toLowerCase();
  const salesKeywords = [
    "prezzo",
    "prezzi",
    "costo",
    "quanto",
    "abbon",
    "piano",
    "iscriver",
    "programma",
    "offerta",
    "black",
    "theoremz",
  ];
  const mathKeywords = ["esercizio", "esercizi", "problema", "calcolo", "integrale", "derivata", "teorema", "matematica", "mate"];
  if (salesKeywords.some((k) => lower.includes(k))) return "sales";
  if (mathKeywords.some((k) => lower.includes(k))) return "math";
  return "clarify";
}

async function generateSalesReply(text: string) {
  if (!openai) return "Ciao! Vuoi info sui nostri programmi? Ti racconto Black e come funziona.";
  const prompt = `Sei Luigi Miraglia e rispondi su WhatsApp a un potenziale cliente. Spiega il valore di Theoremz Black (o altri prodotti Theoremz se menzionati) in modo chiaro, naturale e umano. Fai domande mirate per capire cosa cerca, niente call forzate. Testo semplice, senza markdown o latex.`;
  try {
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.6,
      max_tokens: 320,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text || "Chiedo info sui vostri programmi." },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || "Ti racconto come funziona Theoremz Black: percorso personalizzato con tutor e AI. Dimmi cosa cerchi.";
  } catch (err) {
    console.error("[whatsapp-cloud] sales ai error", err);
    return "Posso spiegarti come funziona Theoremz Black e le offerte attive, dimmi pure cosa ti interessa.";
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

type InsightPayload = {
  studentId: string;
  phoneTail: string | null;
  messageText: string;
  history: ConversationMessage[];
};

async function extractAndStoreInsights(payload: InsightPayload) {
  if (!openai || !supabase) return;
  const { studentId, messageText, history } = payload;
  const trimmed = messageText.trim();
  if (!trimmed) return;
  try {
    const contextText = (history || [])
      .slice(-5)
      .map((h) => `${h.role === "user" ? "Studente" : "Luigi"}: ${h.content}`)
      .join("\n");
    const prompt = `Estrai eventuali dati strutturati dal messaggio seguente (tono WhatsApp).
Restituisci JSON con chiavi opzionali:
- student_name: string
- difficulty_focus: string (difficoltà citate)
- next_assessment_subject: string
- next_assessment_date: YYYY-MM-DD se menzionata una data, altrimenti null
- goal: string
Se non trovi un campo, mettilo null o ometti. Nessun testo extra, solo JSON.`;

    const completion = await openai.chat.completions.create({
      model: INSIGHTS_MODEL,
      temperature: 0,
      max_tokens: 200,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Storico recente:\n${contextText || "(vuoto)"}\n\nMessaggio:\n${trimmed}` },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const { data: currentRow, error: currentErr } = await supabase
      .from("black_students")
      .select(
        "student_name, difficulty_focus, next_assessment_subject, next_assessment_date, goal, metrics"
      )
      .eq("id", studentId)
      .maybeSingle();
    if (currentErr) {
      console.error("[whatsapp-cloud] insight current fetch failed", currentErr);
      return;
    }

    const updatePayload: Record<string, any> = {};

    const incomingName = parsed.student_name;
    if (incomingName && typeof incomingName === "string") {
      updatePayload.student_name = incomingName;
    }

    const mergeDistinct = (existing: string | null | undefined, incoming: string | null | undefined) => {
      if (!incoming || typeof incoming !== "string" || !incoming.trim()) return existing || null;
      if (!existing) return incoming;
      const lowerExisting = existing.toLowerCase();
      const lowerIncoming = incoming.toLowerCase();
      if (lowerExisting.includes(lowerIncoming)) return existing;
      return `${existing}; ${incoming}`.trim();
    };

    const incomingDifficulty = parsed.difficulty_focus;
    if (incomingDifficulty && typeof incomingDifficulty === "string") {
      const merged = mergeDistinct(currentRow?.difficulty_focus, incomingDifficulty);
      if (merged && merged !== currentRow?.difficulty_focus) {
        updatePayload.difficulty_focus = merged;
      }
    }

    const incomingGoal = parsed.goal;
    if (incomingGoal && typeof incomingGoal === "string") {
      const merged = mergeDistinct(currentRow?.goal, incomingGoal);
      if (merged && merged !== currentRow?.goal) {
        updatePayload.goal = merged;
      }
    }

    const incomingSubject = parsed.next_assessment_subject;
    if (
      incomingSubject &&
      typeof incomingSubject === "string" &&
      !currentRow?.next_assessment_subject
    ) {
      updatePayload.next_assessment_subject = incomingSubject;
    }

    const incomingDate = parsed.next_assessment_date;
    if (
      incomingDate &&
      typeof incomingDate === "string" &&
      !currentRow?.next_assessment_date
    ) {
      const adjusted = normalizeAssessmentDate(incomingDate);
      if (adjusted) {
        updatePayload.next_assessment_date = adjusted;
      }
    }

    if (parsed.recent_grades || parsed.avg_math || parsed.avg_physics) {
      const existingMetrics = (currentRow?.metrics as any) || {};
      const metricsUpdate: any = { ...existingMetrics };
      if (typeof parsed.avg_math === "number") metricsUpdate.avg_math = parsed.avg_math;
      if (typeof parsed.avg_physics === "number") metricsUpdate.avg_physics = parsed.avg_physics;
      if (Array.isArray(parsed.recent_grades)) {
        const normalized = parsed.recent_grades
          .map((g: any) => ({
            subject: typeof g.subject === "string" ? g.subject : null,
            score: typeof g.score === "number" ? g.score : null,
            max_score: typeof g.max_score === "number" ? g.max_score : null,
            when_at: typeof g.when_at === "string" ? g.when_at : null,
          }))
          .filter((g: any) => g.subject || g.score != null || g.max_score != null);
        if (normalized.length) metricsUpdate.recent_grades = normalized.slice(0, GRADES_LIMIT);
      }
      updatePayload.metrics = metricsUpdate;
    }

    if (!Object.keys(updatePayload).length) return;
    updatePayload.updated_at = new Date().toISOString();
    await supabase.from("black_students").update(updatePayload).eq("id", studentId);
  } catch (err) {
    console.error("[whatsapp-cloud] insight extraction failed", err);
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
  studentId: string,
  phoneTail: string | null,
  limit = HISTORY_LIMIT
): Promise<{ history: ConversationMessage[]; total: number }> {
  if (!supabase) return { history: [], total: 0 };
  try {
    const { data, error, count } = await supabase
      .from(WHATSAPP_MESSAGES_TABLE)
      .select("role, content", { count: "exact" })
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(limit);
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
  studentId: string,
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
