import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

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

    await adminDb.collection("leads").add(doc);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "server_error" }, { status: 500 });
  }
}
