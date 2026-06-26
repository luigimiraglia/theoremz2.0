import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth } from "@/lib/firebaseAdmin";
import { hasTempAccess } from "@/lib/temp-access";
import { supabaseServer } from "@/lib/supabase";
import { ensureStudentRecord } from "@/lib/students";
import { syncStudentSubscriptionState } from "@/lib/studentSubscription";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

const ACTIVE = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

const LOCAL_SUB_OVERRIDES =
  process.env.NODE_ENV === "development" ? ["ermatto@gmail.com"] : [];
const ENV_SUB_OVERRIDES = (process.env.NEXT_PUBLIC_SUB_OVERRIDES || "")
  .split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);
const ALL_OVERRIDES = new Set(
  [...LOCAL_SUB_OVERRIDES, ...ENV_SUB_OVERRIDES].map((e) => e.toLowerCase())
);

type PremiumAccessSource = "stripe" | "temp_access" | "override";
type PremiumPlanTier = "Essential" | "Black";
export type PremiumAccessResult = {
  isSubscribed: boolean;
  source: PremiumAccessSource;
  stripe?: {
    customerId: string | null;
    subscriptionId: string | null;
    status: string | null;
    priceId: string | null;
    startDate: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    planLabel: string | null;
    planTier: PremiumPlanTier;
  };
};
type CacheEntry = { value: PremiumAccessResult | boolean; ts: number; ttl: number };
const globalScope = globalThis as typeof globalThis & {
  __premiumSubCache?: Map<string, CacheEntry>;
};
const SUB_CACHE = globalScope.__premiumSubCache || new Map<string, CacheEntry>();
if (!globalScope.__premiumSubCache) {
  globalScope.__premiumSubCache = SUB_CACHE;
}

const TTL_TRUE_MS = 10 * 60 * 1000;
const TTL_FALSE_MS = 2 * 60 * 1000;

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
    .filter(Boolean),
);
ESSENTIAL_PRICE_IDS.add("price_1Ptv7qHuThKalaHIO45IqjKL");

const ESSENTIAL_PRODUCT_IDS = new Set(
  (process.env.ESSENTIAL_PRODUCT_IDS || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean),
);
ESSENTIAL_PRODUCT_IDS.add("prod_PIm5hK5Fvbov68");

function normalizeEmail(email?: string | null) {
  const normalized = email?.toLowerCase().trim() || "";
  return normalized.length ? normalized : null;
}

function normalizeCachedValue(value: CacheEntry["value"]): PremiumAccessResult {
  if (typeof value === "boolean") {
    return { isSubscribed: value, source: "stripe" };
  }
  return value;
}

function getCached(email: string) {
  const entry = SUB_CACHE.get(email);
  if (!entry) return null;
  if (Date.now() - entry.ts < entry.ttl) return normalizeCachedValue(entry.value);
  SUB_CACHE.delete(email);
  return null;
}

function setCached(email: string, value: PremiumAccessResult) {
  SUB_CACHE.set(email, {
    value,
    ts: Date.now(),
    ttl: value.isSubscribed ? TTL_TRUE_MS : TTL_FALSE_MS,
  });
}

export type AuthUser = { uid: string; email: string };

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice("Bearer ".length);
    const decoded = await adminAuth.verifyIdToken(token);
    const email = normalizeEmail(decoded.email);
    if (!decoded.uid || !email) return null;
    return { uid: decoded.uid, email };
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: Request
): Promise<{ user: AuthUser } | NextResponse> {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return { user };
}

function stripeDateFromSeconds(value?: number | null) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

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

  return {
    label: isEssential ? "Essential" : label || "Black",
    tier: (isEssential ? "Essential" : "Black") as PremiumPlanTier,
  };
}

function resultFromSubscription(
  customer: Stripe.Customer,
  subscription: Stripe.Subscription,
  isSubscribed = true,
): PremiumAccessResult {
  const price = subscription.items?.data?.[0]?.price || null;
  const plan = resolvePlan(price);
  return {
    isSubscribed,
    source: "stripe",
    stripe: {
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: subscription.status || null,
      priceId: price?.id || null,
      startDate: stripeDateFromSeconds(subscription.created),
      currentPeriodEnd: stripeDateFromSeconds(
        (subscription as Stripe.Subscription & { current_period_end?: number | null })
          .current_period_end,
      ),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      canceledAt: stripeDateFromSeconds(subscription.canceled_at),
      planLabel: plan.label,
      planTier: plan.tier,
    },
  };
}

async function getPremiumAccessByEmail(email: string): Promise<PremiumAccessResult> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { isSubscribed: false, source: "stripe" };

  if (hasTempAccess(normalized)) {
    return { isSubscribed: true, source: "temp_access" };
  }
  if (ALL_OVERRIDES.has(normalized)) {
    return { isSubscribed: true, source: "override" };
  }

  const cached = getCached(normalized);
  if (cached !== null) return cached;

  if (!stripe) {
    throw new Error("missing_stripe_secret_key");
  }

  const customers = await stripe.customers.list({ email: normalized, limit: 100 });
  if (!customers.data.length) {
    const result: PremiumAccessResult = { isSubscribed: false, source: "stripe" };
    setCached(normalized, result);
    return result;
  }

  let latestInactiveResult: PremiumAccessResult | null = null;
  let latestInactiveCreated = 0;

  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 100,
    });
    const activeSubscription = subs.data.find((s) => ACTIVE.has(s.status));
    if (activeSubscription) {
      const result = resultFromSubscription(customer, activeSubscription);
      setCached(normalized, result);
      return result;
    }

    const latestSubscription = subs.data
      .slice()
      .sort((a, b) => (b.created || 0) - (a.created || 0))[0];
    if (latestSubscription) {
      const candidate = resultFromSubscription(customer, latestSubscription, false);
      if (!latestInactiveResult || latestSubscription.created > latestInactiveCreated) {
        latestInactiveResult = candidate;
        latestInactiveCreated = latestSubscription.created || 0;
      }
    }
  }

  const result: PremiumAccessResult = latestInactiveResult || {
    isSubscribed: false,
    source: "stripe",
  };
  setCached(normalized, result);
  return result;
}

async function mirrorStripeAccessToStudent(user: AuthUser, access: PremiumAccessResult) {
  if (access.source !== "stripe") return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const db = supabaseServer();
    const student = await ensureStudentRecord(
      {
        authUid: user.uid,
        email: user.email,
        source: "premium_access",
      },
      db,
    );
    await syncStudentSubscriptionState(db, student.id, {
      subscriptionTier: access.isSubscribed ? "black" : "free",
      subscriptionStatus: access.stripe?.status ?? null,
      ...(access.stripe
        ? {
            stripeCustomerId: access.stripe.customerId,
            stripeSubscriptionId: access.stripe.subscriptionId,
            stripePriceId: access.stripe.priceId,
            stripeCurrentPeriodEnd: access.stripe.currentPeriodEnd,
            stripeCancelAtPeriodEnd: access.stripe.cancelAtPeriodEnd,
            stripeCanceledAt: access.stripe.canceledAt,
          }
        : {}),
    });
  } catch (error) {
    console.warn("[premium-access] failed to mirror Stripe access to students", error);
  }
}

export async function getPremiumAccessForUser(user: AuthUser): Promise<PremiumAccessResult> {
  const access = await getPremiumAccessByEmail(user.email);
  await mirrorStripeAccessToStudent(user, access);
  return access;
}

export async function isPremiumEmail(email: string): Promise<boolean> {
  const access = await getPremiumAccessByEmail(email);
  return access.isSubscribed;
}

export async function requirePremium(
  req: Request
): Promise<{ user: AuthUser } | NextResponse> {
  const auth = await requireAuth(req);
  if (!("user" in auth)) return auth;
  try {
    const access = await getPremiumAccessForUser(auth.user);
    if (!access.isSubscribed) {
      return NextResponse.json(
        { error: "subscription_required" },
        { status: 403 }
      );
    }
    return auth;
  } catch (error) {
    console.error("[premium-access] subscription check failed", error);
    return NextResponse.json(
      { error: "subscription_check_failed" },
      { status: 500 }
    );
  }
}
