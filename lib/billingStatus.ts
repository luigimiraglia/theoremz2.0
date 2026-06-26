const ACCESS_ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);
const DISPLAY_ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function normalizeStripeStatus(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  return normalized || null;
}

export function hasActiveBlackAccess(status?: string | null) {
  const normalized = normalizeStripeStatus(status);
  return Boolean(normalized && ACCESS_ACTIVE_STATUSES.has(normalized));
}

export function getBillingDisplayStatus(
  status?: string | null,
  cancelAtPeriodEnd?: boolean | null,
  currentPeriodEnd?: string | null,
) {
  const normalized = normalizeStripeStatus(status);
  const periodEndMs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : null;
  const isExpired = typeof periodEndMs === "number" && Number.isFinite(periodEndMs)
    ? periodEndMs < Date.now()
    : false;

  if (cancelAtPeriodEnd) return "disdetto";
  if (!normalized) return isExpired ? "disdetto" : null;
  if (DISPLAY_ACTIVE_STATUSES.has(normalized) && !isExpired) return "active";
  return "disdetto";
}

export function deriveOperationalStatus({
  blackStatus,
  stripeStatus,
  stripeCancelAtPeriodEnd,
  stripeCurrentPeriodEnd,
}: {
  blackStatus?: string | null;
  stripeStatus?: string | null;
  stripeCancelAtPeriodEnd?: boolean | null;
  stripeCurrentPeriodEnd?: string | null;
}) {
  const billingStatus = getBillingDisplayStatus(
    stripeStatus,
    stripeCancelAtPeriodEnd,
    stripeCurrentPeriodEnd,
  );
  if (billingStatus) return billingStatus;
  return normalizeStripeStatus(blackStatus);
}
