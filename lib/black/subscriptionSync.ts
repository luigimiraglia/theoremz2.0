import Stripe from "stripe";
import crypto from "node:crypto";
import type { UserRecord } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";

const HAS_SUPABASE_ENV = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const supabase = HAS_SUPABASE_ENV ? supabaseServer() : null;
const STRIPE_SIGNUPS_TABLE = "black_stripe_signups";

type StripeSubscriptionCompat = Stripe.Subscription & {
  current_period_end?: number | null;
  start_date?: number | null;
};

export const PREMIUM_SUB_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

type ProfilePayload = {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
  subscription_tier: string;
  stripe_customer_id: string | null;
  stripe_subscription_status: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

type BlackStudentPayload = {
  user_id: string;
  year_class: string | null;
  track: string;
  start_date: string | null;
  goal: string | null;
  difficulty_focus: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  student_phone: string | null;
  student_email: string | null;
  tutor_id: string | null;
  status: string | null;
  initial_avg: number | null;
  readiness: number;
  risk_level: string | null;
  ai_description: string | null;
  next_assessment_subject: string | null;
  next_assessment_date: string | null;
};

type BriefSource = BlackStudentPayload & {
  plan_label?: string | null;
  full_name?: string | null;
};

type StripeSignupStatus = "new" | "synced" | "skipped" | "error";

export type StripeSignupRecordInput = {
  sessionId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  planName?: string | null;
  planLabel?: string | null;
  priceId?: string | null;
  productId?: string | null;
  amountTotal?: number | null;
  amountCurrency?: string | null;
  amountFormatted?: string | null;
  email?: string | null;
  phone?: string | null;
  customerName?: string | null;
  persona?: string | null;
  quizKind?: string | null;
  whatsappLink?: string | null;
  whatsappMessage?: string | null;
  metadata?: Stripe.Metadata | Record<string, any> | null;
  source?: string | null;
  eventCreatedAt?: string | null;
  status?: StripeSignupStatus;
};

export type StripeSignupLinkInput = {
  sessionId?: string | null;
  subscriptionId?: string | null;
  studentUserId?: string | null;
  studentId?: string | null;
  status?: StripeSignupStatus;
};

export type SyncRecordInput = {
  source?: string;
  planName: string;
  subscription: StripeSubscriptionCompat | null;
  stripeCustomer: Stripe.Customer | null;
  metadata?: Stripe.Metadata;
  customerDetails?: Stripe.Checkout.Session.CustomerDetails | null;
  lineItem?: Stripe.LineItem;
};

type SyncBlackSubscriptionResult =
  | { status: "synced"; studentId: string; userId: string }
  | {
      status: "skipped";
      reason: "missing_supabase" | "missing_firebase" | "missing_student";
      studentId?: null;
      userId?: string | null;
    };

export async function recordStripeSignup(payload: StripeSignupRecordInput) {
  if (!supabase) {
    console.warn("[black-sync] skipping stripe signup logging: supabase not configured");
    return { status: "skipped" as const, reason: "missing_supabase" as const };
  }
  if (!payload.sessionId && !payload.subscriptionId) {
    console.warn("[black-sync] skipping stripe signup logging: missing identifiers");
    return { status: "skipped" as const, reason: "missing_identifier" as const };
  }
  const nowIso = new Date().toISOString();
  const row = {
    session_id: payload.sessionId || null,
    subscription_id: payload.subscriptionId || null,
    customer_id: payload.customerId || null,
    plan_name: payload.planName || null,
    plan_label: payload.planLabel || payload.planName || null,
    price_id: payload.priceId || null,
    product_id: payload.productId || null,
    amount_total: payload.amountTotal ?? null,
    amount_currency: payload.amountCurrency || null,
    amount_display: payload.amountFormatted || null,
    customer_email: payload.email || null,
    customer_phone: payload.phone || null,
    customer_name: payload.customerName || null,
    persona: payload.persona || null,
    quiz_kind: payload.quizKind || null,
    whatsapp_link: payload.whatsappLink || null,
    whatsapp_message: payload.whatsappMessage || null,
    metadata: cloneJson(payload.metadata),
    source: payload.source || null,
    status: payload.status || ("new" as StripeSignupStatus),
    event_created_at: payload.eventCreatedAt || null,
    updated_at: nowIso,
  };
  const { error } = await supabase
    .from(STRIPE_SIGNUPS_TABLE)
    .upsert(row, { onConflict: "session_id,subscription_id" });
  if (error) {
    throw new Error(`[black-sync] Stripe signup upsert failed: ${error.message}`);
  }
  return { status: "stored" as const };
}

export async function linkStripeSignupToStudent(payload: StripeSignupLinkInput) {
  if (!supabase) {
    return { status: "skipped" as const, reason: "missing_supabase" as const };
  }
  if (!payload.sessionId && !payload.subscriptionId) {
    return { status: "skipped" as const, reason: "missing_identifier" as const };
  }
  const updatePayload: Record<string, any> = {
    student_user_id: payload.studentUserId || null,
    student_id: payload.studentId || null,
    status: payload.status || ("synced" as StripeSignupStatus),
    updated_at: new Date().toISOString(),
  };
  if ((payload.status || "synced") === "synced") {
    updatePayload.synced_at = new Date().toISOString();
  }
  const query = supabase.from(STRIPE_SIGNUPS_TABLE).update(updatePayload);
  if (payload.sessionId) query.eq("session_id", payload.sessionId);
  if (payload.subscriptionId) query.eq("subscription_id", payload.subscriptionId);
  const { error } = await query;
  if (error) {
    throw new Error(`[black-sync] Stripe signup link failed: ${error.message}`);
  }
  return { status: "updated" as const };
}

export async function syncBlackSubscriptionRecord({
  source,
  planName,
  subscription,
  stripeCustomer,
  metadata,
  customerDetails,
  lineItem,
}: SyncRecordInput): Promise<SyncBlackSubscriptionResult> {
  if (!supabase) {
    console.warn("[black-sync] Supabase client not configured, skipping subscription sync");
    return { status: "skipped" as const, reason: "missing_supabase" };
  }

  const meta = (metadata || {}) as Stripe.Metadata;
  const details = customerDetails || null;
  const studentEmailCandidate = firstNonEmptyString(
    meta.student_email,
    meta.studentEmail,
    meta.email,
    details?.email,
    stripeCustomer?.email,
  );
  const parentEmailCandidate = firstNonEmptyString(
    meta.parent_email,
    meta.parentEmail,
    details?.email,
    stripeCustomer?.email,
  );
  const fallbackUid = firstNonEmptyString(meta.firebase_uid, meta.firebaseUid, meta.uid);
  const firebaseEmailCandidate =
    (studentEmailCandidate || parentEmailCandidate || null)?.toLowerCase() || null;
  let firebaseUser = await resolveFirebaseIdentity({
    uid: fallbackUid,
    email: firebaseEmailCandidate,
  });

  if (!firebaseUser && firebaseEmailCandidate) {
    firebaseUser = await ensureFirebaseUserFromStripe({
      email: firebaseEmailCandidate,
      displayName:
        firstNonEmptyString(meta.student_name, meta.studentName) ||
        stripeCustomer?.name ||
        customerDetails?.name ||
        null,
    });
    if (firebaseUser) {
      console.info("[black-sync] Firebase user auto-created from Stripe", {
        email: firebaseEmailCandidate,
        source,
      });
    }
  }

  if (!firebaseUser || !firebaseUser.email) {
    console.warn("[black-sync] Firebase user not found, skipping subscription sync", {
      source,
      email: studentEmailCandidate || parentEmailCandidate || null,
    });
    return { status: "skipped" as const, reason: "missing_firebase", userId: null };
  }

  const planLabel =
    mapPlan(
      subscription?.items?.data?.[0]?.price ||
        lineItem?.price ||
        null,
      planName,
    ) || planName;

  const subscriptionTier = determineSubscriptionTier(subscription?.status);
  const profilePayload: ProfilePayload = {
    id: firebaseUser.uid,
    full_name: fallbackName(firebaseUser, stripeCustomer, meta),
    role: "student",
    email: firebaseUser.email ?? studentEmailCandidate ?? parentEmailCandidate ?? null,
    subscription_tier: subscriptionTier,
    stripe_customer_id:
      stripeCustomer?.id ||
      (typeof subscription?.customer === "string" ? subscription.customer : null),
    stripe_subscription_status: subscription?.status ?? null,
    stripe_price_id:
      subscription?.items?.data?.[0]?.price?.id || lineItem?.price?.id || null,
    stripe_current_period_end: toIsoStringFromSeconds(subscription?.current_period_end),
    created_at: firebaseUser.metadata?.creationTime || new Date().toISOString(),
    updated_at: firebaseUser.metadata?.lastRefreshTime || new Date().toISOString(),
  };

  await ensureProfile(profilePayload);
  try {
    await syncLiteProfilePatch(firebaseUser.uid, { is_black: subscriptionTier === "black" });
  } catch (error) {
    console.error("[black-sync] lite profile sync failed", error);
  }

  const firestoreMeta = await getFirestoreMeta(firebaseUser.uid);
  const parentName =
    stringOrNull(meta.parent_name) ||
    stringOrNull(meta.parentName) ||
    stripeCustomer?.name ||
    details?.name ||
    null;
  const parentPhone =
    stringOrNull(meta.parent_phone) ||
    stringOrNull(meta.parentPhone) ||
    stripeCustomer?.phone ||
    details?.phone ||
    stringOrNull(meta.phone) ||
    stringOrNull(meta.whatsapp) ||
    null;
  const parentEmail =
    parentEmailCandidate ||
    stringOrNull(firestoreMeta?.parent_email) ||
    firebaseUser.email ||
    studentEmailCandidate ||
    null;
  const studentPhone =
    firstNonEmptyString(
      meta.student_phone,
      meta.studentPhone,
      meta.phone_student,
      firestoreMeta?.studentPhone,
      firebaseUser.phoneNumber,
    ) || null;
  const studentEmail = studentEmailCandidate || firebaseUser.email;

  const studentPayload: BlackStudentPayload = {
    user_id: firebaseUser.uid,
    year_class: mapYear(firestoreMeta) || mapYear(meta) || stringOrNull(meta.year_class),
    track:
      stringOrNull(meta.track) ||
      stringOrNull(meta.student_track) ||
      stringOrNull(firestoreMeta?.track) ||
      "entrambi",
    start_date:
      toDateStringFromSeconds(subscription?.start_date) || stringOrNull(meta.start_date),
    goal:
      stringOrNull(meta.goal) ||
      stringOrNull(meta.student_goal) ||
      stringOrNull(firestoreMeta?.goal),
    difficulty_focus:
      stringOrNull(meta.difficulty_focus) ||
      stringOrNull(meta.difficulty) ||
      stringOrNull(firestoreMeta?.difficulty),
    parent_name: parentName,
    parent_phone: parentPhone,
    parent_email: parentEmail,
    student_phone: studentPhone,
    student_email: studentEmail,
    tutor_id:
      stringOrNull(meta.tutor_id) ||
      stringOrNull(meta.tutorId) ||
      stringOrNull(firestoreMeta?.tutorId),
    status: subscription?.status ?? "active",
    initial_avg: toNumberOrNull(firestoreMeta?.initial_avg),
    readiness: clamp(toNumberOrNull(firestoreMeta?.readiness) ?? 95, 0, 100),
    risk_level:
      stringOrNull(meta.risk_level) || stringOrNull(firestoreMeta?.risk_level) || "yellow",
    ai_description: stringOrNull(firestoreMeta?.ai_description),
    next_assessment_subject: stringOrNull(firestoreMeta?.next_assessment_subject),
    next_assessment_date: stringOrNull(firestoreMeta?.next_assessment_date),
  };

  const studentId = await upsertBlackStudent(studentPayload);
  if (!studentId) {
    return {
      status: "skipped" as const,
      reason: "missing_student",
      userId: firebaseUser.uid,
    };
  }

  const brief = buildBrief({
    ...studentPayload,
    plan_label: planLabel,
    full_name: profilePayload.full_name,
  });
  await upsertStudentBrief(studentId, brief);

  return { status: "synced" as const, studentId, userId: firebaseUser.uid };
}

async function ensureProfile(payload: ProfilePayload) {
  if (!supabase) return;
  const existing = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, email, subscription_tier, stripe_customer_id, stripe_subscription_status, stripe_price_id, stripe_current_period_end, created_at"
    )
    .eq("id", payload.id)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`[black-sync] Profile lookup failed: ${existing.error.message}`);
  }
  if (existing.data?.id) {
    const merged = mergeRecords(payload, existing.data);
    const updatePayload: Partial<ProfilePayload> & { updated_at: string } = {
      ...merged,
      updated_at: new Date().toISOString(),
    };
    delete updatePayload.id;
    delete updatePayload.created_at;
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", payload.id);
    if (error) throw new Error(`[black-sync] Profile update failed: ${error.message}`);
    return;
  }
  const { error } = await supabase.from("profiles").insert(payload);
  if (error) throw new Error(`[black-sync] Profile insert failed: ${error.message}`);
}

async function upsertBlackStudent(payload: BlackStudentPayload) {
  if (!supabase) return null;
  const existing = await supabase
    .from("black_students")
    .select(
      "id, year_class, track, start_date, goal, difficulty_focus, parent_name, parent_phone, parent_email, student_phone, student_email, tutor_id, status, initial_avg, readiness, risk_level, ai_description, next_assessment_subject, next_assessment_date"
    )
    .eq("user_id", payload.user_id)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`[black-sync] Student lookup failed: ${existing.error.message}`);
  }
  if (existing.data?.id) {
    const merged = mergeRecords(payload, existing.data);
    const { error, data } = await supabase
      .from("black_students")
      .update(merged)
      .eq("id", existing.data.id)
      .select("id")
      .single();
    if (error) throw new Error(`[black-sync] Student update failed: ${error.message}`);
    return data?.id ?? existing.data.id;
  }
  const insert = await supabase
    .from("black_students")
    .insert(payload)
    .select("id")
    .single();
  if (insert.error) throw new Error(`[black-sync] Student insert failed: ${insert.error.message}`);
  return insert.data?.id ?? null;
}

async function upsertStudentBrief(studentId: string, brief: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("black_student_brief")
    .upsert({ student_id: studentId, brief_md: brief });
  if (error) throw new Error(`[black-sync] Brief upsert failed: ${error.message}`);
}

async function getFirestoreMeta(uid: string) {
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    return snap.exists ? snap.data() ?? null : null;
  } catch (error) {
    console.error(`[black-sync] Firestore meta fetch failed for ${uid}`, error);
    return null;
  }
}

async function resolveFirebaseIdentity({
  uid,
  email,
}: {
  uid?: string | null;
  email?: string | null;
}) {
  if (uid) {
    try {
      return await adminAuth.getUser(uid);
    } catch (error: any) {
      console.warn(`[black-sync] Firebase UID lookup failed for ${uid}: ${error?.message || error}`);
    }
  }
  if (email) {
    try {
      return await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      console.warn(
        `[black-sync] Firebase email lookup failed for ${email}: ${error?.message || error}`,
      );
    }
  }
  return null;
}

async function ensureFirebaseUserFromStripe({
  email,
  displayName,
}: {
  email: string;
  displayName?: string | null;
}) {
  if (!email) return null;
  try {
    return await adminAuth.createUser({
      email,
      password: generateTempPassword(),
      displayName: displayName || undefined,
      emailVerified: false,
      disabled: false,
    });
  } catch (error: any) {
    if (error?.errorInfo?.code === "auth/email-already-exists") {
      try {
        return await adminAuth.getUserByEmail(email);
      } catch (lookupError) {
        console.error("[black-sync] Failed to fetch existing Firebase user after conflict", {
          email,
          error: lookupError,
        });
        return null;
      }
    }
    console.error("[black-sync] Firebase createUser failed", { email, error });
    return null;
  }
}

function generateTempPassword() {
  return `Tmp${crypto.randomBytes(6).toString("hex")}`;
}

function fallbackName(
  firebaseUser: UserRecord,
  customer: Stripe.Customer | null,
  metadata: Stripe.Metadata,
) {
  return (
    stringOrNull(metadata.student_name) ||
    stringOrNull(metadata.studentName) ||
    firebaseUser.displayName ||
    customer?.name ||
    firebaseUser.email?.split("@")[0] ||
    customer?.email?.split("@")[0] ||
    "Studente"
  );
}

function determineSubscriptionTier(status?: string | null) {
  if (!status) return "free";
  return PREMIUM_SUB_STATUSES.has(status) ? "black" : "free";
}

function normalizePlan(planLabel?: string | null) {
  const label = (planLabel || "").trim();
  if (!label) return { label: "Black", badge: "Black" };
  const lower = label.toLowerCase();
  if (lower.includes("mentor")) return { label, badge: "Mentor" };
  if (lower.includes("essential")) return { label, badge: "Essential" };
  return { label, badge: "Black" };
}

function buildBrief(student: BriefSource) {
  const statusLabel = !student.status
    ? "active"
    : PREMIUM_SUB_STATUSES.has(student.status)
      ? student.status
      : `❌ Disdetto (${student.status})`;
  const subscribedFlag =
    !student.status || PREMIUM_SUB_STATUSES.has(student.status) ? "true" : "false";
  const { label: planLabel, badge: planBadge } = normalizePlan(student.plan_label);
  return [
    `${student.full_name || "Studente"} — Theoremz ${planBadge}`,
    "",
    `Classe: ${student.year_class || "N/A"}   Track: ${student.track || "entrambi"}`,
    `Tutor: ${student.tutor_id || "—"}`,
    "",
    `Piano: ${planLabel} · Iscritto dal ${student.start_date || "?"}`,
    "",
    "Contatti",
    `Genitore: ${student.parent_name || "—"} — ${student.parent_phone || "—"} — ${
      student.parent_email || "—"
    }`,
    `Studente: ${student.student_email || "—"} — ${student.student_phone || "—"}`,
    "",
    `Stato: ${statusLabel} · Readiness: ${student.readiness ?? 50}/100 (${
      student.risk_level || "yellow"
    })`,
    `Subscribed: ${subscribedFlag}`,
    "",
    `Aggiornato: ${new Date().toISOString().slice(0, 10)}`,
  ].join("\n");
}

const ESSENTIAL_PRODUCT_IDS = new Set(["prod_pim5hk5fvbov68", "prod_plm5hk5fvbov68"]);
const MENTOR_PRODUCT_LABELS: Record<string, string> = {
  prod_qiu8zzfp0c4gh4: "Mentor Base",
  prod_qiuduqygn517mm: "Mentor Avanzato",
};

export function mapPlan(
  price: Stripe.Price | Stripe.Plan | null | undefined,
  fallback = "Black",
): string {
  if (!price) return fallback;
  const nickname = (price.nickname || "").toLowerCase();
  const lookupKey =
    typeof (price as Stripe.Price).lookup_key === "string"
      ? ((price as Stripe.Price).lookup_key as string).toLowerCase()
      : "";
  const priceId = (price.id || "").toLowerCase();
  const productId =
    typeof price?.product === "string"
      ? price.product.toLowerCase()
      : price?.product?.id?.toLowerCase?.() || "";
  const match = (needle: string) =>
    nickname.includes(needle) ||
    lookupKey.includes(needle) ||
    priceId.includes(needle) ||
    productId.includes(needle);

  if (productId && MENTOR_PRODUCT_LABELS[productId]) return MENTOR_PRODUCT_LABELS[productId];
  if (match("mentor")) return "Mentor";

  if (ESSENTIAL_PRODUCT_IDS.has(productId)) return "Black Essential";
  if (match("essential")) return "Black Essential";
  if (match("standard") || match("std")) return "Black Standard";
  if (match("ann") || match("year") || match("annual")) return "Black Annuale";
  if (nickname.length) return `Black ${price.nickname}`;
  return fallback;
}

function mapYear(doc: any) {
  const year = Number(doc?.year);
  if (!Number.isFinite(year)) return null;
  const indirizzo = (doc?.indirizzo || "").toLowerCase();
  if (indirizzo.includes("liceo")) return `${year}°Liceo`;
  return `${year}°Superiore`;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function mergeRecords<T extends Record<string, any>>(
  incoming: T,
  existing?: Partial<T> | null
): T {
  const result: Record<string, any> = {};
  for (const key of Object.keys(incoming)) {
    const nextValue = incoming[key];
    const currentValue = existing ? (existing as any)[key] : undefined;
    result[key] = preferValue(nextValue, currentValue);
  }
  return result as T;
}

function preferValue<T>(incoming: T, current: T) {
  if (incoming === null || incoming === undefined) return current ?? null;
  if (typeof incoming === "string") {
    const trimmed = incoming.trim();
    if (!trimmed) {
      return current ?? null;
    }
    return trimmed as unknown as T;
  }
  return incoming;
}

function cloneJson(input: Stripe.Metadata | Record<string, any> | null | undefined) {
  if (!input) return null;
  try {
    return JSON.parse(JSON.stringify(input));
  } catch {
    return input;
  }
}

function firstNonEmptyString(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = stringOrNull(value);
    if (normalized) return normalized;
  }
  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toIsoStringFromSeconds(value?: number | null) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function toDateStringFromSeconds(value?: number | null) {
  if (!value) return null;
  return new Date(value * 1000).toISOString().slice(0, 10);
}

export async function resolveStripeCustomer(
  stripe: Stripe | null,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
) {
  if (!stripe || !customer) return null;
  if (typeof customer === "string") {
    const fetched = await stripe.customers.retrieve(customer);
    if (isDeletedCustomer(fetched)) return null;
    return fetched;
  }
  if (isDeletedCustomer(customer)) return null;
  return customer as Stripe.Customer;
}

export async function resolveStripeSubscription(
  stripe: Stripe | null,
  subscription: string | Stripe.Subscription | null | undefined,
) {
  if (!stripe || !subscription) return null;
  if (typeof subscription === "string") {
    return await stripe.subscriptions.retrieve(subscription, {
      expand: ["items.data.price.product"],
    });
  }
  const sub = subscription as Stripe.Subscription;
  const firstPrice = sub.items?.data?.[0]?.price;
  if (!firstPrice || typeof firstPrice.product === "string") {
    return await stripe.subscriptions.retrieve(sub.id, {
      expand: ["items.data.price.product"],
    });
  }
  return sub;
}

function isDeletedCustomer(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
): customer is Stripe.DeletedCustomer {
  return Boolean((customer as Stripe.DeletedCustomer).deleted);
}

export function customerToDetails(
  customer: Stripe.Customer | null,
): Stripe.Checkout.Session.CustomerDetails | null {
  if (!customer) return null;
  return {
    address: null,
    email: customer.email || null,
    name: customer.name || null,
    phone: customer.phone || null,
    tax_exempt: null,
    tax_ids: [],
  };
}
