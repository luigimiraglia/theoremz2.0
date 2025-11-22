import { NextResponse } from "next/server";
import {
  handleWhatsAppMessage,
  extractSubscriberName,
  extractPhone,
  extractImageSource,
  enrichImageSource,
  jsonResponse,
  missingConfigResponse,
  verifySecret,
  hasOpenAIClient,
  IMAGE_ONLY_PROMPT,
} from "../route";

export async function POST(req: Request) {
  if (!hasOpenAIClient) return missingConfigResponse("missing_openai_api_key");
  const authError = verifySecret(req);
  if (authError) return NextResponse.json({ error: authError }, { status: 401 });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const imageSource = enrichImageSource(extractImageSource(payload));
  if (!imageSource?.url) {
    return jsonResponse("Non ho ricevuto l'immagine da analizzare 😅", { status: 400 });
  }

  const rawMessageText = payload?.message?.text || payload?.text || null;
  const messageText = rawMessageText || IMAGE_ONLY_PROMPT;
  const subscriberName = extractSubscriberName(payload);
  const rawPhone = payload?.phone || extractPhone(payload);
  if (!rawPhone) {
    return jsonResponse("Non riesco a capire da che numero arriva questa immagine 😅", { status: 400 });
  }

  return handleWhatsAppMessage({
    messageText,
    originalMessageText: rawMessageText,
    subscriberName,
    rawPhone,
    imageSource,
  });
}
