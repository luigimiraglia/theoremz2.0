import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth } from "@/lib/firebaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Recupera l'utente
    const user = await adminAuth.getUser(uid);
    const email = user.email;

    if (!email) {
      return NextResponse.json(
        { error: "Email utente non trovata" },
        { status: 404 }
      );
    }

    // Cerca il customer su Stripe tramite email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (!customers.data.length) {
      return NextResponse.json({ subscribed: false, startDate: null });
    }

    const customerId = customers.data[0].id;

    // Recupera le subscription attive
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (!subscriptions.data.length) {
      return NextResponse.json({ subscribed: false, startDate: null });
    }

    const subscription = subscriptions.data[0];
    const startDate = new Date(subscription.created * 1000).toISOString();

    return NextResponse.json({
      subscribed: true,
      startDate,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Errore recupero subscription info:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle informazioni" },
      { status: 500 }
    );
  }
}
