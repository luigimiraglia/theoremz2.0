import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const graphApiVersion = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";
const cloudPhoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() || "";
const metaAccessToken = process.env.META_ACCESS_TOKEN?.trim() || "";
const followupSecret = process.env.WHATSAPP_FOLLOWUP_SECRET?.trim() || "";

const CONVERSATIONS_TABLE = "black_whatsapp_conversations";
const MESSAGES_TABLE = "black_whatsapp_messages";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const limit = Number(url.searchParams.get("limit") || "20");

  if (followupSecret && secret !== followupSecret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!metaAccessToken || !cloudPhoneNumberId) {
    return NextResponse.json(
      { error: "missing_whatsapp_config" },
      { status: 500 }
    );
  }

  const db = supabaseServer();
  const nowIso = new Date().toISOString();

  const { data: conversations, error } = await db
    .from(CONVERSATIONS_TABLE)
    .select(
      "id, phone_tail, phone_e164, student_id, status, type, followup_due_at, followup_sent_at"
    )
    .is("followup_sent_at", null)
    .lte("followup_due_at", nowIso)
    .eq("status", "bot")
    .in("type", ["prospect", "altro"])
    .order("followup_due_at", { ascending: true })
    .limit(Math.max(1, Math.min(50, limit)));

  if (error) {
    return NextResponse.json(
      { error: "fetch_failed", detail: error.message },
      { status: 500 }
    );
  }

  if (!conversations?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let processed = 0;
  for (const convo of conversations) {
    if (!convo.phone_e164) continue;
    const followupMessage =
      "Ciao, torno a scriverti per aiutarti con matematica/fisica. Qual è la prossima verifica e su quali argomenti hai bisogno di supporto? Ti consiglio il percorso giusto.";
    try {
      await sendWhatsAppText(convo.phone_e164, followupMessage);
      await db
        .from(CONVERSATIONS_TABLE)
        .update({
          followup_sent_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          last_message_preview: followupMessage.slice(0, 200),
        })
        .eq("id", convo.id);
      await db.from(MESSAGES_TABLE).insert({
        student_id: convo.student_id || null,
        phone_tail: convo.phone_tail,
        role: "assistant",
        content: followupMessage,
        meta: { source: "followup_job" },
      });
      processed += 1;
    } catch (err) {
      console.error("[whatsapp-followup] send failed", { convo, err });
    }
  }

  return NextResponse.json({ ok: true, processed });
}

async function sendWhatsAppText(to: string, body: string) {
  const endpoint = `https://graph.facebook.com/${graphApiVersion}/${cloudPhoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${metaAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message || `WhatsApp send failed (${res.status})`);
  }
}
