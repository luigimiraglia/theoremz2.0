#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const {
  STRIPE_SECRET_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!STRIPE_SECRET_KEY || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Stripe or Supabase credentials in env.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PRODUCT_KIND_MAP = {
  prod_PIltnHyTuX5Qig: "black-standard",
  prod_Plm05qNZgUzhbj: "black-annual",
  prod_PIm5hK5Fvbov68: "essential",
  prod_QiU8Zzfp0c4Gh4: "mentor-base",
  prod_QiUDUqYgN517MM: "mentor-advanced",
};

const CANCEL_STATUSES = new Set(["canceled", "incomplete_expired", "paused"]);

function detectPlanKind(planName, productId) {
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

function isBlackPlan(kind) {
  return kind === "essential" || String(kind || "").startsWith("black-");
}

function normalizeWhatsAppNumber(raw) {
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

function normalizeLeadPhone(raw) {
  const digits = normalizeWhatsAppNumber(raw);
  return digits ? `+${digits}` : null;
}

function secondsToIso(value) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function parseArgs(argv) {
  const opts = {
    commit: false,
    reactivate: false,
    verbose: false,
    limit: null,
    sinceMs: null,
  };
  for (const arg of argv) {
    if (arg === "--commit") opts.commit = true;
    else if (arg === "--reactivate") opts.reactivate = true;
    else if (arg === "--verbose") opts.verbose = true;
    else if (arg.startsWith("--limit=")) {
      const n = Number(arg.split("=").slice(1).join("="));
      if (Number.isFinite(n) && n > 0) opts.limit = n;
    } else if (arg.startsWith("--since=")) {
      const raw = arg.split("=").slice(1).join("=");
      const ms = Date.parse(raw);
      if (!Number.isNaN(ms)) opts.sinceMs = ms;
    }
  }
  return opts;
}

async function findBlackStudentByEmail(email) {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return null;
  const columns =
    "id, preferred_name, student_name, student_email, parent_email, student_phone, parent_phone";
  const { data: studentMatches, error: studentErr } = await supabase
    .from("black_students")
    .select(columns)
    .ilike("student_email", normalized)
    .limit(1);
  if (!studentErr && Array.isArray(studentMatches) && studentMatches[0]) {
    return studentMatches[0];
  }
  const { data: parentMatches, error: parentErr } = await supabase
    .from("black_students")
    .select(columns)
    .ilike("parent_email", normalized)
    .limit(1);
  if (!parentErr && Array.isArray(parentMatches) && parentMatches[0]) {
    return parentMatches[0];
  }
  return null;
}

async function findExistingFollowup(studentId, leadPhone) {
  if (studentId) {
    const { data } = await supabase
      .from("black_followups")
      .select("id, status, next_follow_up_at, full_name, whatsapp_phone, student_id, note")
      .eq("student_id", studentId)
      .maybeSingle();
    if (data?.id) return data;
  }
  if (leadPhone) {
    const { data } = await supabase
      .from("black_followups")
      .select("id, status, next_follow_up_at, full_name, whatsapp_phone, student_id, note")
      .eq("whatsapp_phone", leadPhone)
      .maybeSingle();
    if (data?.id) return data;
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
}) {
  const parts = [
    "Disdetta abbonamento",
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

async function upsertCancellationLead({
  leadName,
  leadPhone,
  leadEmail,
  leadStudentId,
  note,
  reactivate,
  commit,
  verbose,
}) {
  const nowIso = new Date().toISOString();
  const existing = await findExistingFollowup(leadStudentId, leadPhone);
  if (existing) {
    const patch = { updated_at: nowIso };
    if (reactivate) {
      patch.status = "active";
      patch.next_follow_up_at = nowIso;
    }
    if (leadName && !existing.full_name) patch.full_name = leadName;
    if (leadPhone && !existing.whatsapp_phone) patch.whatsapp_phone = leadPhone;
    if (leadStudentId && !existing.student_id) patch.student_id = leadStudentId;
    if (note) {
      if (existing.note) {
        if (!String(existing.note).includes("Disdetta abbonamento")) {
          patch.note = `${existing.note} | ${note}`.slice(0, 500);
        }
      } else {
        patch.note = note;
      }
    }
    const needsUpdate = Object.keys(patch).length > 1;
    if (!needsUpdate) {
      return { status: "skipped_existing" };
    }
    if (commit) {
      const { error } = await supabase
        .from("black_followups")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw error;
    }
    if (verbose) {
      console.log(`[update] ${existing.id} ${leadEmail || leadPhone || ""}`);
    }
    return { status: "updated" };
  }

  if (!leadPhone) return { status: "missing_phone" };

  const insertPayload = {
    full_name: leadName,
    whatsapp_phone: leadPhone,
    note,
    student_id: leadStudentId,
    status: "active",
    next_follow_up_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };
  if (commit) {
    const { error } = await supabase.from("black_followups").insert(insertPayload);
    if (error) throw error;
  }
  if (verbose) {
    console.log(`[insert] ${leadEmail || leadPhone || ""}`);
  }
  return { status: "inserted" };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.commit) {
    console.log("Dry run mode (use --commit to write).");
  }

  const summary = {
    scanned: 0,
    matched: 0,
    inserted: 0,
    updated: 0,
    skippedNotBlack: 0,
    skippedNotCanceled: 0,
    skippedSince: 0,
    skippedExisting: 0,
    skippedNoPhone: 0,
    errors: 0,
  };

  const seen = new Set();
  let startingAfter;

  while (true) {
    const page = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.customer"],
    });

    for (const sub of page.data) {
      summary.scanned += 1;
      if (opts.limit && summary.scanned > opts.limit) break;

      const hasCancelFlag =
        CANCEL_STATUSES.has(sub.status) ||
        Boolean(sub.cancel_at_period_end) ||
        Boolean(sub.canceled_at) ||
        Boolean(sub.cancel_at);
      if (!hasCancelFlag) {
        summary.skippedNotCanceled += 1;
        continue;
      }

      const cancelStamp =
        sub.canceled_at || sub.cancel_at || (sub.cancel_at_period_end ? sub.current_period_end : null);
      if (opts.sinceMs && cancelStamp) {
        const cancelMs = cancelStamp * 1000;
        if (cancelMs < opts.sinceMs) {
          summary.skippedSince += 1;
          continue;
        }
      } else if (opts.sinceMs && !cancelStamp) {
        summary.skippedSince += 1;
        continue;
      }

      const metadata = sub.metadata || {};
      const price = sub.items?.data?.[0]?.price || null;
      const planName =
        metadata.planName ||
        price?.nickname ||
        price?.lookup_key ||
        "Theoremz Black";
      const productId =
        typeof price?.product === "object" && price.product
          ? price.product.id
          : price?.product;
      const planKind = detectPlanKind(planName, productId);
      if (!isBlackPlan(planKind)) {
        summary.skippedNotBlack += 1;
        continue;
      }

      const customer = typeof sub.customer === "object" ? sub.customer : null;
      const leadEmail =
        (metadata.student_email || metadata.parent_email || metadata.email || null) ||
        customer?.email ||
        null;
      let leadName =
        customer?.name ||
        metadata.student_name ||
        metadata.parent_name ||
        metadata.name ||
        null;
      let leadPhone =
        normalizeLeadPhone(customer?.phone || metadata.phone || metadata.whatsapp || null);
      let leadStudentId = null;

      if ((leadEmail && (!leadPhone || !leadName)) || leadEmail) {
        const student = await findBlackStudentByEmail(leadEmail);
        if (student) {
          leadStudentId = student.id || null;
          if (!leadName) {
            leadName = student.preferred_name || student.student_name || null;
          }
          if (!leadPhone) {
            leadPhone = normalizeLeadPhone(
              student.student_phone || student.parent_phone || null,
            );
          }
        }
      }

      const dedupeKey = leadStudentId || leadPhone || sub.id;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      summary.matched += 1;

      const note = buildCancellationNote({
        planLabel: planName || null,
        status: sub.status || null,
        cancelReason: sub.cancellation_details?.reason || null,
        canceledAt: secondsToIso(sub.canceled_at),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        currentPeriodEnd: secondsToIso(sub.current_period_end),
        leadEmail,
      });

      try {
        const result = await upsertCancellationLead({
          leadName,
          leadPhone,
          leadEmail,
          leadStudentId,
          note,
          reactivate: opts.reactivate,
          commit: opts.commit,
          verbose: opts.verbose,
        });
        if (result.status === "inserted") summary.inserted += 1;
        else if (result.status === "updated") summary.updated += 1;
        else if (result.status === "skipped_existing") summary.skippedExisting += 1;
        else if (result.status === "missing_phone") summary.skippedNoPhone += 1;
      } catch (error) {
        summary.errors += 1;
        console.error(`[error] ${sub.id}`, error?.message || error);
      }
    }

    if (!page.has_more) break;
    const last = page.data[page.data.length - 1];
    if (!last?.id) break;
    startingAfter = last.id;
    if (opts.limit && summary.scanned >= opts.limit) break;
  }

  console.log("Done.");
  console.log(summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
