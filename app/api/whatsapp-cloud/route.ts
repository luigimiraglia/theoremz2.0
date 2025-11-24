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
const NOT_SUBSCRIBED_MESSAGE = "Non sei abbonato a Theoremz Black.";
const HAS_SUPABASE_ENV = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = HAS_SUPABASE_ENV ? supabaseServer() : null;

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

    if (!(await isBlackSubscriber(phoneTail))) {
      await sendCloudReply({ phoneNumberId, to: rawPhone, body: NOT_SUBSCRIBED_MESSAGE });
      continue;
    }

    const promptText =
      text && imageDataUrl
        ? `${text}\n\n(Nota: è presente anche un'immagine allegata.)`
        : text || IMAGE_ONLY_PROMPT;
    const reply = await generateReply(promptText, imageDataUrl);

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

function extractPhoneTail(rawPhone: string | null) {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D+/g, "");
  if (digits.length < 6) return null;
  return digits.slice(-10);
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

async function isBlackSubscriber(phoneTail: string | null) {
  if (!phoneTail) return false;
  if (!supabase) {
    console.error("[whatsapp-cloud] supabase env missing, skipping phone check");
    return false;
  }
  const { data, error } = await supabase
    .from("black_students")
    .select("id")
    .eq("status", "active")
    .or(`student_phone.ilike.%${phoneTail},parent_phone.ilike.%${phoneTail}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[whatsapp-cloud] supabase phone lookup error", error);
    return false;
  }

  return Boolean(data?.id);
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

async function generateReply(text: string, imageDataUrl?: string | null) {
  if (!openai) return "Ciao! Non riesco a rispondere ora perché manca la configurazione dell'AI.";
  const systemPrompt = `Sei Luigi Miraglia, tutor di matematica di Theoremz Black. Rispondi ai messaggi WhatsApp in italiano, con tono umano e poche frasi.
Obiettivi:
- Capisci cosa chiede lo studente (anche dalle immagini) e fornisci spiegazioni chiare.
- Se la domanda è ambigua, chiedi tu chiarimenti specifici.
- Non offrire call o link promozionali finché non sono richiesti.`;

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
