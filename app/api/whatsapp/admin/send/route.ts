import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const graphApiVersion = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";
const cloudPhoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() || "";
const metaAccessToken = process.env.META_ACCESS_TOKEN?.trim() || "";

async function sendWhatsapp({ to, body }: { to: string; body: string }) {
  if (!metaAccessToken || !cloudPhoneNumberId) {
    throw new Error("whatsapp_not_configured");
  }
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
    const errPayload = await res.json().catch(() => ({ error: res.statusText }));
    console.error("[whatsapp-admin] send failed", errPayload);
    throw new Error(`send_failed_${res.status}`);
  }
}

export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const to = (payload?.to || "").trim();
  const body = (payload?.body || "").trim();
  const studentId = payload?.studentId || null;
  const phoneTail = payload?.phoneTail || null;

  if (!to || !body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    await sendWhatsapp({ to, body });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  if (studentId || phoneTail) {
    try {
      const db = supabaseServer();
      await db.from("black_whatsapp_messages").insert({
        student_id: studentId || null,
        phone_tail: phoneTail || null,
        role: "assistant",
        content: body,
      });
    } catch (err) {
      console.error("[whatsapp-admin] log insert failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
