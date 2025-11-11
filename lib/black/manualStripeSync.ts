import Stripe from "stripe";
import {
  customerToDetails,
  linkStripeSignupToStudent,
  mapPlan,
  resolveStripeCustomer,
  resolveStripeSubscription,
  syncBlackSubscriptionRecord,
} from "@/lib/black/subscriptionSync";
import { supabaseServer } from "@/lib/supabase";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

type SupabaseClient = ReturnType<typeof supabaseServer>;

export type StripeSignupSyncOptions = {
  limit?: number;
  since?: string | Date | null;
  db?: SupabaseClient;
};

export type StripeSignupSyncResult = {
  stats: { processed: number; synced: number; skipped: number; errors: number };
  details: Array<{
    id: string;
    status: "synced" | "skipped" | "error";
    reason?: string;
    plan?: string;
    email?: string | null;
    name?: string | null;
  }>;
};

export async function syncPendingStripeSignups(
  options: StripeSignupSyncOptions = {},
): Promise<StripeSignupSyncResult> {
  if (!stripe) {
    throw new Error("Stripe non è configurato (STRIPE_SECRET_KEY mancante)");
  }
  const db = options.db ?? supabaseServer();
  const limit = normalizeLimit(options.limit);
  const sinceIso =
    typeof options.since === "string"
      ? options.since
      : options.since instanceof Date
        ? options.since.toISOString()
        : null;

  let query = db
    .from("black_stripe_signups")
    .select("*")
    .neq("status", "synced")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (sinceIso) query = query.gte("created_at", sinceIso);

  const { data: signups, error } = await query;
  if (error) {
    throw new Error(`[manual-sync] query fallita: ${error.message}`);
  }
  const rows = signups ?? [];
  if (!rows.length) {
    return {
      stats: { processed: 0, synced: 0, skipped: 0, errors: 0 },
      details: [],
    };
  }

  const stats = { processed: rows.length, synced: 0, skipped: 0, errors: 0 };
  const details: StripeSignupSyncResult["details"] = [];

  for (const row of rows) {
    const identifier =
      row.session_id ||
      row.subscription_id ||
      row.customer_email ||
      row.customer_name ||
      "unknown";
    try {
      const context = await hydrateStripeContext(row);
      if (!context) {
        stats.skipped += 1;
        details.push({
          id: identifier,
          status: "skipped",
          reason: "stripe_context_missing",
          plan: row.plan_label || row.plan_name || undefined,
          email: row.customer_email,
          name: row.customer_name,
        });
        continue;
      }

      const planName =
        row.plan_label ||
        row.plan_name ||
        mapPlan(context.subscription?.items?.data?.[0]?.price || null, "Theoremz Black") ||
        "Theoremz Black";

      const result = await syncBlackSubscriptionRecord({
        source: `manual:${identifier}`,
        planName,
        subscription: context.subscription,
        stripeCustomer: context.customer,
        metadata: context.metadata,
        customerDetails: context.customerDetails,
        lineItem: context.lineItem,
      });

      if (result.status === "synced") {
        stats.synced += 1;
        await linkStripeSignupToStudent({
          sessionId: row.session_id,
          subscriptionId: context.subscription?.id || row.subscription_id,
          studentId: result.studentId,
          studentUserId: result.userId,
          status: "synced",
        });
        if (!row.subscription_id && context.subscription?.id) {
          await db
            .from("black_stripe_signups")
            .update({ subscription_id: context.subscription.id })
            .eq("session_id", row.session_id);
        }
        details.push({
          id: identifier,
          status: "synced",
          plan: planName,
          email: row.customer_email,
          name: row.customer_name,
        });
      } else {
        stats.skipped += 1;
        details.push({
          id: identifier,
          status: "skipped",
          reason: result.reason,
          plan: planName,
          email: row.customer_email,
          name: row.customer_name,
        });
      }
    } catch (err: any) {
      stats.errors += 1;
      details.push({
        id: identifier,
        status: "error",
        reason: err?.message || "unknown_error",
        plan: row.plan_label || row.plan_name || undefined,
        email: row.customer_email,
        name: row.customer_name,
      });
      console.error("[manual-sync] errore durante il sync", identifier, err);
    }
  }

  return { stats, details };
}

type StripeSignupRow = {
  session_id?: string | null;
  subscription_id?: string | null;
  plan_name?: string | null;
  plan_label?: string | null;
  metadata?: any;
  customer_email?: string | null;
  customer_name?: string | null;
};

type StripeContext = {
  subscription: Stripe.Subscription | null;
  customer: Stripe.Customer | null;
  metadata: Stripe.Metadata;
  customerDetails: Stripe.Checkout.Session.CustomerDetails | null;
  lineItem?: Stripe.LineItem;
};

async function hydrateStripeContext(row: StripeSignupRow): Promise<StripeContext | null> {
  if (!stripe) return null;
  let subscription: Stripe.Subscription | null = null;
  let stripeCustomer: Stripe.Customer | null = null;
  let metadata: Stripe.Metadata = (row.metadata || {}) as Stripe.Metadata;
  let customerDetails: Stripe.Checkout.Session.CustomerDetails | null = null;
  let lineItem: Stripe.LineItem | undefined;

  if (row.subscription_id) {
    subscription = await resolveStripeSubscription(stripe, row.subscription_id);
    if (!subscription) return null;
    metadata = (subscription.metadata || {}) as Stripe.Metadata;
    stripeCustomer = await resolveStripeCustomer(stripe, subscription.customer as any);
    customerDetails = customerToDetails(stripeCustomer);
  } else if (row.session_id) {
    const session = await stripe.checkout.sessions.retrieve(row.session_id, {
      expand: ["line_items.data.price.product", "customer"],
    });
    customerDetails = session.customer_details ?? null;
    metadata = (session.metadata || {}) as Stripe.Metadata;
    lineItem = session.line_items?.data?.[0];
    subscription = await resolveStripeSubscription(stripe, session.subscription);
    if (session.customer) {
      stripeCustomer = await resolveStripeCustomer(stripe, session.customer);
    } else if (subscription?.customer) {
      stripeCustomer = await resolveStripeCustomer(stripe, subscription.customer as any);
    }
  } else {
    return null;
  }

  return {
    subscription,
    customer: stripeCustomer,
    metadata,
    customerDetails,
    lineItem,
  };
}

function normalizeLimit(raw?: number | null) {
  if (!Number.isFinite(raw)) return 25;
  return Math.min(Math.max(Number(raw), 1), 100);
}
