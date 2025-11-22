import { NextResponse } from "next/server";
import {
  handleWhatsAppMessage,
  enrichImageSource,
  IMAGE_ONLY_PROMPT,
} from "../manychat/whatsapp/route";

const verifyToken = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN?.trim() || "";
const graphApiVersion = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";

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

  const message = messages[0];
  const type = message?.type;
  if (!type) {
    return NextResponse.json({ ok: true });
  }

  const subscriberName =
    value?.contacts?.[0]?.profile?.name ||
    value?.contacts?.[0]?.profile?.first_name ||
    null;
  const rawPhone = message?.from || value?.contacts?.[0]?.wa_id || null;
  const extractedText = extractCloudText(message);

  let imageSource = null;
  if (type === "image") {
    imageSource = buildImageSourceFromCloud(message.image || null);
  } else if (message?.document?.mime_type?.startsWith("image/")) {
    imageSource = buildImageSourceFromCloud(message.document);
  }

  const enrichedSource = enrichImageSource(imageSource);

  return handleWhatsAppMessage({
    messageText: extractedText || IMAGE_ONLY_PROMPT,
    originalMessageText: extractedText || null,
    subscriberName,
    rawPhone,
    imageSource: enrichedSource,
  });
}
