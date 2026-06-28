import { NextResponse } from "next/server";
import { storeLeadAndNotify } from "@/lib/leadIntake";

export async function POST(req: Request) {
  try {
    const { name, phone, email, slot, note, source, contact } = await req.json();
    const headers = new Headers(req.headers);
    const ua = headers.get("user-agent") || null;
    const referer = headers.get("referer") || null;
    const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    if (!name || !phone) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const result = await storeLeadAndNotify({
      fullName: String(name).slice(0, 120),
      email: email ? String(email).slice(0, 160) : null,
      phone: String(phone).slice(0, 40),
      slot: slot ? String(slot).slice(0, 40) : "qualsiasi",
      note: note ? String(note).slice(0, 1000) : null,
      source: source ? String(source).slice(0, 64) : "quick_contact",
      funnel: "quick_contact",
      pageUrl: referer,
      contactPreference: contact === "whatsapp" ? "whatsapp" : "call",
      subjectLabel: "Lead Theoremz",
      metadata: { userAgent: ua, ip },
      fallbackKey: `lead:${String(phone).slice(0, 40)}:${Date.now()}`,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, leadId: result.leadId, emailStatus: result.emailStatus });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "server_error" }, { status: 500 });
  }
}
