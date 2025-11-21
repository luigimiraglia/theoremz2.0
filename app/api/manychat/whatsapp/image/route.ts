import { NextResponse } from "next/server";
import {
  handleWhatsAppMessage,
  extractSubscriberName,
  extractPhone,
  jsonResponse,
  missingConfigResponse,
  verifySecret,
  hasOpenAIClient,
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

  const imageUrl =
    payload?.image_url || payload?.message?.image_url || payload?.message?.image || payload?.image;
  if (!imageUrl || typeof imageUrl !== "string") {
    return jsonResponse("Non ho ricevuto l'immagine da analizzare 😅", { status: 400 });
  }

  const messageText =
    payload?.message?.text || payload?.text || "Guarda l'immagine allegata, ti spiego come risolverla.";
  const subscriberName = extractSubscriberName(payload);
  const rawPhone = payload?.phone || extractPhone(payload);
  if (!rawPhone) {
    return jsonResponse("Non riesco a capire da che numero arriva questa immagine 😅", { status: 400 });
  }

  return handleWhatsAppMessage({
    messageText,
    subscriberName,
    rawPhone,
    imageUrl,
  });
}
