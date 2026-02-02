import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
type ShortVideoStatus = "bozza" | "girato" | "editato" | "pubblicato";

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
    console.error("[admin/content-production] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeHookList(value: unknown) {
  if (value === null || value === undefined) return null;
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("\n")
      : [];
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of source) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }
  return cleaned;
}

function parseStatus(value: unknown): ShortVideoStatus | null {
  if (value === "bozza" || value === "girato" || value === "editato" || value === "pubblicato") return value;
  if (value === "draft") return "bozza";
  if (value === "completed") return "pubblicato";
  return null;
}

function mapStatus(value: unknown): ShortVideoStatus {
  return parseStatus(value) ?? "bozza";
}

function parseInteger(value: unknown) {
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

function normalizeTimestamp(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function formatExists(db: ReturnType<typeof supabaseServer>, value: string) {
  const { data, error } = await db
    .from("content_short_video_formats")
    .select("name")
    .eq("name", value)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function mapVideo(row: any) {
  if (!row) return null;
  return {
    id: row.id as string,
    title: row.title || null,
    script: row.script || null,
    views: typeof row.views === "number" ? row.views : row.views ?? null,
    publishedAt: row.published_at || null,
    hook: row.hook || null,
    altHooks: Array.isArray(row.alt_hooks) ? row.alt_hooks : [],
    format: row.format || null,
    editedFileName: row.edited_file_name || null,
    durationSec: typeof row.duration_sec === "number" ? row.duration_sec : row.duration_sec ?? null,
    status: mapStatus(row.status),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") || 500);
  const limit = Math.max(1, Math.min(1000, limitRaw));

  const db = supabaseServer();
  const { data, error } = await db
    .from("content_short_videos")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin/content-production] fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    videos: (data || []).map(mapVideo).filter(Boolean),
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

  const script = normalizeText(body.script);
  const hook = normalizeText(body.hook);
  const altHooks = normalizeHookList(body.altHooks);
  const format = normalizeText(body.format);
  const title = normalizeText(body.title);
  const editedFileName = normalizeText(body.editedFileName);
  if (!title || !script || !hook || !format) {
    return NextResponse.json(
      { error: "missing_required_fields", details: "title/script/hook/format" },
      { status: 400 }
    );
  }
  if (title.toLowerCase() === hook.toLowerCase()) {
    return NextResponse.json(
      { error: "invalid_title", details: "title_equals_hook" },
      { status: 400 }
    );
  }

  const parsedStatus = parseStatus(body.status);
  if ("status" in body && !parsedStatus) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  const status = parsedStatus ?? "bozza";
  const durationSec = parseInteger(body.durationSec);
  const views = parseInteger(body.views);
  if (status === "pubblicato" && (durationSec === null || views === null)) {
    return NextResponse.json(
      { error: "missing_publish_fields", details: "durationSec/views" },
      { status: 400 }
    );
  }
  const db = supabaseServer();
  try {
    const exists = await formatExists(db, format);
    if (!exists) {
      return NextResponse.json({ error: "invalid_format" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[admin/content-production] format check error", error);
    return NextResponse.json({ error: "format_check_failed" }, { status: 500 });
  }

  const payload = {
    title,
    script,
    hook,
    alt_hooks: altHooks ?? [],
    format,
    edited_file_name: editedFileName,
    duration_sec: durationSec,
    views,
    published_at:
      status === "pubblicato"
        ? normalizeTimestamp(body.publishedAt) || new Date().toISOString()
        : null,
    status,
  };

  const { data, error } = await db
    .from("content_short_videos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[admin/content-production] insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ video: mapVideo(data) });
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const payload: Record<string, any> = {};
  if ("script" in body) {
    const script = normalizeText(body.script);
    if (!script) {
      return NextResponse.json({ error: "missing_script" }, { status: 400 });
    }
    payload.script = script;
  }
  if ("title" in body) {
    const title = normalizeText(body.title);
    if (!title) {
      return NextResponse.json({ error: "missing_title" }, { status: 400 });
    }
    payload.title = title;
  }
  if ("hook" in body) {
    const hook = normalizeText(body.hook);
    if (!hook) {
      return NextResponse.json({ error: "missing_hook" }, { status: 400 });
    }
    payload.hook = hook;
  }
  if ("altHooks" in body) {
    payload.alt_hooks = normalizeHookList(body.altHooks) ?? [];
  }
  if ("format" in body) {
    const format = normalizeText(body.format);
    if (!format) {
      return NextResponse.json({ error: "missing_format" }, { status: 400 });
    }
    payload.format = format;
  }
  if ("editedFileName" in body) {
    payload.edited_file_name = normalizeText(body.editedFileName);
  }
  if ("durationSec" in body) payload.duration_sec = parseInteger(body.durationSec);
  if ("views" in body) payload.views = parseInteger(body.views);
  if ("publishedAt" in body) payload.published_at = normalizeTimestamp(body.publishedAt);
  if ("status" in body) {
    const status = parseStatus(body.status);
    if (!status) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    payload.status = status;
  }

  if (payload.title && payload.hook) {
    if (payload.title.toLowerCase() === payload.hook.toLowerCase()) {
      return NextResponse.json(
        { error: "invalid_title", details: "title_equals_hook" },
        { status: 400 }
      );
    }
  }

  if (payload.status === "pubblicato") {
    if (payload.duration_sec === null || payload.duration_sec === undefined) {
      return NextResponse.json(
        { error: "missing_publish_fields", details: "durationSec" },
        { status: 400 }
      );
    }
    if (payload.views === null || payload.views === undefined) {
      return NextResponse.json(
        { error: "missing_publish_fields", details: "views" },
        { status: 400 }
      );
    }
    if (!("published_at" in payload) || !payload.published_at) {
      return NextResponse.json(
        { error: "missing_publish_fields", details: "publishedAt" },
        { status: 400 }
      );
    }
  }

  if (!Object.keys(payload).length) {
    return NextResponse.json({ error: "missing_update" }, { status: 400 });
  }

  const db = supabaseServer();
  if (payload.format) {
    try {
      const exists = await formatExists(db, payload.format);
      if (!exists) {
        return NextResponse.json({ error: "invalid_format" }, { status: 400 });
      }
    } catch (error: any) {
      console.error("[admin/content-production] format check error", error);
      return NextResponse.json({ error: "format_check_failed" }, { status: 500 });
    }
  }
  const { data, error } = await db
    .from("content_short_videos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[admin/content-production] update error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ video: mapVideo(data) });
}
