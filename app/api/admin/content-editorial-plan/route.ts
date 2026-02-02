import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { formatRomeYmd } from "@/lib/rome-time";

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
    console.error("[admin/content-editorial-plan] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseCount(value: unknown) {
  if (value === null || value === undefined) return null;
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.round(numeric));
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const { data, error } = await db
    .from("content_editorial_plan")
    .select("format, video_count")
    .order("format", { ascending: true });

  if (error) {
    console.error("[admin/content-editorial-plan] fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: (data || []).map((row) => ({
      format: row.format,
      videoCount: row.video_count,
    })),
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const itemsRaw = Array.isArray((body as { items?: unknown }).items)
    ? (body as { items?: unknown[] }).items || []
    : [];

  const deduped = new Map<string, { format: string; video_count: number }>();
  for (const entry of itemsRaw) {
    const format = normalizeText((entry as { format?: unknown }).format);
    const count = parseCount((entry as { videoCount?: unknown }).videoCount);
    if (!format && (entry as { videoCount?: unknown }).videoCount === undefined) continue;
    if (!format || count === null) {
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    }
    deduped.set(format.toLowerCase(), { format, video_count: count });
  }

  const items = Array.from(deduped.values()).filter((item) => item.video_count >= 0);

  const db = supabaseServer();
  if (items.length) {
    const { data: formats, error: formatError } = await db
      .from("content_short_video_formats")
      .select("name")
      .in(
        "name",
        items.map((item) => item.format)
      );
    if (formatError) {
      console.error("[admin/content-editorial-plan] format check error", formatError);
      return NextResponse.json({ error: "format_check_failed" }, { status: 500 });
    }
    const existing = new Set((formats || []).map((row) => row.name));
    const missing = items.filter((item) => !existing.has(item.format));
    if (missing.length) {
      return NextResponse.json(
        { error: "invalid_format", details: missing.map((item) => item.format).join(", ") },
        { status: 400 }
      );
    }
  }

  const { error: deleteError } = await db
    .from("content_editorial_plan")
    .delete()
    .neq("format", "");

  if (deleteError) {
    console.error("[admin/content-editorial-plan] delete error", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (items.length) {
    const { error: insertError } = await db.from("content_editorial_plan").insert(
      items.map((item) => ({
        format: item.format,
        video_count: item.video_count,
      }))
    );
    if (insertError) {
      console.error("[admin/content-editorial-plan] insert error", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const todayYmd = formatRomeYmd();
  const { data: settings } = await db
    .from("content_editorial_settings")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (settings?.id) {
    await db
      .from("content_editorial_settings")
      .update({ tracking_start_date: todayYmd })
      .eq("id", settings.id);
  } else {
    await db
      .from("content_editorial_settings")
      .insert({ tracking_start_date: todayYmd });
  }

  return NextResponse.json({
    ok: true,
    items: items.map((item) => ({
      format: item.format,
      videoCount: item.video_count,
    })),
  });
}
