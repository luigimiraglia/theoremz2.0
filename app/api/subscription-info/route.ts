import { NextResponse } from "next/server";
import { getAuthUser, getPremiumAccessForUser } from "@/lib/premium-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const access = await getPremiumAccessForUser(auth);
    if (!access.isSubscribed || access.source !== "stripe" || !access.stripe) {
      return NextResponse.json({
        subscribed: access.isSubscribed,
        startDate: null,
        source: access.source,
      });
    }

    return NextResponse.json({
      subscribed: true,
      startDate: access.stripe.startDate,
      status: access.stripe.status,
      planLabel: access.stripe.planLabel,
      planTier: access.stripe.planTier,
      priceId: access.stripe.priceId,
      source: access.source,
    });
  } catch (error) {
    console.error("Errore recupero subscription info:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle informazioni" },
      { status: 500 },
    );
  }
}
