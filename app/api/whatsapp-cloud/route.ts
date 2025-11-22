import { NextResponse } from "next/server";
import OpenAI from "openai";

const verifyToken = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN?.trim() || "";
const graphApiVersion = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";
const cloudPhoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() || "";
const metaAccessToken = process.env.META_ACCESS_TOKEN?.trim() || "";
const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || "";
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const IMAGE_ONLY_PROMPT = "Guarda l'immagine allegata e dimmi come posso aiutarti.";
const VISION_MODEL = "gpt-4o";

type CloudImage = {
  id: string;
  mime_type?: string;
};

function extractCloudText(message: any): string | null {
  if (!message) return null;
  const type = message.type;
  if (type === "text") {
    return message.text?.body || null;
  }
  if (type === "button") {
    return message.button?.text || null;
  }
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
  if (type === "sticker") {
    return "Lo sticker che mi hai mandato non contiene testo. Puoi spiegarmi cosa ti serve?";
  }
  return message[type]?.caption || null;
}

function buildImageSourceFromCloud(image: CloudImage | null): { url: string; headers?: Record<string, string> } | null {
  if (!image?.id) return null;
  const url = `https://graph.facebook.com/${graphApiVersion}/${image.id}`;
  const headers: Record<string, string> = {};
  if (metaAccessToken) headers.Authorization = `Bearer ${metaAccessToken}`;
  return { url, headers: Object.keys(headers).length ? headers : undefined };
}

async function downloadImageAsDataUrl(source: { url: string; headers?: Record<string, string> }) {
  if (!source?.url) return null;
  try {
    let targetUrl = source.url;
    let mimeType: string | null = null;
    const metaRes = await fetch(targetUrl, {
      headers: source.headers,
    });
    if (!metaRes.ok) {
      throw new Error(`graph_meta_${metaRes.status}`);
    }
    const metaContentType = metaRes.headers.get("content-type") || "";
    if (metaContentType.includes("application/json")) {
      const metaJson = await metaRes.json();
      if (metaJson?.url) {
        targetUrl = metaJson.url;
        mimeType = metaJson?.mime_type || null;
      } else {
        throw new Error("graph_meta_missing_url");
      }
    } else {
      // metadata call already returned the binary
      const arrayBuffer = await metaRes.arrayBuffer();
      const contentType = metaRes.headers.get("content-type") || mimeType || "image/jpeg";
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      console.info("[whatsapp-cloud] image downloaded", { url: source.url, contentType });
      return `data:${contentType};base64,${base64}`;
    }

    const mediaRes = await fetch(targetUrl, {
      headers: source.headers,
    });
    if (!mediaRes.ok) {
      throw new Error(`graph_media_${mediaRes.status}`);
    }
    const arrayBuffer = await mediaRes.arrayBuffer();
    const contentType = mediaRes.headers.get("content-type") || mimeType || "image/jpeg";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    console.info("[whatsapp-cloud] image downloaded", { url: targetUrl, contentType });
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("[whatsapp-cloud] image download failed", { url: source.url, error });
    return null;
  }
}

function buildSystemPrompt(subscriberName?: string | null) {
  return `Sei Luigi Miraglia, tutor di matematica di Theoremz Black. Rispondi ai messaggi WhatsApp in italiano, con tono umano e poche frasi.
Obiettivi:
- Capisci cosa chiede lo studente (anche dalle immagini) e fornisci spiegazioni chiare.
- Se la domanda è ambigua, chiedi tu chiarimenti specifici.
- Non offrire call o link promozionali finché non sono richiesti.`;
}

async function generateVisionReply({
  text,
  imageDataUrl,
  subscriberName,
}: {
  text: string;
  imageDataUrl?: string | null;
  subscriberName?: string | null;
}) {
  if (!openai) {
    return "Non riesco a rispondere ora perché manca la configurazione dell'AI.";
  }
  const systemPrompt = buildSystemPrompt(subscriberName);
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
    const content = completion.choices[0]?.message?.content?.trim();
    if (content) return content;
    return "Sto cercando di interpretare il tuo messaggio, descrivimi meglio cosa ti serve?";
  } catch (error) {
    console.error("[whatsapp-cloud] openai error", error);
    return `Non riesco a generare una risposta perché ho ricevuto un errore tecnico (${(error as Error)?.message}).`;
  }
}

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

  const contacts = value?.contacts || [];
  const phoneNumberId = value?.metadata?.phone_number_id || cloudPhoneNumberId;
  if (!phoneNumberId) {
    console.error("[whatsapp-cloud] missing phone_number_id");
    return NextResponse.json({ error: "missing_phone_number_id" }, { status: 500 });
  }

  for (const message of messages) {
    const type = message?.type;
    if (!type) continue;
    const rawPhone = message?.from || value?.contacts?.[0]?.wa_id || null;
    if (!rawPhone) continue;
    const contact =
      contacts.find((entry: any) => entry?.wa_id === rawPhone) ||
      contacts[0] ||
      null;
    const subscriberName =
      contact?.profile?.name ||
      contact?.profile?.first_name ||
      value?.contacts?.[0]?.profile?.name ||
      null;
    const extractedText = extractCloudText(message);
    let imageSource = null;
    if (type === "image") {
      imageSource = buildImageSourceFromCloud(message.image || null);
    } else if (message?.document?.mime_type?.startsWith("image/")) {
      imageSource = buildImageSourceFromCloud(message.document);
    }
    const imageLink = imageSource?.url || null;

    try {
      const imageDataUrl = imageSource ? await downloadImageAsDataUrl(imageSource) : null;
      const promptText =
        extractedText && imageDataUrl
          ? `${extractedText}\n\n(Nota: è presente anche un'immagine allegata.)`
          : extractedText || IMAGE_ONLY_PROMPT;
      const replyText = await generateVisionReply({
        text: promptText,
        imageDataUrl,
        subscriberName,
      });

      const finalReply = imageLink
        ? `Immagine scaricata correttamente ✅\nURL: ${imageLink}\n\n${replyText}`
        : replyText;

      await sendCloudReply({ phoneNumberId, to: rawPhone, body: finalReply });
    } catch (error) {
      console.error("[whatsapp-cloud] processing error", error);
      const fallbackMsg = `Ho ricevuto il tuo messaggio ma c'è stato un errore tecnico: ${(error as Error)?.message}`;
      await sendCloudReply({ phoneNumberId, to: rawPhone, body: fallbackMsg });
    }
  }

  return NextResponse.json({ ok: true });
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
    const errPayload = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    console.error("[whatsapp-cloud] send failed", errPayload);
    throw new Error(`whatsapp_send_failed_${response.status}`);
  }
}
