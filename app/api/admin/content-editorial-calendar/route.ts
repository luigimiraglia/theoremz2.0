import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { addRomeDays, formatRomeYmd, romeDateToUtc } from "@/lib/rome-time";

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
    console.error("[admin/content-editorial-calendar] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function parseYmd(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function buildDateRange(start: string, end: string) {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addRomeDays(cursor, 1);
    if (days.length > 370) break;
  }
  return days;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const start = parseYmd(searchParams.get("start"));
  const end = parseYmd(searchParams.get("end"));
  if (!start || !end) {
    return NextResponse.json({ error: "missing_range" }, { status: 400 });
  }

  const todayYmd = formatRomeYmd();
  const db = supabaseServer();

  const { data: settings } = await db
    .from("content_editorial_settings")
    .select("id, tracking_start_date")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let trackingStart = settings?.tracking_start_date as string | null;
  if (!trackingStart) {
    const { data: inserted, error: insertErr } = await db
      .from("content_editorial_settings")
      .insert({ tracking_start_date: todayYmd })
      .select("tracking_start_date")
      .single();
    if (insertErr) {
      console.error("[admin/content-editorial-calendar] settings insert error", insertErr);
      return NextResponse.json({ error: "settings_insert_failed" }, { status: 500 });
    }
    trackingStart = inserted?.tracking_start_date || todayYmd;
  }

  const { data: planRows, error: planErr } = await db
    .from("content_editorial_plan")
    .select("format, video_count");

  if (planErr) {
    console.error("[admin/content-editorial-calendar] plan fetch error", planErr);
    return NextResponse.json({ error: planErr.message }, { status: 500 });
  }

  const planRequirements = new Map<string, number>();
  for (const row of planRows || []) {
    const format = String(row.format || "").trim().toLowerCase();
    const count = Number(row.video_count);
    if (!format || !Number.isFinite(count)) continue;
    const rounded = Math.max(0, Math.round(count));
    if (rounded > 0) planRequirements.set(format, rounded);
  }

  const { data: registryRows, error: registryErr } = await db
    .from("content_editorial_day_registry")
    .select("day_date, status, total_published")
    .gte("day_date", start)
    .lte("day_date", end);

  if (registryErr) {
    console.error("[admin/content-editorial-calendar] registry fetch error", registryErr);
    return NextResponse.json({ error: registryErr.message }, { status: 500 });
  }

  const registryMap = new Map<
    string,
    { status: string; totalPublished: number }
  >();
  for (const row of registryRows || []) {
    registryMap.set(String(row.day_date), {
      status: String(row.status || ""),
      totalPublished: Number(row.total_published || 0),
    });
  }

  const startUtc = romeDateToUtc(start);
  const endUtc = romeDateToUtc(addRomeDays(end, 1));
  const { data: publishedRows, error: publishedErr } = await db
    .from("content_short_videos")
    .select("published_at, format")
    .eq("status", "pubblicato")
    .gte("published_at", startUtc.toISOString())
    .lt("published_at", endUtc.toISOString());

  if (publishedErr) {
    console.error("[admin/content-editorial-calendar] published fetch error", publishedErr);
    return NextResponse.json({ error: publishedErr.message }, { status: 500 });
  }

  const publishedByDay = new Map<
    string,
    { total: number; byFormat: Map<string, number> }
  >();
  for (const row of publishedRows || []) {
    const iso = row.published_at as string | null;
    if (!iso) continue;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    const ymd = formatRomeYmd(date);
    const entry =
      publishedByDay.get(ymd) || { total: 0, byFormat: new Map<string, number>() };
    entry.total += 1;
    const format = String(row.format || "").trim();
    if (format) {
      const key = format.toLowerCase();
      entry.byFormat.set(key, (entry.byFormat.get(key) || 0) + 1);
    }
    publishedByDay.set(ymd, entry);
  }

  const statuses: Array<{ date: string; status: string }> = [];
  const toInsert: Array<{ day_date: string; status: string; total_published: number }> = [];
  const days = buildDateRange(start, end);
  for (const day of days) {
    const registry = registryMap.get(day);
    if (registry) {
      statuses.push({ date: day, status: registry.status });
      continue;
    }
    if (day < (trackingStart || todayYmd)) {
      statuses.push({ date: day, status: "inactive" });
      continue;
    }
    if (day > todayYmd) {
      statuses.push({ date: day, status: "future" });
      continue;
    }
    const entry = publishedByDay.get(day);
    const total = entry?.total ?? 0;
    let scheduleMet = false;
    if (planRequirements.size > 0 && entry) {
      scheduleMet = true;
      for (const [format, required] of planRequirements) {
        if ((entry.byFormat.get(format) || 0) < required) {
          scheduleMet = false;
          break;
        }
      }
    }
    let status = "missed";
    if (scheduleMet) {
      status = "met";
    } else if (total > 0) {
      status = "partial";
    } else if (day === todayYmd) {
      status = "future";
    } else {
      status = "missed";
    }
    statuses.push({ date: day, status });
    if (day < todayYmd) {
      toInsert.push({ day_date: day, status, total_published: total });
    }
  }

  if (toInsert.length) {
    const { error: insertErr } = await db
      .from("content_editorial_day_registry")
      .insert(toInsert);
    if (insertErr) {
      console.error("[admin/content-editorial-calendar] registry insert error", insertErr);
    }
  }

  return NextResponse.json({
    trackingStart: trackingStart || todayYmd,
    statuses,
  });
}
