import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth } from "@/lib/firebaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Recupera il customer ID di Stripe dal customClaims
    const user = await adminAuth.getUser(uid);
    const stripeCustomerId = user.customClaims?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "Customer Stripe non trovato" },
        { status: 404 }
      );
    }

    // Crea sessione Customer Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Errore creazione portal session:", error);
    return NextResponse.json(
      { error: "Errore nella creazione della sessione" },
      { status: 500 }
    );
  }
}
