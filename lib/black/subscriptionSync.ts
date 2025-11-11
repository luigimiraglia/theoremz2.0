import Stripe from "stripe";
import type { UserRecord } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";

const HAS_SUPABASE_ENV = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const supabase = HAS_SUPABASE_ENV ? supabaseServer() : null;

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

export type SyncRecordInput = {
  source?: string;
  planName: string;
  subscription: StripeSubscriptionCompat | null;
  stripeCustomer: Stripe.Customer | null;
  metadata?: Stripe.Metadata;
  customerDetails?: Stripe.Checkout.Session.CustomerDetails | null;
  lineItem?: Stripe.LineItem;
};

export async function syncBlackSubscriptionRecord({
  source,
  planName,
  subscription,
  stripeCustomer,
  metadata,
  customerDetails,
  lineItem,
}: SyncRecordInput) {
  if (!supabase) {
    console.warn("[black-sync] Supabase client not configured, skipping subscription sync");
    return { status: "skipped", reason: "missing_supabase" as const };
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
  const firebaseUser = await resolveFirebaseIdentity({
    uid: firstNonEmptyString(meta.firebase_uid, meta.firebaseUid, meta.uid),
    email: (studentEmailCandidate || parentEmailCandidate || null)?.toLowerCase() || null,
  });

  if (!firebaseUser || !firebaseUser.email) {
    console.warn("[black-sync] Firebase user not found, skipping subscription sync", {
      source,
      email: studentEmailCandidate || parentEmailCandidate || null,
    });
    return { status: "skipped", reason: "missing_firebase" as const };
  }

  const planLabel =
    mapPlan(
      subscription?.items?.data?.[0]?.price ||
        lineItem?.price ||
        null,
      planName,
    ) || planName;

  const profilePayload: ProfilePayload = {
    id: firebaseUser.uid,
    full_name: fallbackName(firebaseUser, stripeCustomer, meta),
    role: "student",
    email: firebaseUser.email ?? studentEmailCandidate ?? parentEmailCandidate ?? null,
    subscription_tier: determineSubscriptionTier(subscription?.status),
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
    readiness: clamp(toNumberOrNull(firestoreMeta?.readiness) ?? 50, 0, 100),
    risk_level:
      stringOrNull(meta.risk_level) || stringOrNull(firestoreMeta?.risk_level) || "yellow",
    ai_description: stringOrNull(firestoreMeta?.ai_description),
    next_assessment_subject: stringOrNull(firestoreMeta?.next_assessment_subject),
    next_assessment_date: stringOrNull(firestoreMeta?.next_assessment_date),
  };

  const studentId = await upsertBlackStudent(studentPayload);
  if (!studentId) return { status: "skipped", reason: "missing_student" as const };

  const brief = buildBrief({
    ...studentPayload,
    plan_label: planLabel,
    full_name: profilePayload.full_name,
  });
  await upsertStudentBrief(studentId, brief);

  return { status: "synced" as const, studentId };
}

async function ensureProfile(payload: ProfilePayload) {
  if (!supabase) return;
  const existing = await supabase
    .from("profiles")
    .select("id")
    .eq("id", payload.id)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`[black-sync] Profile lookup failed: ${existing.error.message}`);
  }
  if (existing.data?.id) {
    const updatePayload: Partial<ProfilePayload> & { updated_at: string } = {
      ...payload,
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
    .select("id")
    .eq("user_id", payload.user_id)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`[black-sync] Student lookup failed: ${existing.error.message}`);
  }
  if (existing.data?.id) {
    const { error, data } = await supabase
      .from("black_students")
      .update(payload)
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

function buildBrief(student: BriefSource) {
  const statusLabel = !student.status
    ? "active"
    : PREMIUM_SUB_STATUSES.has(student.status)
      ? student.status
      : `❌ Disdetto (${student.status})`;
  return [
    `${student.full_name || "Studente"} — Theoremz Black`,
    "",
    `Classe: ${student.year_class || "N/A"}   Track: ${student.track || "entrambi"}`,
    `Tutor: ${student.tutor_id || "—"}`,
    "",
    `Piano: ${student.plan_label || "Black"} · Iscritto dal ${student.start_date || "?"}`,
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
    "",
    `Aggiornato: ${new Date().toISOString().slice(0, 10)}`,
  ].join("\n");
}

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
  const match = (needle: string) =>
    nickname.includes(needle) || lookupKey.includes(needle) || priceId.includes(needle);
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
