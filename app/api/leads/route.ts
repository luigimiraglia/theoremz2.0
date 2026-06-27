import { NextResponse } from "next/server";
import { upsertCanonicalLead } from "@/lib/canonicalLeads";

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

    const doc = {
      name: String(name).slice(0, 120),
      email: email ? String(email).slice(0, 160) : null,
      phone: String(phone).slice(0, 40),
      slot: slot ? String(slot).slice(0, 40) : "qualsiasi",
      note: note ? String(note).slice(0, 1000) : null,
      source: source ? String(source).slice(0, 64) : null,
      contact: contact === 'whatsapp' ? 'whatsapp' : 'call',
      ts: Date.now(),
      ua,
      referer,
      ip,
    } as const;

    const leadId = await upsertCanonicalLead({
      fullName: doc.name,
      email: doc.email,
      phone: doc.phone,
      channel: doc.contact === "whatsapp" ? "whatsapp" : "phone",
      source: doc.source || "quick_contact",
      funnel: "quick_contact",
      status: "active",
      responseStatus: "pending",
      note: [doc.slot ? `Slot: ${doc.slot}` : null, doc.note].filter(Boolean).join(" | ") || null,
      pageUrl: referer,
      createdAt: new Date(doc.ts),
      updatedAt: new Date(doc.ts),
      metadata: {
        contactPreference: doc.contact,
        userAgent: ua,
        ip,
      },
      fallbackKey: `lead:${doc.phone}:${doc.ts}`,
    });
    return NextResponse.json({ ok: true, leadId });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "server_error" }, { status: 500 });
  }
}
