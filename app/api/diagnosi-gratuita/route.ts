import { NextResponse } from "next/server";
import { storeLeadAndNotify } from "@/lib/leadIntake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { nome, email, telefono } = await req.json();

    if (!nome?.trim() || !email?.trim() || !telefono?.trim()) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const referer = req.headers.get("referer");
    const result = await storeLeadAndNotify({
      fullName: String(nome).trim().slice(0, 120),
      email: String(email).trim().slice(0, 160),
      phone: String(telefono).trim().slice(0, 40),
      source: "diagnosi-gratuita",
      funnel: "diagnosi_gratuita",
      note: "Richiesta diagnosi gratuita",
      pageUrl: referer,
      subjectLabel: "Diagnosi gratuita",
      contactPreference: "call",
      replyToEmail: String(email).trim().slice(0, 160),
      metadata: {
        form: "diagnosi-gratuita",
      },
      fallbackKey: `diagnosi:${String(email).trim().toLowerCase()}:${String(telefono).trim()}`,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, leadId: result.leadId, emailStatus: result.emailStatus });
  } catch (err) {
    console.error("[diagnosi-gratuita]", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
