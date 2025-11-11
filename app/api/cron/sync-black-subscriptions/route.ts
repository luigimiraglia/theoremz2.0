import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  customerToDetails,
  mapPlan,
  resolveStripeCustomer,
  syncBlackSubscriptionRecord,
} from "@/lib/black/subscriptionSync";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const stats = { processed: 0, synced: 0, skipped: 0, errors: 0 };

  let startingAfter: string | undefined;
  try {
    do {
      const page = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer", "data.items.data.price.product"],
      });
      for (const sub of page.data) {
        stats.processed += 1;
        const customer =
          typeof sub.customer === "object" && sub.customer && !("deleted" in sub.customer)
            ? (sub.customer as Stripe.Customer)
            : await resolveStripeCustomer(stripe, sub.customer as any);
        const subscriptionPrice = sub.items?.data?.[0]?.price || null;

        try {
          const result = await syncBlackSubscriptionRecord({
            source: `cron:${sub.id}`,
            planName:
              mapPlan(
                subscriptionPrice,
                subscriptionPrice?.nickname ||
                  subscriptionPrice?.lookup_key ||
                  "Theoremz Black",
              ) || "Theoremz Black",
            subscription: sub,
            stripeCustomer: customer || null,
            metadata: (sub.metadata || {}) as Stripe.Metadata,
            customerDetails: customerToDetails(customer || null),
            lineItem: undefined,
          });
          if (result.status === "synced") stats.synced += 1;
          else stats.skipped += 1;
        } catch (error) {
          stats.errors += 1;
          console.error("[cron-sync] subscription sync failed", sub.id, error);
        }
      }
      startingAfter = page.data.length ? page.data[page.data.length - 1].id : undefined;
      if (!page.has_more) break;
    } while (true);
  } catch (error) {
    console.error("[cron-sync] fatal error", error);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }

  const durationMs = Date.now() - startedAt;
  return NextResponse.json({ ok: true, stats, durationMs });
}

function isAuthorized(req: Request) {
  if (process.env.NODE_ENV !== "production" && !CRON_SECRET) return true;
  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const url = new URL(req.url);
  const provided =
    bearer ||
    req.headers.get("x-cron-secret") ||
    url.searchParams.get("secret") ||
    null;
  if (CRON_SECRET) return provided === CRON_SECRET;
  return req.headers.has("x-vercel-cron");
}
