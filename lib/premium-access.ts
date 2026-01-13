import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminAuth } from "@/lib/firebaseAdmin";
import { hasTempAccess } from "@/lib/temp-access";

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

type CacheEntry = { value: boolean; ts: number; ttl: number };
const globalScope = globalThis as typeof globalThis & {
  __premiumSubCache?: Map<string, CacheEntry>;
};
const SUB_CACHE = globalScope.__premiumSubCache || new Map<string, CacheEntry>();
if (!globalScope.__premiumSubCache) {
  globalScope.__premiumSubCache = SUB_CACHE;
}

const TTL_TRUE_MS = 10 * 60 * 1000;
const TTL_FALSE_MS = 2 * 60 * 1000;

function normalizeEmail(email?: string | null) {
  const normalized = email?.toLowerCase().trim() || "";
  return normalized.length ? normalized : null;
}

function getCached(email: string) {
  const entry = SUB_CACHE.get(email);
  if (!entry) return null;
  if (Date.now() - entry.ts < entry.ttl) return entry.value;
  SUB_CACHE.delete(email);
  return null;
}

function setCached(email: string, value: boolean) {
  SUB_CACHE.set(email, {
    value,
    ts: Date.now(),
    ttl: value ? TTL_TRUE_MS : TTL_FALSE_MS,
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

export async function isPremiumEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  if (hasTempAccess(normalized) || ALL_OVERRIDES.has(normalized)) {
    return true;
  }

  const cached = getCached(normalized);
  if (cached !== null) return cached;

  if (!stripe) {
    throw new Error("missing_stripe_secret_key");
  }

  const customers = await stripe.customers.list({ email: normalized, limit: 100 });
  if (!customers.data.length) {
    setCached(normalized, false);
    return false;
  }

  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 100,
    });
    if (subs.data.some((s) => ACTIVE.has(s.status))) {
      setCached(normalized, true);
      return true;
    }
  }

  setCached(normalized, false);
  return false;
}

export async function requirePremium(
  req: Request
): Promise<{ user: AuthUser } | NextResponse> {
  const auth = await requireAuth(req);
  if (!("user" in auth)) return auth;
  try {
    const ok = await isPremiumEmail(auth.user.email);
    if (!ok) {
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
