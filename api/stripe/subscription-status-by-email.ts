// pages/api/stripe/subscription-status-by-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { email } = req.body as { email: string };
  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  try {
    // 1. Cerca clienti con quell’email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });
    if (customers.data.length === 0) {
      return res.status(200).json({ isSubscribed: false });
    }
    const customerId = customers.data[0].id;

    // 2. Lista subscription per quel customer
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
    });

    // 3. Verifica se c’è almeno una sub “attiva” o in trial
    const active = subs.data.some((s) =>
      ["active", "trialing", "past_due", "unpaid"].includes(s.status)
    );
    return res.status(200).json({ isSubscribed: active });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Stripe error" });
  }
}
