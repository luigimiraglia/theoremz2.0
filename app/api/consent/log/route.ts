import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  version: string;
  action: "accept_all" | "reject_all" | "custom";
  source: "banner" | "settings";
  categories: { analytics: boolean; marketing: boolean; preferences: boolean };
  anonId?: string | null;
  userId?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const now = new Date();
    const headers = new Headers(req.headers);
    const referer = headers.get("referer") || undefined;
    const ua = headers.get("user-agent") || undefined;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (headers as any).get?.("x-real-ip") ||
      undefined;
    const country = headers.get("x-vercel-ip-country") || undefined;

    const record = {
      ts: now,
      version: body.version,
      action: body.action,
      source: body.source,
      categories: body.categories,
      anonId: body.anonId || null,
      userId: body.userId || null,
      referer: referer ?? null,
      ua: ua ?? null,
      ip: ip ?? null,
      country: country ?? null,
    } as const;

    try {
      const db = supabaseServer();
      const id = `${record.anonId || record.userId || "anon"}_${now.getTime()}`;
      const { error } = await db.from("consent_logs").insert({
        id,
        recorded_at: now.toISOString(),
        version: record.version,
        action: record.action,
        source: record.source,
        categories: record.categories,
        anon_id: record.anonId,
        user_id: record.userId,
        referer: record.referer,
        user_agent: record.ua,
        ip: record.ip,
        country: record.country,
      });
      if (error) throw error;
    } catch (err) {
      console.warn("[consent] Supabase log skipped:", (err as any)?.message || err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as any)?.message || "invalid" }, { status: 400 });
  }
}
