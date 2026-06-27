import { NextRequest, NextResponse } from "next/server";
import { upsertCanonicalLead } from "@/lib/canonicalLeads";
import { supabaseServer } from "@/lib/supabase";
import { getRomeDayRange } from "@/lib/rome-time";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const FOLLOWUP_STEPS_DAYS = [1, 2, 7, 30];
const LAST_STEP_INDEX = FOLLOWUP_STEPS_DAYS.length - 1;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdminEmail(email?: string | null) {
  return Boolean(email && email.toLowerCase() === ADMIN_EMAIL);
}

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;

  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { adminAuth } = await import("@/lib/firebaseAdmin");
    const token = authHeader.slice("Bearer ".length);
    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("[admin/leads] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function computeNextFollowUp(stepIndex: number, from: Date) {
  const offset = FOLLOWUP_STEPS_DAYS[stepIndex];
  if (offset === undefined) return null;
  return addDays(from, offset);
}

function normalizeHandle(raw?: string | null) {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^@+/, "");
  return cleaned || null;
}

function normalizePhone(raw?: string | null) {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "").trim();
  const digits = compact.replace(/\D/g, "");
  if (!digits) return null;
  if (compact.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00") && digits.length > 2) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

function normalizeLeadChannel(row: any) {
  if (row?.channel === "black") return "black";
  if (row?.channel === "instagram" || row?.instagram_handle) return "instagram";
  if (["whatsapp", "phone", "email"].includes(row?.channel)) return "whatsapp";
  if (row?.phone) return "whatsapp";
  return "unknown";
}

function diffDaysFromNow(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function mapLead(row: any) {
  if (!row) return null;
  const channel = normalizeLeadChannel(row);
  const firstSeenAt = row.first_seen_at || row.created_at || null;
  return {
    id: row.id as string,
    name: row.full_name || null,
    instagramHandle: row.instagram_handle || null,
    whatsappPhone: row.phone || null,
    note: row.note || null,
    channel,
    status: row.status || "active",
    currentStep: typeof row.current_step === "number" ? row.current_step : 0,
    nextFollowUpAt: row.next_follow_up_at || null,
    lastContactedAt: row.last_contacted_at || null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    firstSeenAt,
    lastSeenAt: row.last_seen_at || row.updated_at || null,
    leadAgeDays:
      typeof row.lead_age_days === "number" ? row.lead_age_days : diffDaysFromNow(firstSeenAt),
    heatScore: row.temperature_score ?? null,
    heatLabel: row.temperature_label || null,
    funnel: row.funnel || null,
  };
}

function baseVisibleQuery(db: ReturnType<typeof supabaseServer>) {
  return db.from("leads").select("*").neq("funnel", "black_churn");
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const includeCompleted = searchParams.get("includeCompleted") === "1";
  const limitRaw = Number(searchParams.get("limit") || 150);
  const limit = Math.max(1, Math.min(500, limitRaw));
  const fetchAll = searchParams.get("all") === "1";

  const { start: dayStart, end: dayEnd } = getRomeDayRange(dateParam);

  if (fetchAll) {
    const { data, error } = await baseVisibleQuery(db)
      .order("temperature_score", { ascending: false })
      .order("next_follow_up_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[admin/leads] all fetch error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      all: (data || []).map(mapLead).filter((lead) => lead && lead.channel !== "black"),
    });
  }

  const [
    { data: dueRows, error: dueErr },
    { data: upcomingRows, error: upcomingErr },
    completedPromise,
  ] = await Promise.all([
    baseVisibleQuery(db)
      .eq("status", "active")
      .lte("next_follow_up_at", dayEnd.toISOString())
      .order("temperature_score", { ascending: false })
      .order("next_follow_up_at", { ascending: true }),
    baseVisibleQuery(db)
      .eq("status", "active")
      .gt("next_follow_up_at", dayEnd.toISOString())
      .order("temperature_score", { ascending: false })
      .order("next_follow_up_at", { ascending: true })
      .limit(limit),
    includeCompleted
      ? baseVisibleQuery(db)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const completedRows = "data" in completedPromise ? completedPromise.data : [];
  const completedErr = "error" in completedPromise ? (completedPromise as any).error : null;

  if (dueErr) {
    console.error("[admin/leads] due fetch error", dueErr);
    return NextResponse.json({ error: dueErr.message }, { status: 500 });
  }
  if (upcomingErr) {
    console.error("[admin/leads] upcoming fetch error", upcomingErr);
    return NextResponse.json({ error: upcomingErr.message }, { status: 500 });
  }
  if (completedErr) {
    console.error("[admin/leads] completed fetch error", completedErr);
    return NextResponse.json({ error: completedErr.message }, { status: 500 });
  }

  const filterVisible = (arr: any[] | null | undefined) =>
    (arr || []).map(mapLead).filter((lead) => lead && lead.channel !== "black");

  return NextResponse.json({
    date: dayStart.toISOString(),
    due: filterVisible(dueRows),
    upcoming: filterVisible(upcomingRows),
    completed: includeCompleted ? filterVisible(completedRows) : [],
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : null;
  const note = typeof body.note === "string" ? body.note.trim() : null;
  const instagramHandle = normalizeHandle(body.instagram || body.instagramHandle || body.handle);
  const whatsappPhone = normalizePhone(body.whatsapp || body.whatsappPhone || body.phone);

  if (!instagramHandle && !whatsappPhone) {
    return NextResponse.json({ error: "contact_missing" }, { status: 400 });
  }

  const channel = instagramHandle ? "instagram" : "whatsapp";
  const now = new Date();
  const nextFollowUp = computeNextFollowUp(0, now);

  let leadId: string | null = null;
  try {
    leadId = await upsertCanonicalLead({
      fullName: name,
      note,
      instagramHandle,
      phone: whatsappPhone,
      channel,
      source: "admin_manual",
      funnel: "manual",
      status: "active",
      responseStatus: "pending",
      currentStep: 0,
      nextFollowUpAt: nextFollowUp,
      createdAt: now,
      updatedAt: now,
      fallbackKey: `admin_manual:${now.getTime()}`,
    });
  } catch (error: any) {
    console.error("[admin/leads] upsert error", error);
    return NextResponse.json({ error: error?.message || "insert_failed" }, { status: 500 });
  }

  if (!leadId) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const { data, error } = await db.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (error) {
    console.error("[admin/leads] fetch after insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: mapLead(data) });
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  if (action === "advance") {
    const { data: existing, error: fetchErr } = await db
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) {
      console.error("[admin/leads] advance fetch error", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.status === "completed") {
      return NextResponse.json({ error: "already_completed" }, { status: 400 });
    }

    const now = new Date();
    const currentStep = Number(existing.current_step ?? 0);
    const isMonthly = currentStep >= LAST_STEP_INDEX;
    const nextStep = isMonthly
      ? LAST_STEP_INDEX
      : Math.min(currentStep + 1, FOLLOWUP_STEPS_DAYS.length);
    const nextFollowUp = isMonthly
      ? addDays(now, FOLLOWUP_STEPS_DAYS[LAST_STEP_INDEX])
      : computeNextFollowUp(nextStep, now);
    const updatePayload: Record<string, any> = {
      current_step: nextStep,
      last_contacted_at: now.toISOString(),
      next_follow_up_at: nextFollowUp ? nextFollowUp.toISOString() : null,
      status: nextFollowUp ? "active" : "completed",
    };
    if (!nextFollowUp) updatePayload.completed_at = now.toISOString();

    const { data, error } = await db
      .from("leads")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[admin/leads] advance update error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ lead: mapLead(data) });
  }

  if (action === "snooze_monthly") {
    const now = new Date();
    const nextFollowUp = addDays(now, FOLLOWUP_STEPS_DAYS[LAST_STEP_INDEX]);
    const { data, error } = await db
      .from("leads")
      .update({
        current_step: LAST_STEP_INDEX,
        status: "active",
        last_contacted_at: now.toISOString(),
        next_follow_up_at: nextFollowUp.toISOString(),
        completed_at: null,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[admin/leads] snooze update error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ lead: mapLead(data) });
  }

  if (action === "restart") {
    const now = new Date();
    const nextFollowUp = computeNextFollowUp(0, now);
    const { data, error } = await db
      .from("leads")
      .update({
        current_step: 0,
        status: "active",
        last_contacted_at: now.toISOString(),
        next_follow_up_at: nextFollowUp ? nextFollowUp.toISOString() : null,
        completed_at: null,
        created_at: now.toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[admin/leads] restart update error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ lead: mapLead(data) });
  }

  const patch: Record<string, any> = {};
  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    patch.full_name = name || null;
  }
  if (body.note !== undefined) {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    patch.note = note || null;
  }
  if (body.instagram !== undefined || body.instagramHandle !== undefined || body.handle !== undefined) {
    patch.instagram_handle = normalizeHandle(body.instagram || body.instagramHandle || body.handle);
  }
  if (body.whatsapp !== undefined || body.whatsappPhone !== undefined || body.phone !== undefined) {
    patch.phone = normalizePhone(body.whatsapp || body.whatsappPhone || body.phone);
  }
  if (body.nextFollowUpAt !== undefined) {
    const parsed = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    patch.next_follow_up_at = parsed ? parsed.toISOString() : null;
  }
  if (body.status) {
    const status = String(body.status).toLowerCase();
    if (["active", "completed", "dropped"].includes(status)) {
      patch.status = status;
      if (status === "completed") patch.completed_at = new Date().toISOString();
    }
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[admin/leads] generic update error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ lead: mapLead(data) });
}
