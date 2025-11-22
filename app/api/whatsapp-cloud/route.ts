import { NextResponse } from "next/server";
import {
  handleWhatsAppMessage,
  enrichImageSource,
  IMAGE_ONLY_PROMPT,
} from "../manychat/whatsapp/route";

const verifyToken = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN?.trim() || "";
const graphApiVersion = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";
const cloudPhoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() || "";
const metaAccessToken = process.env.META_ACCESS_TOKEN?.trim() || "";

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
  return { url };
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
    const enrichedSource = enrichImageSource(imageSource);

    try {
      const aiResponse = await handleWhatsAppMessage({
        messageText: extractedText || IMAGE_ONLY_PROMPT,
        originalMessageText: extractedText || null,
        subscriberName,
        rawPhone,
        imageSource: enrichedSource,
      });

      let replyText = "";
      try {
        const parsed = await aiResponse.json();
        replyText =
          parsed?.content?.text ||
          parsed?.text ||
          "Fammi capire meglio la situazione 😊";
      } catch (error) {
        console.error("[whatsapp-cloud] failed to read AI response", error);
        replyText = "Fammi capire meglio la situazione 😊";
      }

      await sendCloudReply({ phoneNumberId, to: rawPhone, body: replyText });
    } catch (error) {
      console.error("[whatsapp-cloud] processing error", error);
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
