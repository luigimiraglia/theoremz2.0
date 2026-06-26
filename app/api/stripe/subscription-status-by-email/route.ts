import { NextResponse } from "next/server";
import { getAuthUser, getPremiumAccessForUser } from "@/lib/premium-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let bodyEmail = "";
    try {
      const body = (await req.json()) as { email?: string };
      bodyEmail = String(body?.email || "");
    } catch {
      bodyEmail = "";
    }

    const normalizedBody = bodyEmail.toLowerCase().trim();
    if (normalizedBody && normalizedBody !== auth.email) {
      return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
    }

    const access = await getPremiumAccessForUser(auth);
    return NextResponse.json({
      isSubscribed: access.isSubscribed,
      reason: access.isSubscribed ? "active" : "no_active_subscription",
      source: access.source,
    });
  } catch (err: any) {
    console.error("[stripe] error:", err?.message || err);
    return NextResponse.json(
      { error: "Stripe error", message: err?.message || "unknown" },
      { status: 500 }
    );
  }
}
