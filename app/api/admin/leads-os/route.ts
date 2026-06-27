import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const REPORT_TIME_ZONE = "Europe/Rome";

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
    const decoded = await adminAuth.verifyIdToken(authHeader.slice("Bearer ".length));
    if (!isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("[admin/leads-os] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function ymdInReportTimeZone(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return ymd(date);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function diffDaysFromNow(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function mapLead(row: any) {
  const firstSeenAt = row.first_seen_at || row.created_at || null;
  return {
    id: row.id,
    fullName: row.full_name || null,
    email: row.email || null,
    phone: row.phone || null,
    instagramHandle: row.instagram_handle || null,
    channel: row.channel || "unknown",
    source: row.source || null,
    funnel: row.funnel || null,
    status: row.status || "active",
    responseStatus: row.response_status || "pending",
    temperatureScore: row.temperature_score ?? null,
    temperatureLabel: row.temperature_label || null,
    heatReasons: Array.isArray(row.heat_reasons) ? row.heat_reasons : [],
    currentStep: typeof row.current_step === "number" ? row.current_step : 0,
    nextFollowUpAt: row.next_follow_up_at || null,
    lastContactedAt: row.last_contacted_at || null,
    respondedAt: row.responded_at || null,
    noResponseAt: row.no_response_at || null,
    pausedAt: row.paused_at || null,
    completedAt: row.completed_at || null,
    firstSeenAt,
    lastSeenAt: row.last_seen_at || row.updated_at || null,
    leadAgeDays:
      typeof row.lead_age_days === "number" ? row.lead_age_days : diffDaysFromNow(firstSeenAt),
    note: row.note || null,
    pageUrl: row.page_url || null,
    studentId: row.student_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function countRowsBetweenDateKeys(rows: any[], startKey: string, endKey: string) {
  return rows.filter((row) => {
    const raw = row.first_seen_at || row.created_at;
    if (!raw) return false;
    const key = ymdInReportTimeZone(raw);
    return key >= startKey && key < endKey;
  }).length;
}

function buildDailySeries(rows: any[], days: number) {
  const todayKey = ymdInReportTimeZone(new Date());
  const startKey = addDaysToDateKey(todayKey, -(days - 1));
  const buckets = new Map<string, { date: string; total: number; hot: number; warm: number; cold: number }>();
  for (let i = 0; i < days; i += 1) {
    const date = addDaysToDateKey(startKey, i);
    buckets.set(date, { date, total: 0, hot: 0, warm: 0, cold: 0 });
  }

  for (const row of rows) {
    const raw = row.first_seen_at || row.created_at;
    if (!raw) continue;
    const key = ymdInReportTimeZone(raw);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (row.temperature_label === "hot") bucket.hot += 1;
    else if (row.temperature_label === "warm") bucket.warm += 1;
    else bucket.cold += 1;
  }

  return Array.from(buckets.values());
}

function applyTextFilter(rows: any[], q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return rows;
  const digits = query.replace(/\D/g, "");
  return rows.filter((row) => {
    const haystack = [
      row.full_name,
      row.email,
      row.phone,
      row.instagram_handle,
      row.source,
      row.funnel,
      row.note,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const phoneDigits = String(row.phone || "").replace(/\D/g, "");
    return haystack.includes(query) || Boolean(digits && phoneDigits.includes(digits));
  });
}

function uniqueSorted(rows: any[], key: string) {
  return Array.from(new Set(rows.map((row) => row?.[key]).filter(Boolean))).sort();
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const source = searchParams.get("source") || "all";
  const funnel = searchParams.get("funnel") || "all";
  const status = searchParams.get("status") || "active";
  const responseStatus = searchParams.get("responseStatus") || "all";
  const temperature = searchParams.get("temperature") || "all";
  const queue = searchParams.get("queue") || "due";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const days = Math.max(7, Math.min(90, Number(searchParams.get("days") || 30)));
  const limit = Math.max(20, Math.min(500, Number(searchParams.get("limit") || 160)));

  const chartStart = addDays(startOfUtcDay(new Date()), -(days * 2 - 1));
  const { data: allRows, error: allErr } = await db
    .from("leads")
    .select("*")
    .gte("first_seen_at", chartStart.toISOString())
    .order("first_seen_at", { ascending: false })
    .limit(5000);

  if (allErr) {
    console.error("[admin/leads-os] analytics fetch error", allErr);
    return NextResponse.json({ error: allErr.message }, { status: 500 });
  }

  const { data: filterRows, error: filterErr } = await db
    .from("leads")
    .select("source,funnel,status,response_status,temperature_label")
    .limit(10000);

  if (filterErr) {
    console.error("[admin/leads-os] filter fetch error", filterErr);
    return NextResponse.json({ error: filterErr.message }, { status: 500 });
  }

  let query = db.from("leads").select("*");
  if (source !== "all") query = query.eq("source", source);
  if (funnel !== "all") query = query.eq("funnel", funnel);
  if (status !== "all") query = query.eq("status", status);
  if (responseStatus !== "all") query = query.eq("response_status", responseStatus);
  else query = query.neq("response_status", "paused");
  if (temperature !== "all") query = query.eq("temperature_label", temperature);
  if (queue === "due") {
    query = query.or(`next_follow_up_at.is.null,next_follow_up_at.lte.${new Date().toISOString()}`);
  } else if (queue === "scheduled") {
    query = query.gt("next_follow_up_at", new Date().toISOString());
  }
  if (dateFrom) query = query.gte("first_seen_at", new Date(`${dateFrom}T00:00:00.000Z`).toISOString());
  if (dateTo) query = query.lt("first_seen_at", addDays(new Date(`${dateTo}T00:00:00.000Z`), 1).toISOString());

  const { data: filteredRowsRaw, error: filteredErr } = await query
    .order("temperature_score", { ascending: false })
    .order("next_follow_up_at", { ascending: true, nullsFirst: false })
    .order("first_seen_at", { ascending: false })
    .limit(800);

  if (filteredErr) {
    console.error("[admin/leads-os] list fetch error", filteredErr);
    return NextResponse.json({ error: filteredErr.message }, { status: 500 });
  }

  const filteredRows = applyTextFilter(filteredRowsRaw || [], q).slice(0, limit);
  const todayKey = ymdInReportTimeZone(new Date());
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  const last7StartKey = addDaysToDateKey(todayKey, -6);
  const previous7StartKey = addDaysToDateKey(todayKey, -13);
  const previous7EndKey = addDaysToDateKey(todayKey, -6);
  const todayCount = countRowsBetweenDateKeys(allRows || [], todayKey, tomorrowKey);
  const yesterdayCount = countRowsBetweenDateKeys(allRows || [], yesterdayKey, todayKey);
  const last7 = countRowsBetweenDateKeys(allRows || [], last7StartKey, tomorrowKey);
  const previous7 = countRowsBetweenDateKeys(allRows || [], previous7StartKey, previous7EndKey);
  const delta = todayCount - yesterdayCount;
  const deltaPct = yesterdayCount > 0 ? Math.round((delta / yesterdayCount) * 100) : todayCount > 0 ? 100 : 0;
  const weekDelta = last7 - previous7;
  const weekDeltaPct = previous7 > 0 ? Math.round((weekDelta / previous7) * 100) : last7 > 0 ? 100 : 0;

  return NextResponse.json({
    filters: {
      sources: uniqueSorted(filterRows || [], "source"),
      funnels: uniqueSorted(filterRows || [], "funnel"),
    },
    kpis: {
      today: todayCount,
      yesterday: yesterdayCount,
      delta,
      deltaPct,
      last7,
      previous7,
      weekDelta,
      weekDeltaPct,
      active: (filterRows || []).filter(
        (row) => row.status === "active" && row.response_status !== "paused",
      ).length,
      hot: (filterRows || []).filter(
        (row) => row.temperature_label === "hot" && row.response_status !== "paused",
      ).length,
    },
    chart: buildDailySeries(allRows || [], days),
    leads: filteredRows.map(mapLead),
    totalFiltered: filteredRows.length,
  });
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
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  if (action === "delete") {
    const { data, error } = await db
      .from("leads")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ deleted: true, id });
  }

  const now = new Date();
  const patch: Record<string, any> = {};
  const loadNextStep = async () => {
    const { data: existing, error: fetchErr } = await db
      .from("leads")
      .select("current_step")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return null;
    return Number(existing.current_step || 0) + 1;
  };

  if (action === "contacted") {
    const nextStep = await loadNextStep().catch((error) => {
      console.error("[admin/leads-os] current step fetch error", error);
      return "error";
    });
    if (nextStep === "error") return NextResponse.json({ error: "current_step_fetch_failed" }, { status: 500 });
    if (nextStep === null) return NextResponse.json({ error: "not_found" }, { status: 404 });
    patch.current_step = nextStep;
    patch.last_contacted_at = now.toISOString();
    patch.next_follow_up_at = now.toISOString();
    patch.status = "active";
  } else if (action === "no_answer") {
    const nextStep = await loadNextStep().catch((error) => {
      console.error("[admin/leads-os] current step fetch error", error);
      return "error";
    });
    if (nextStep === "error") return NextResponse.json({ error: "current_step_fetch_failed" }, { status: 500 });
    if (nextStep === null) return NextResponse.json({ error: "not_found" }, { status: 404 });
    patch.current_step = nextStep;
    patch.response_status = "no_response";
    patch.last_contacted_at = now.toISOString();
    patch.no_response_at = now.toISOString();
    patch.responded_at = null;
    patch.paused_at = null;
    patch.next_follow_up_at = addDays(now, 1).toISOString();
    patch.status = "active";
  } else if (action === "not_closed") {
    const nextStep = await loadNextStep().catch((error) => {
      console.error("[admin/leads-os] current step fetch error", error);
      return "error";
    });
    if (nextStep === "error") return NextResponse.json({ error: "current_step_fetch_failed" }, { status: 500 });
    if (nextStep === null) return NextResponse.json({ error: "not_found" }, { status: 404 });
    patch.current_step = nextStep;
    patch.response_status = "responded";
    patch.last_contacted_at = now.toISOString();
    patch.responded_at = now.toISOString();
    patch.no_response_at = null;
    patch.paused_at = null;
    patch.next_follow_up_at = addDays(now, 7).toISOString();
    patch.status = "active";
  } else if (action === "schedule_sales_call") {
    const nextStep = await loadNextStep().catch((error) => {
      console.error("[admin/leads-os] current step fetch error", error);
      return "error";
    });
    if (nextStep === "error") return NextResponse.json({ error: "current_step_fetch_failed" }, { status: 500 });
    if (nextStep === null) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const rawFollowUp = typeof body.nextFollowUpAt === "string" ? body.nextFollowUpAt.trim() : "";
    const followUp = rawFollowUp ? new Date(rawFollowUp) : null;
    if (!followUp || Number.isNaN(followUp.getTime())) {
      return NextResponse.json({ error: "invalid_next_follow_up_at" }, { status: 400 });
    }
    patch.current_step = nextStep;
    patch.response_status = "responded";
    patch.last_contacted_at = now.toISOString();
    patch.responded_at = now.toISOString();
    patch.no_response_at = null;
    patch.paused_at = null;
    patch.next_follow_up_at = followUp.toISOString();
    patch.status = "active";
  } else if (action === "responded") {
    patch.response_status = "responded";
    patch.responded_at = now.toISOString();
    patch.no_response_at = null;
    patch.paused_at = null;
  } else if (action === "no_response") {
    patch.response_status = "no_response";
    patch.no_response_at = now.toISOString();
    patch.responded_at = null;
    patch.paused_at = null;
  } else if (action === "pause") {
    patch.response_status = "paused";
    patch.paused_at = now.toISOString();
  } else if (action === "resume") {
    patch.response_status = "pending";
    patch.paused_at = null;
    patch.status = "active";
  } else if (action === "complete") {
    patch.status = "completed";
    patch.completed_at = now.toISOString();
  } else if (action === "drop") {
    patch.status = "dropped";
  } else {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const { data, error } = await db
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ lead: mapLead(data) });
}
