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
    let baseConversation = await fetchConversation(phoneTail);
    let conversationType = deriveConversationType(baseConversation?.type as ConversationType);
    let conversationStatus = (baseConversation?.status as ConversationStatus) || "waiting_tutor";
    let conversationBot = deriveBotFromType(conversationType);

    const inboundText =
      text && imageDataUrl
        ? `${text}\n\n(Nota: è presente anche un'immagine allegata.)`
        : text || IMAGE_ONLY_PROMPT;

    // Collega student_id se noto, senza forzare il tipo
    if (
      studentResult?.student?.id &&
      phoneTail &&
      baseConversation?.student_id !== studentResult.student.id
    ) {
      const linked = await upsertConversation({
        phoneTail,
        phoneE164,
        studentId: studentResult.student.id,
        status: conversationStatus,
        type: baseConversation?.type || conversationType,
        bot: conversationBot,
      });
      if (linked) {
        baseConversation = linked;
        conversationType = linked.type as ConversationType;
        conversationStatus = (linked.status as ConversationStatus) || conversationStatus;
        conversationBot = deriveBotFromType(conversationType);
      }
    }

    // Se già in waiting_tutor/tutor, non rispondere col bot: logga e inoltra a Telegram
    if (baseConversation?.status && baseConversation.status !== "bot") {
      const historyResult = await fetchConversationHistory(
        studentResult?.student.id || null,
        phoneTail,
        HISTORY_LIMIT
      );
      await upsertConversation({
        phoneTail,
        phoneE164,
        studentId: studentResult?.student.id || null,
        status: baseConversation.status as ConversationStatus,
        type: (baseConversation.type as ConversationType) || conversationType,
        lastMessage: inboundText,
        bot: conversationBot,
      });
      await logConversationMessage(studentResult?.student.id || null, phoneTail, "user", inboundText);
      const safeTail = phoneTail || baseConversation.phone_tail || "unknown";
      await notifyOperators({
        conversation: {
          ...(baseConversation || { phone_tail: safeTail }),
          status: baseConversation.status as ConversationStatus,
          type: (baseConversation.type as ConversationType) || conversationType,
        },
        text: text || "(nessun testo, solo media)",
        rawPhone,
        history: historyResult.history,
      });
      continue;
    }

    const escalatedProspect = await handleProspectEscalation({
      conversationType,
      conversationStatus,
      inboundText,
      phoneTail,
      phoneE164,
      rawPhone,
      phoneNumberId,
      baseConversation,
    });
    if (escalatedProspect) continue;

    const conversation = await upsertConversation({
      phoneTail,
      phoneE164,
      studentId: studentResult?.student.id,
      status: conversationStatus,
      type: conversationType,
      lastMessage: inboundText,
      bot: conversationBot,
    });

    const effectiveStatus = (conversation?.status as ConversationStatus) || conversationStatus;
    const effectiveType = (conversation?.type as ConversationType) || conversationType;
    conversationBot = deriveBotFromType(effectiveType);

    // Log inbound message
    await logConversationMessage(studentResult?.student.id || null, phoneTail, "user", inboundText);

    // follow-up sales se scaduto
    await maybeSendSalesFollowup({
      conversation: baseConversation,
      phoneNumberId,
      rawPhone,
    });

    if (effectiveStatus !== "bot") {
      const historyResult = await fetchConversationHistory(
        studentResult?.student.id || null,
        phoneTail,
        HISTORY_LIMIT
      );
      const safeTail = phoneTail || conversation?.phone_tail || "unknown";
      await notifyOperators({
        conversation: {
          ...(conversation || { phone_tail: safeTail }),
          status: effectiveStatus,
          type: effectiveType,
        },
        text: text || "(nessun testo, solo media)",
        rawPhone,
        history: historyResult.history,
      });
      continue;
    }

    // BOT mode con tipo prospect/altro forzato, anche se esiste uno studente
    if (effectiveType === "prospect" || effectiveType === "altro") {
      const historyResult = await fetchConversationHistory(
        studentResult?.student.id || null,
        phoneTail,
        HISTORY_LIMIT
      );
      const reply = await generateSalesReply(inboundText, historyResult.history);
      await logConversationMessage(studentResult?.student.id || null, phoneTail, "assistant", reply);
      const totalCount = historyResult.total + 1;
      if (totalCount >= SUMMARY_THRESHOLD && studentResult?.student?.id) {
        await summarizeAndPrune(studentResult.student.id);
      }
      await upsertConversation({
        phoneTail,
        phoneE164,
        studentId: studentResult?.student.id || null,
        status: "bot",
        type: effectiveType,
        bot: deriveBotFromType(effectiveType),
        lastMessage: reply,
        followupDueAt: new Date(Date.now() + deriveFollowupDelayMs(inboundText)).toISOString(),
        followupSentAt: null,
      });
      await sendCloudReply({ phoneNumberId, to: rawPhone, body: reply || "Ciao" });
      continue;
    }

    // BOT mode
    if (!studentResult) {
      const historyResult = await fetchConversationHistory(null, phoneTail, HISTORY_LIMIT);
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
              bot: deriveBotFromType("black"),
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
      const isSales = effectiveType !== "black";
      const reply = isSales
        ? await generateSalesReply(text || "", historyResult.history)
        : ASK_EMAIL_MESSAGE;
      await logConversationMessage(null, phoneTail, "assistant", reply);
      await upsertConversation({
        phoneTail,
        phoneE164,
        status: "bot",
        type: effectiveType,
        bot: deriveBotFromType(effectiveType),
        lastMessage: reply,
        followupDueAt: new Date(Date.now() + deriveFollowupDelayMs(text)).toISOString(),
        followupSentAt: null,
      });
      await sendCloudReply({ phoneNumberId, to: rawPhone, body: reply || "Ciao" });
      continue;
    }

    const { student, contextText } = studentResult;
    const historyResult = await fetchConversationHistory(student.id, phoneTail, HISTORY_LIMIT);

    if (
      effectiveStatus === "bot" &&
      effectiveType === "black" &&
      (await needsTutorEscalation(inboundText, historyResult.history, { type: effectiveType }))
    ) {
      await upsertConversation({
        phoneTail,
        phoneE164,
        studentId: student.id,
        status: "waiting_tutor",
        type: effectiveType,
        bot: deriveBotFromType(effectiveType),
        lastMessage: inboundText,
        followupDueAt: null,
        followupSentAt: null,
      });
      await notifyOperators(
        {
          conversation: {
            ...(conversation || { phone_tail: phoneTail || "unknown" }),
            status: "waiting_tutor",
            type: effectiveType,
          },
          text: inboundText,
          rawPhone,
          history: historyResult.history,
        }
      );
      await sendCloudReply({
        phoneNumberId,
        to: rawPhone,
        body: "Ti metto in contatto con un tutor, ti risponde a breve.",
      });
      continue;
    }

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
      bot: deriveBotFromType("black"),
      lastMessage: reply,
      followupDueAt: null,
    });

    await sendCloudReply({ phoneNumberId, to: rawPhone, body: reply || "Ciao" });
  }

  return NextResponse.json({ ok: true });
}

async function handleProspectEscalation({
  conversationType,
  conversationStatus,
  inboundText,
  phoneTail,
  phoneE164,
  rawPhone,
  phoneNumberId,
  baseConversation,
}: {
  conversationType: ConversationType;
  conversationStatus: ConversationStatus;
  inboundText: string;
  phoneTail: string | null;
  phoneE164: string | null;
  rawPhone: string | null;
  phoneNumberId: string;
  baseConversation: ConversationRow | null;
}) {
  if (conversationStatus !== "bot" || conversationType === "black") return;

  const conversationBot = deriveBotFromType(conversationType);
  const historyResult = await fetchConversationHistory(null, phoneTail, HISTORY_LIMIT);
  if (await needsTutorEscalation(inboundText, historyResult.history, { type: conversationType })) {
    await upsertConversation({
      phoneTail,
      phoneE164,
      studentId: null,
      status: "waiting_tutor",
      type: conversationType,
      bot: conversationBot,
      lastMessage: inboundText,
      followupDueAt: null,
      followupSentAt: null,
    });
    await notifyOperators(
      {
        conversation: {
          ...(baseConversation || { phone_tail: phoneTail || "unknown" }),
          status: "waiting_tutor",
          type: conversationType,
        },
        text: inboundText,
        rawPhone,
        history: historyResult.history,
      }
    );
    await sendCloudReply({
      phoneNumberId,
      to: rawPhone!,
      body: "Ti metto in contatto con un tutor, ti risponde a breve.",
    });
    return true;
  }
  return false;
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
  followup_due_at?: string | null;
  followup_sent_at?: string | null;
};

function deriveConversationType(
  existing: ConversationType | null | undefined
): ConversationType {
  // Forziamo tutte le conversazioni WhatsApp a essere trattate come "black"
  // per usare sempre il bot Black e non il sales bot.
  return "black";
}

function deriveBotFromType(type: ConversationType | null | undefined) {
  // Forziamo sempre il bot Black per tutte le conversazioni WhatsApp
  return "black";
}

function deriveFollowupDelayMs(text: string | null | undefined) {
  const lower = (text || "").toLowerCase();
  if (!lower) return 3 * 3600 * 1000; // default 3h
  if (/\bsubito\b|\bora\b|\boggi\b/.test(lower)) return 1 * 3600 * 1000;
  if (/\bdomani\b|\bentro domani\b/.test(lower)) return 2.5 * 3600 * 1000;
  if (/\bsettimana\b|\bweek\b/.test(lower)) return 6 * 3600 * 1000;
  if (/\bpiù tardi\b|\bpoi\b/.test(lower)) return 4 * 3600 * 1000;
  return 3 * 3600 * 1000;
}

async function needsTutorEscalation(
  text: string | null | undefined,
  history: ConversationMessage[],
  context: { type: ConversationType }
) {
  if (!text) return false;

  // Lightweight heuristic if OpenAI assente
  const fallback = () => {
    const lower = text.toLowerCase();
    const frustrationPatterns = [/non capisco/, /non ho capito/, /ancora non/, /non riesco/, /spiegamelo/i];
    const hitsCurrent = frustrationPatterns.some((re) => re.test(lower));
    const recentFrustration =
      history
        .slice(-5)
        .filter((m) => m.role === "user")
        .some((m) => frustrationPatterns.some((re) => re.test((m.content || "").toLowerCase())));
    return hitsCurrent && recentFrustration;
  };

  if (!openai) return fallback();

  try {
    const historyText = history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Utente" : "AI"}: ${m.content}`)
      .join("\n");
    const prompt = `
Sei un assistente di instradamento conversazioni. Decidi se serve passare la chat a un tutor umano (rispondi solo yes/no).
- Passa a tutor se l'utente chiede esplicitamente un tutor/umano, mostra frustrazione ripetuta, oppure il bot è confuso o non ha abbastanza contesto per rispondere.
- Passa a tutor se la richiesta è delicata o richiede supervisione umana.
- Altrimenti resta su bot.
`;
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 3,
      messages: [
        { role: "system", content: prompt },
        historyText ? { role: "system", content: `Storia recente:\n${historyText}` } : null,
        { role: "user", content: text },
      ].filter(Boolean) as any,
    });
    const answer = completion.choices[0]?.message?.content?.toLowerCase() || "";
    if (/\byes\b|sì|si\b/.test(answer)) return true;
  } catch (err) {
    console.error("[whatsapp-cloud] escalate check failed, fallback", err);
  }

  return fallback();
}

async function summarizeProspectContext(history: ConversationMessage[]): Promise<string | null> {
  if (!openai || !history.length) return null;
  const transcript = history
    .slice(-12)
    .map((m) => `${m.role === "user" ? "Utente" : "AI"}: ${m.content}`)
    .join("\n");
  try {
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "Ricapitola in 3-4 punti brevi cosa sappiamo del prospect: classe, materia, prossime verifiche/obiettivi, difficoltà, autonomia, preferenze espresse. Niente fronzoli.",
        },
        { role: "user", content: transcript },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[whatsapp-cloud] prospect context summary failed", err);
    return null;
  }
}

async function generateSalesReply(text: string, history: ConversationMessage[] = []) {
  if (!openai) {
    return "Ciao! Sono Luigi di Theoremz. Dimmi classe, materia, prossima verifica e difficoltà: poi ti propongo il piano giusto (Essential, Black o Mentor).";
  }
  const contextSummary = await summarizeProspectContext(history);
  const prompt = `
Sei un venditore senior di Theoremz (voce: Luigi Miraglia). Rispondi su WhatsApp a chi chiede info.
- Tone: empatico, conciso, zero fluff. Max 5 frasi brevi.
- Contesto generale: Theoremz è il sistema di studio più avanzato in Italia per matematica e fisica (contenuti premium + AI + supporto umano) per ottenere risultati concreti con meno stress.
- Livelli:
  • Essential: studio autonomo potenziato. Tutte le risorse premium (esercizi svolti, appunti, video, formulari, percorsi guidati), risolutore avanzato, AI tutor 24/7, risorse personalizzate illimitate. Per chi vuole autonomia veloce e un tutor AI sempre disponibile. Link: theoremz.com/black (seleziona Essential).
  • Black: tutto Essential + supporto umano in chat, onboarding 1:1, piano di studio personalizzato, 1 domanda/sett. garantita al tutor umano. Ideale per chi vuole alzare i voti con guida settimanale e piano chiaro. Link: theoremz.com/black.
  • Mentor: Black + lezioni settimanali 1:1 con mentore dedicato, supervisione continua, preparazione mirata (verifiche, esami, test, olimpiadi), materiali e correzioni prioritarie. Per studenti ambiziosi (medie 8–10, obiettivi selettivi). Link: theoremz.com/mentor.
- Metodo: Straight Line. Prima raccogli dati (almeno: classe, materia, prossima verifica o obiettivo chiaro, difficoltà principali, livello di autonomia). Finché mancano info, fai 1–2 domande mirate e NON proporre piani.
- Quando proponi: scegli UN solo piano (Essential OPPURE Black OPPURE Mentor) coerente con i bisogni. Non mischiare piani.
- NON fare lezioni o spiegazioni di matematica/fisica e non risolvere esercizi: se chiedono aiuto tecnico, chiarisci che sei commerciale e che un tutor risponderà dopo aver raccolto le info.
- Formato proposta (max 5-6 righe, con righe vuote tra blocchi per leggibilità):
  Riga 1: sintesi situazione + piano raccomandato (uno solo).
  Riga 2-3: perk chiave di quel piano (frasi brevi: cosa ottiene).
  Riga 4: link pagamento del piano scelto (Essential/Black: theoremz.com/black; Mentor: theoremz.com/mentor).
  Riga 5-6 (opzionali): follow-up soft / invito a confermare.
- Evita markdown o emoji; niente latex. Niente “malloppone”: frasi brevi, chiare, separate da righe vuote.
- Se hai contesto precedente, riprendi la vendita da lì (ricorda preferenze/obiettivi già espressi). Non ripartire da zero.
- Scegli il piano con più probabilità di successo per il prospect (non proporre di default Essential se servono guida umana o obiettivi ambiziosi: in quei casi preferisci Black/Mentor).
`;
  const historyText = history
    .slice(-6)
    .map((h) => `${h.role === "user" ? "Utente" : "Theoremz"}: ${h.content}`)
    .join("\n");
  try {
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.6,
      max_tokens: 320,
      messages: [
        { role: "system", content: prompt },
        contextSummary ? { role: "system", content: `Contesto breve da ricordare:\n${contextSummary}` } : null,
        historyText ? { role: "system", content: `Cronologia breve:\n${historyText}` } : null,
        { role: "user", content: text || "Raccontami cosa fate." },
      ].filter(Boolean) as any,
    });
    return (
      completion.choices[0]?.message?.content?.trim() ||
      "Ciao! Sono Luigi di Theoremz. Dimmi classe, materia, prossima verifica e difficoltà: poi ti propongo il piano giusto (Essential, Black o Mentor)."
    );
  } catch (err) {
    console.error("[whatsapp-cloud] sales reply failed", err);
    return "Ciao! Sono Luigi di Theoremz. Dimmi classe, materia, prossima verifica e difficoltà: poi ti propongo il piano giusto (Essential, Black o Mentor).";
  }
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
  followupDueAt,
  followupSentAt,
}: {
  phoneTail: string | null;
  phoneE164?: string | null;
  studentId?: string | null;
  status?: ConversationStatus | null;
  type?: ConversationType | null;
  bot?: string | null;
  lastMessage?: string | null;
  followupDueAt?: string | null;
  followupSentAt?: string | null;
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
  if (followupDueAt !== undefined) payload.followup_due_at = followupDueAt;
  if (followupSentAt !== undefined) payload.followup_sent_at = followupSentAt;
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
  history,
}: {
  conversation: ConversationRow;
  text: string | null | undefined;
  rawPhone: string | null;
  history?: ConversationMessage[];
}) {
  if (!TELEGRAM_BOT_TOKEN || !OPERATOR_CHAT_IDS.length) return;
  const status = conversation.status || "waiting_tutor";
  const type = conversation.type || "prospect";
  const header = `💬 WA (${status}) — ${type}`;
  const phoneLine = `Numero: ${rawPhone || conversation.phone_e164 || conversation.phone_tail}`;
  const convIdLine = conversation.id ? `ID: ${conversation.id}` : null;
  const body = text || "(messaggio senza testo)";
  const historyLines =
    history && history.length
      ? history
          .slice(-10)
          .map((m) => {
            const who = m.role === "assistant" ? "🤖" : "👤";
            return `${who} ${m.content.slice(0, 160)}`;
          })
          .join("\n")
      : null;
  const message = [header, phoneLine, convIdLine, "", body, historyLines ? "\nUltimi messaggi:" : null, historyLines]
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

async function maybeSendSalesFollowup({
  conversation,
  phoneNumberId,
  rawPhone,
}: {
  conversation: ConversationRow | null;
  phoneNumberId: string;
  rawPhone: string | null;
}) {
  if (
    !conversation ||
    conversation.status !== "bot" ||
    !conversation.type ||
    (conversation.type !== "prospect" && conversation.type !== "altro")
  ) {
    return;
  }
  const due = conversation.followup_due_at ? new Date(conversation.followup_due_at).getTime() : null;
  const sent = conversation.followup_sent_at ? new Date(conversation.followup_sent_at).getTime() : null;
  if (!due || sent) return;
  const now = Date.now();
  if (now < due) return;
  const followup =
    "Ciao, torno a scriverti per aiutarti con matematica/fisica. Qual è la prossima verifica e su quali argomenti hai bisogno di supporto? Ti consiglio il percorso giusto.";
  await sendCloudReply({ phoneNumberId, to: rawPhone!, body: followup });
  await upsertConversation({
    phoneTail: conversation.phone_tail,
    phoneE164: conversation.phone_e164,
    studentId: conversation.student_id || null,
    status: "bot",
    type: conversation.type,
    bot: deriveBotFromType(conversation.type as ConversationType),
    followupDueAt: null,
    followupSentAt: new Date().toISOString(),
    lastMessage: followup,
  });
  await logConversationMessage(conversation.student_id || null, conversation.phone_tail, "assistant", followup);
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
- Non parlare MAI di piani/abbonamenti/prezzi/offerte di Theoremz, nemmeno se l'utente li cita o li ha chiesti in passato: occupati solo di matematica/fisica e supporto didattico.
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
