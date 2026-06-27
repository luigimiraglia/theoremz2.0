import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { addRomeDays, formatRomeYmd, romeDateToUtc, ROME_TZ } from "@/lib/rome-time";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";

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
    console.error("[admin/ilmetodotheoremz-leads] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function formatTimelineLabel(ymd: string) {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("it-IT", { timeZone: ROME_TZ, weekday: "short", day: "2-digit" });
}

function addContactCount(map: Map<string, number>, iso?: string | null) {
  if (!iso) return;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return;
  const ymd = formatRomeYmd(d);
  if (!map.has(ymd)) return;
  map.set(ymd, (map.get(ymd) || 0) + 1);
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
    phonePrefix: null,
    phone: row.phone || null,
    pageUrl: row.page_url || null,
    note: row.note || null,
    source: row.funnel || row.source || "lead",
    responseStatus: row.response_status || "pending",
    respondedAt: row.responded_at || null,
    noResponseAt: row.no_response_at || null,
    pausedAt: row.paused_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    firstSeenAt,
    lastSeenAt: row.last_seen_at || row.updated_at || null,
    leadAgeDays:
      typeof row.lead_age_days === "number" ? row.lead_age_days : diffDaysFromNow(firstSeenAt),
    heatScore: row.temperature_score ?? null,
    heatLabel: row.temperature_label || null,
  };
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const dailyYmd = formatRomeYmd();
  const startYmd = addRomeDays(dailyYmd, -7);
  const tomorrowYmd = addRomeDays(dailyYmd, 1);
  const endYmd = addRomeDays(dailyYmd, 2);
  const startIso = romeDateToUtc(startYmd).toISOString();
  const endIso = romeDateToUtc(endYmd).toISOString();
  const streakDays = Array.from({ length: 9 }, (_, i) => addRomeDays(startYmd, i)).map((ymd) => ({
    ymd,
    label: formatTimelineLabel(ymd),
    isToday: ymd === dailyYmd,
    isTomorrow: ymd === tomorrowYmd,
  }));
  const streakMap = new Map(streakDays.map((day) => [day.ymd, 0]));

  const { data: metodoRows, error: metodoError } = await db
    .from("leads")
    .select("*")
    .eq("funnel", "ilmetodo")
    .order("created_at", { ascending: false })
    .limit(500);

  if (metodoError) {
    console.error("[admin/ilmetodotheoremz-leads] fetch error", metodoError);
    return NextResponse.json({ error: metodoError.message }, { status: 500 });
  }

  const { data: dailyRows, error: dailyError } = await db
    .from("ranked_leads")
    .select("*")
    .eq("status", "active")
    .in("response_status", ["pending", "no_response"])
    .order("temperature_score", { ascending: false })
    .order("next_follow_up_at", { ascending: true, nullsFirst: false })
    .limit(30);

  if (dailyError) {
    console.error("[admin/ilmetodotheoremz-leads] daily fetch error", dailyError);
    return NextResponse.json({ error: dailyError.message }, { status: 500 });
  }

  const { data: contacts, error: contactsError } = await db
    .from("leads")
    .select("responded_at, no_response_at")
    .or(`responded_at.gte.${startIso},no_response_at.gte.${startIso}`);

  if (contactsError) {
    console.error("[admin/ilmetodotheoremz-leads] streak fetch error", contactsError);
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  (contacts || []).forEach((row: any) => {
    const contactIso = row?.responded_at || row?.no_response_at || null;
    if (contactIso && contactIso < endIso) addContactCount(streakMap, contactIso);
  });

  const streakRows = streakDays.map((day) => ({
    day_ymd: day.ymd,
    count: streakMap.get(day.ymd) || 0,
    updated_at: new Date().toISOString(),
  }));

  const { error: streakErr } = await db
    .from("ilmetodotheoremz_lead_streaks")
    .upsert(streakRows, { onConflict: "day_ymd" });

  if (streakErr) {
    console.error("[admin/ilmetodotheoremz-leads] streak save error", streakErr);
  }

  return NextResponse.json({
    leads: (metodoRows || []).map(mapLead),
    daily: {
      date: dailyYmd,
      leads: (dailyRows || []).map(mapLead),
    },
    streak: {
      days: streakDays.map((day) => ({
        ...day,
        count: streakMap.get(day.ymd) || 0,
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";

  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  if (!["pending", "responded", "no_response", "paused"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, string | null> = {
    response_status: status,
    responded_at: null,
    no_response_at: null,
    paused_at: null,
  };

  if (status === "responded") patch.responded_at = now;
  if (status === "no_response") patch.no_response_at = now;
  if (status === "paused") patch.paused_at = now;

  const db = supabaseServer();
  const { data, error } = await db
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[admin/ilmetodotheoremz-leads] update error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ lead: mapLead(data) });
}
