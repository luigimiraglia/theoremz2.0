import { hasActiveBlackAccess, normalizeStripeStatus } from "@/lib/billingStatus";
import type { supabaseServer } from "@/lib/supabase";

type SupabaseDb = ReturnType<typeof supabaseServer>;

export type SubscriptionTier = "free" | "black" | "mentor";

export type StudentSubscriptionStateInput = {
  subscriptionTier?: SubscriptionTier | string | null;
  subscriptionStatus?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  stripeCancelAtPeriodEnd?: boolean | null;
  stripeCanceledAt?: string | null;
  blackSince?: string | null;
};

function hasOwn<T extends object>(obj: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeTier(value?: string | null): SubscriptionTier {
  if (value === "black" || value === "mentor") return value;
  return "free";
}

export function deriveStudentBlackActive(input: {
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
}) {
  return normalizeTier(input.subscriptionTier) === "black"
    && hasActiveBlackAccess(input.subscriptionStatus);
}

export async function syncStudentSubscriptionState(
  db: SupabaseDb,
  studentId: string,
  input: StudentSubscriptionStateInput,
) {
  const subscriptionStatus = normalizeStripeStatus(input.subscriptionStatus);
  const subscriptionTier = normalizeTier(
    input.subscriptionTier || (hasActiveBlackAccess(subscriptionStatus) ? "black" : "free"),
  );
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    subscription_tier: subscriptionTier,
    subscription_status: subscriptionStatus,
    black_active: deriveStudentBlackActive({
      subscriptionTier,
      subscriptionStatus,
    }),
    updated_at: now,
  };

  if (hasOwn(input, "stripeCustomerId")) {
    payload.stripe_customer_id = input.stripeCustomerId || null;
  }
  if (hasOwn(input, "stripeSubscriptionId")) {
    payload.stripe_subscription_id = input.stripeSubscriptionId || null;
  }
  if (hasOwn(input, "stripePriceId")) {
    payload.stripe_price_id = input.stripePriceId || null;
  }
  if (hasOwn(input, "stripeCurrentPeriodEnd")) {
    payload.stripe_current_period_end = input.stripeCurrentPeriodEnd || null;
  }
  if (hasOwn(input, "stripeCancelAtPeriodEnd")) {
    payload.stripe_cancel_at_period_end = Boolean(input.stripeCancelAtPeriodEnd);
  }
  if (hasOwn(input, "stripeCanceledAt")) {
    payload.stripe_canceled_at = input.stripeCanceledAt || null;
  }
  if (hasOwn(input, "blackSince")) {
    payload.black_since = input.blackSince || null;
  }

  const { error } = await db.from("students").update(payload).eq("id", studentId);
  if (error) {
    throw new Error(`[student-subscription] students update failed: ${error.message}`);
  }
}

export async function resolveStudentBlackActive(
  db: SupabaseDb,
  opts: {
    studentId: string;
    authUid: string;
    fallbackLegacyStatus?: string | null;
  },
) {
  const { data: student, error: studentError } = await db
    .from("students")
    .select("black_active, subscription_tier, subscription_status")
    .eq("id", opts.studentId)
    .maybeSingle();
  if (studentError) throw studentError;
  if (student?.black_active === true) return true;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("subscription_tier, stripe_subscription_status")
    .eq("id", opts.authUid)
    .maybeSingle();
  if (profileError) throw profileError;
  if (
    deriveStudentBlackActive({
      subscriptionTier: profile?.subscription_tier,
      subscriptionStatus: profile?.stripe_subscription_status,
    })
  ) {
    return true;
  }

  return hasActiveBlackAccess(opts.fallbackLegacyStatus);
}

export async function touchStudentBlackActivity(db: SupabaseDb, studentId: string, timestamp: string) {
  const { error } = await db
    .from("students")
    .update({ black_last_active_at: timestamp, updated_at: timestamp })
    .eq("id", studentId);
  if (error) throw error;
}
