import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth } from "@/lib/firebaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const PLAN_LABELS: Record<string, string> = {
  price_1SQIy3HuThKalaHI4pli489T: "Black Standard",
  price_1SGtQvHuThKalaHIr1d9ua0D: "Black Standard",
  price_1Ptv7qHuThKalaHIO45IqjKL: "Black Essential",
  price_1SII2UHuThKalaHI1g3CgFSb: "Black Annuale",
};

const ESSENTIAL_PRICE_IDS = new Set(
  (process.env.ESSENTIAL_PRICE_IDS || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
);
// includi sempre il price Essential noto
ESSENTIAL_PRICE_IDS.add("price_1Ptv7qHuThKalaHIO45IqjKL");

const ESSENTIAL_PRODUCT_IDS = new Set(
  (process.env.ESSENTIAL_PRODUCT_IDS || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
);
// includi sempre il product Essential noto
ESSENTIAL_PRODUCT_IDS.add("prod_PIm5hK5Fvbov68");

function resolvePlan(price: Stripe.Price | null | undefined) {
  const priceId = price?.id || null;
  const lookup = price?.lookup_key?.toLowerCase?.() || "";
  const nickname = price?.nickname?.toLowerCase?.() || "";
  const productName =
    typeof price?.product === "object" &&
    price.product &&
    (price.product as any).name
      ? String((price.product as any).name).toLowerCase()
      : "";
  const productId =
    typeof price?.product === "string" ? price.product : price?.product?.id;

  const label =
    (priceId && PLAN_LABELS[priceId]) ||
    price?.nickname ||
    price?.lookup_key ||
    productName ||
    "Black";

  const isEssential =
    (priceId && ESSENTIAL_PRICE_IDS.has(priceId)) ||
    (productId && ESSENTIAL_PRODUCT_IDS.has(productId)) ||
    lookup.includes("essential") ||
    nickname.includes("essential") ||
    productName.includes("essential") ||
    (label || "").toLowerCase().includes("essential");

  const resolvedLabel = isEssential ? "Essential" : label || "Black";

  return {
    priceId,
    label: resolvedLabel,
    tier: isEssential ? "Essential" : "Black",
  };
}

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

    // Recupera le subscription (anche quelle in trialing, past_due, etc.)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10, // Aumentiamo per vedere tutte le sub
    });

    console.log("📊 Subscriptions trovate:", subscriptions.data.length);
    subscriptions.data.forEach((sub) => {
      console.log(`  - Status: ${sub.status}, Created: ${new Date(sub.created * 1000).toISOString()}`);
    });

    // Cerca una subscription attiva o in trial
    const activeSub = subscriptions.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    );

    if (!activeSub) {
      console.log("❌ Nessuna subscription attiva trovata");
      return NextResponse.json({ subscribed: false, startDate: null });
    }

    const startDate = new Date(activeSub.created * 1000).toISOString();
    console.log("✅ Subscription trovata:", { status: activeSub.status, startDate });

    const firstItem = activeSub.items?.data?.[0] || null;
    const price = firstItem?.price || null;
    const plan = resolvePlan(price);

    return NextResponse.json({
      subscribed: true,
      startDate,
      status: activeSub.status,
      planLabel: plan.label,
      planTier: plan.tier,
      priceId: plan.priceId,
    });
  } catch (error) {
    console.error("Errore recupero subscription info:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle informazioni" },
      { status: 500 }
    );
  }
}
