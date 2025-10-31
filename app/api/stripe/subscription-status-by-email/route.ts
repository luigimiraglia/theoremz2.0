import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY!;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(STRIPE_KEY); // ← niente apiVersion

const ACTIVE = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const e = (email || "").toLowerCase().trim();
    if (!e)
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    if (!STRIPE_KEY)
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );

    // Cerca prima con l'email normalizzata (lowercase)
    let customers = await stripe.customers.list({ email: e, limit: 100 });

    // Se non trova risultati con lowercase, prova anche con l'email originale
    // per gestire casi dove Stripe potrebbe aver salvato l'email con case diverso
    if (!customers.data.length && email && email !== e) {
      customers = await stripe.customers.list({
        email: email.trim(),
        limit: 100,
      });
    }

    if (!customers.data.length)
      return NextResponse.json({ isSubscribed: false, reason: "no_customer" });

    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: c.id,
        status: "all",
        limit: 100,
      });
      if (subs.data.some((s) => ACTIVE.has(s.status))) {
        return NextResponse.json({ isSubscribed: true, reason: "active" });
      }
    }
    return NextResponse.json({
      isSubscribed: false,
      reason: "no_active_subscription",
    });
  } catch (err: any) {
    console.error("[stripe] error:", err?.message || err);
    return NextResponse.json(
      { error: "Stripe error", message: err?.message || "unknown" },
      { status: 500 }
    );
  }
}
