import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);
const CANCEL_SUB_STATUSES = new Set(["canceled", "incomplete_expired", "paused"]);
const CHURN_NOTE_LABEL = "Disdetta abbonamento";
const CHURN_NOTE_MATCH = "disdetta abbonamento";

const PRODUCT_KIND_MAP: Record<string, string> = {
  prod_PIltnHyTuX5Qig: "black-standard",
  prod_Plm05qNZgUzhbj: "black-annual",
  prod_PIm5hK5Fvbov68: "essential",
  prod_QiU8Zzfp0c4Gh4: "mentor-base",
  prod_QiUDUqYgN517MM: "mentor-advanced",
};

type ChurnSource = {
  planLabel: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
  currentPeriodEnd: number | null;
  cancelReason: string | null;
  createdAt: number | null;
};

type SubscriptionGroup = {
  key: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  hasActive: boolean;
  hasChurnSignal: boolean;
  churnSource: ChurnSource | null;
};

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

function detectPlanKind(planName: string, productId?: string | null) {
  if (productId && PRODUCT_KIND_MAP[productId]) {
    return PRODUCT_KIND_MAP[productId];
  }
  const normalized = (planName || "").toLowerCase();
  if (normalized.includes("mentor") && normalized.includes("avanz")) return "mentor-advanced";
  if (normalized.includes("mentor")) return "mentor-base";
  if (normalized.includes("annuale")) return "black-annual";
  if (normalized.includes("standard")) return "black-standard";
  if (normalized.includes("black")) return "black-standard";
  if (normalized.includes("essential")) return "essential";
  return "generic";
}

function isBlackPlan(kind: string) {
  return kind === "essential" || kind.startsWith("black-");
}

function normalizeWhatsAppNumber(raw?: string | null) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D+/g, "");
  if (!digits || digits.length < 6) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length >= 10) {
    digits = digits.replace(/^0+/, "");
  }
  if (!digits.startsWith("39") && digits.length === 10) {
    digits = `39${digits}`;
  }
  return digits;
}

function normalizeLeadPhone(raw?: string | null) {
  const digits = normalizeWhatsAppNumber(raw);
  return digits ? `+${digits}` : null;
}

function normalizeEmail(raw?: string | null) {
  const email = String(raw || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function normalizeLeadContact(phoneRaw?: string | null, emailRaw?: string | null) {
  const phone = normalizeLeadPhone(phoneRaw);
  if (phone) return phone;
  return normalizeEmail(emailRaw);
}

function secondsToIso(value?: number | null) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const legacy = subscription as Stripe.Subscription & { current_period_end?: number | null };
  if (typeof legacy.current_period_end === "number") {
    return legacy.current_period_end;
  }
  const firstItem = subscription.items?.data?.[0];
  if (firstItem && typeof firstItem.current_period_end === "number") {
    return firstItem.current_period_end;
  }
  return null;
}

function buildCancellationNote({
  planLabel,
  status,
  cancelReason,
  canceledAt,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  leadEmail,
}: {
  planLabel: string | null;
  status: string | null;
  cancelReason: string | null;
  canceledAt: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  leadEmail: string | null;
}) {
  const parts = [
    CHURN_NOTE_LABEL,
    planLabel ? `Piano: ${planLabel}` : null,
    status ? `Status: ${status}` : null,
    cancelReason ? `Motivo: ${cancelReason}` : null,
    canceledAt ? `Disdetta: ${canceledAt.slice(0, 10)}` : null,
    cancelAtPeriodEnd && currentPeriodEnd
      ? `Fine periodo: ${currentPeriodEnd.slice(0, 10)}`
      : null,
    leadEmail ? `Email: ${leadEmail}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : null;
}

async function findBlackStudentByEmail(
  db: ReturnType<typeof supabaseServer>,
  email?: string | null,
) {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return null;
  const columns =
    "id, preferred_name, student_name, student_email, parent_email, student_phone, parent_phone";
  const { data: studentMatches, error: studentErr } = await db
    .from("black_students")
    .select(columns)
    .ilike("student_email", normalized)
    .limit(1);
  if (studentErr) throw studentErr;
  if (Array.isArray(studentMatches) && studentMatches[0]) {
    return studentMatches[0];
  }
  const { data: parentMatches, error: parentErr } = await db
    .from("black_students")
    .select(columns)
    .ilike("parent_email", normalized)
    .limit(1);
  if (parentErr) throw parentErr;
  if (Array.isArray(parentMatches) && parentMatches[0]) {
    return parentMatches[0];
  }
  return null;
}

async function findBlackStudentByPhone(
  db: ReturnType<typeof supabaseServer>,
  phone?: string | null,
) {
  const digits = phone ? phone.replace(/\D+/g, "") : "";
  if (!digits || digits.length < 6) return null;
  const columns =
    "id, preferred_name, student_name, student_email, parent_email, student_phone, parent_phone";
  const pattern = `%${digits}%`;
  const { data, error } = await db
    .from("black_students")
    .select(columns)
    .or(`student_phone.ilike.${pattern},parent_phone.ilike.${pattern}`)
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function findChurnFollowup(
  db: ReturnType<typeof supabaseServer>,
  {
    studentId,
    contact,
    email,
  }: {
    studentId?: string | null;
    contact?: string | null;
    email?: string | null;
  },
) {
  const columns =
    "id, status, note, student_id, whatsapp_phone, next_follow_up_at, updated_at";
  if (studentId) {
    const { data, error } = await db
      .from("black_followups")
      .select(columns)
      .eq("student_id", studentId)
      .ilike("note", `%${CHURN_NOTE_MATCH}%`)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    if (Array.isArray(data) && data[0]) return data[0];
  }
  if (contact) {
    const { data, error } = await db
      .from("black_followups")
      .select(columns)
      .eq("whatsapp_phone", contact)
      .ilike("note", `%${CHURN_NOTE_MATCH}%`)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    if (Array.isArray(data) && data[0]) return data[0];
  }
  if (email) {
    const pattern = `%${email}%`;
    const { data, error } = await db
      .from("black_followups")
      .select(columns)
      .ilike("note", pattern)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    if (Array.isArray(data) && data[0]) return data[0];
  }
  return null;
}

async function resolveStripeCustomer(
  client: Stripe,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) return null;
  if (typeof customer === "string") {
    try {
      const fetched = await client.customers.retrieve(customer);
      if ((fetched as Stripe.DeletedCustomer).deleted) return null;
      return fetched as Stripe.Customer;
    } catch {
      return null;
    }
  }
  if ((customer as Stripe.DeletedCustomer).deleted) return null;
  return customer as Stripe.Customer;
}

async function handle(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const startedAt = Date.now();
  const stats = {
    scanned: 0,
    groups: 0,
    churned: 0,
    active: 0,
    created: 0,
    updated: 0,
    dropped: 0,
    skippedNoPhone: 0,
    skippedNoIdentity: 0,
    errors: 0,
  };

  const groups = new Map<string, SubscriptionGroup>();
  let startingAfter: string | undefined;

  try {
    do {
      const page = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });

      for (const sub of page.data) {
        stats.scanned += 1;
        const metadata = (sub.metadata || {}) as Record<string, string>;
        const price = sub.items?.data?.[0]?.price || null;
        const planName =
          metadata.planName ||
          price?.nickname ||
          price?.lookup_key ||
          "Theoremz Black";
        const productId =
          typeof price?.product === "string"
            ? price.product
            : (price?.product as Stripe.Product | undefined)?.id;
        const planKind = detectPlanKind(planName, productId || null);
        if (!isBlackPlan(planKind)) {
          continue;
        }

        const customer = await resolveStripeCustomer(stripe, sub.customer as any);
        const emailRaw =
          metadata.student_email ||
          metadata.parent_email ||
          metadata.email ||
          customer?.email ||
          null;
        const email = emailRaw ? emailRaw.trim().toLowerCase() : null;
        const phone = normalizeLeadPhone(
          customer?.phone || metadata.phone || metadata.whatsapp || null,
        );
        const name =
          customer?.name ||
          metadata.student_name ||
          metadata.parent_name ||
          metadata.name ||
          null;

        const identityKey =
          email
            ? `email:${email}`
            : customer?.id
              ? `customer:${customer.id}`
              : phone
                ? `phone:${phone}`
                : `sub:${sub.id}`;

        const status = sub.status || null;
        const isActive = Boolean(status && ACTIVE_SUB_STATUSES.has(status) && !sub.cancel_at_period_end);
        const churnSignal = Boolean(sub.cancel_at_period_end) || Boolean(status && CANCEL_SUB_STATUSES.has(status));

        const group = groups.get(identityKey) || {
          key: identityKey,
          email,
          phone,
          name,
          hasActive: false,
          hasChurnSignal: false,
          churnSource: null,
        };

        group.email = group.email || email;
        group.phone = group.phone || phone;
        group.name = group.name || name;
        if (isActive) group.hasActive = true;
        if (churnSignal) {
          group.hasChurnSignal = true;
          const createdAt = typeof sub.created === "number" ? sub.created : null;
          const shouldReplace =
            !group.churnSource ||
            (createdAt && group.churnSource.createdAt && createdAt > group.churnSource.createdAt);
          if (shouldReplace) {
            group.churnSource = {
              planLabel: planName || null,
              status,
              cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
              canceledAt: sub.canceled_at || null,
              currentPeriodEnd: getSubscriptionCurrentPeriodEnd(sub),
              cancelReason: (sub.cancellation_details as any)?.reason || null,
              createdAt,
            };
          }
        }

        groups.set(identityKey, group);
      }

      startingAfter = page.data.length ? page.data[page.data.length - 1].id : undefined;
      if (!page.has_more) break;
    } while (true);

    stats.groups = groups.size;

    for (const group of groups.values()) {
      const shouldChurn = group.hasChurnSignal && !group.hasActive;
      if (shouldChurn) stats.churned += 1;
      else stats.active += 1;

      if (!group.email && !group.phone) {
        stats.skippedNoIdentity += 1;
        continue;
      }

      let student: any = null;
      try {
        if (group.email) {
          student = await findBlackStudentByEmail(db, group.email);
        }
        if (!student && group.phone) {
          student = await findBlackStudentByPhone(db, group.phone);
        }
      } catch (error) {
        stats.errors += 1;
        console.error("[cron-sync-followups] student lookup failed", error);
        continue;
      }

      const leadStudentId = student?.id || null;
      const leadName =
        group.name ||
        student?.preferred_name ||
        student?.student_name ||
        null;
      const leadContact =
        group.phone ||
        normalizeLeadContact(
          student?.student_phone || student?.parent_phone || null,
          student?.student_email || student?.parent_email || group.email || null,
        );

      const note = shouldChurn && group.churnSource
        ? buildCancellationNote({
            planLabel: group.churnSource.planLabel,
            status: group.churnSource.status,
            cancelReason: group.churnSource.cancelReason,
            canceledAt: secondsToIso(group.churnSource.canceledAt),
            cancelAtPeriodEnd: group.churnSource.cancelAtPeriodEnd,
            currentPeriodEnd: secondsToIso(group.churnSource.currentPeriodEnd),
            leadEmail: group.email,
          })
        : null;

      let existing: any = null;
      try {
        existing = await findChurnFollowup(db, {
          studentId: leadStudentId,
          contact: leadContact,
          email: group.email,
        });
      } catch (error) {
        stats.errors += 1;
        console.error("[cron-sync-followups] followup lookup failed", error);
        continue;
      }

      const nowIso = new Date().toISOString();

      if (shouldChurn) {
        if (existing?.id) {
          const patch: Record<string, any> = { updated_at: nowIso };
          let changed = false;
          if (existing.status !== "active") {
            patch.status = "active";
            changed = true;
          }
          if (!existing.next_follow_up_at) {
            patch.next_follow_up_at = nowIso;
            changed = true;
          }
          if (!existing.student_id && leadStudentId) {
            patch.student_id = leadStudentId;
            changed = true;
          }
          if ((!existing.whatsapp_phone || existing.whatsapp_phone === "") && leadContact) {
            patch.whatsapp_phone = leadContact;
            changed = true;
          }
          if (note) {
            const existingNote = String(existing.note || "");
            if (!existingNote.toLowerCase().includes(CHURN_NOTE_MATCH)) {
              patch.note = existingNote ? `${existingNote} | ${note}`.slice(0, 500) : note;
              changed = true;
            }
          }
          if (changed) {
            const { error } = await db
              .from("black_followups")
              .update(patch)
              .eq("id", existing.id);
            if (error) throw error;
            stats.updated += 1;
          }
        } else {
          if (!leadContact) {
            stats.skippedNoPhone += 1;
            continue;
          }
          const payload = {
            full_name: leadName,
            whatsapp_phone: leadContact,
            note,
            student_id: leadStudentId,
            status: "active",
            next_follow_up_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso,
          };
          const { error } = await db.from("black_followups").insert(payload);
          if (error) throw error;
          stats.created += 1;
        }
      } else if (existing?.id) {
        const patch: Record<string, any> = { updated_at: nowIso };
        let changed = false;
        if (existing.status !== "dropped") {
          patch.status = "dropped";
          changed = true;
        }
        if (!existing.student_id && leadStudentId) {
          patch.student_id = leadStudentId;
          changed = true;
        }
        if (changed) {
          const { error } = await db
            .from("black_followups")
            .update(patch)
            .eq("id", existing.id);
          if (error) throw error;
          stats.dropped += 1;
        }
      }
    }
  } catch (error) {
    console.error("[cron-sync-followups] fatal error", error);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    stats,
    durationMs: Date.now() - startedAt,
  });
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
