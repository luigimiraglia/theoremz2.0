import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

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
    console.error("[admin/content-formats] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const { data, error } = await db
    .from("content_short_video_formats")
    .select("name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/content-formats] fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    formats: (data || []).map((row) => row.name).filter(Boolean),
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

  const name = normalizeText((body as { name?: unknown }).name);
  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }

  const db = supabaseServer();
  const { data: existing, error: existingError } = await db
    .from("content_short_video_formats")
    .select("name")
    .ilike("name", name)
    .maybeSingle();

  if (existingError) {
    console.error("[admin/content-formats] lookup error", existingError);
    return NextResponse.json({ error: "format_lookup_failed" }, { status: 500 });
  }

  if (existing?.name) {
    return NextResponse.json({ format: existing.name });
  }

  const { data, error } = await db
    .from("content_short_video_formats")
    .insert({ name })
    .select("name")
    .single();

  if (error) {
    console.error("[admin/content-formats] insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ format: data?.name || name });
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const name = normalizeText((body as { name?: unknown }).name);
  if (!name) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }

  const db = supabaseServer();
  const { count, error: countError } = await db
    .from("content_short_videos")
    .select("id", { count: "exact", head: true })
    .ilike("format", name);

  if (countError) {
    console.error("[admin/content-formats] usage check error", countError);
    return NextResponse.json({ error: "format_usage_check_failed" }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "format_in_use" }, { status: 409 });
  }

  const { error } = await db
    .from("content_short_video_formats")
    .delete()
    .eq("name", name);

  if (error) {
    console.error("[admin/content-formats] delete error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
