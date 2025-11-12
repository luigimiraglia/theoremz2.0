import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;
const CHUNK_SIZE = 500;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseServer();
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "reset") {
      const reset = await resetReadiness(db);
      return NextResponse.json({ ok: true, mode: "reset", ...reset });
    }
    const decay = await decayReadiness(db);
    return NextResponse.json({ ok: true, mode: "decay", ...decay });
  } catch (error: any) {
    console.error("[cron-readiness] failure", error);
    return NextResponse.json(
      { error: "readiness_update_failed", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
}

async function resetReadiness(db: ReturnType<typeof supabaseServer>) {
  const stamp = new Date().toISOString();
  const { data, error } = await db.from("black_students").select("id");
  if (error) throw new Error(`fetch_failed: ${error.message}`);
  if (!data?.length) return { updated: 0 };
  const updates = data.map((row) => ({
    id: row.id,
    readiness: 100,
    updated_at: stamp,
  }));
  await applyChunks(db, updates);
  return { updated: updates.length };
}

async function decayReadiness(db: ReturnType<typeof supabaseServer>) {
  const stamp = new Date().toISOString();
  const { data, error } = await db.from("black_students").select("id, readiness");
  if (error) throw new Error(`fetch_failed: ${error.message}`);
  if (!data?.length) return { processed: 0, decreased: 0 };
  const updates = data
    .map((row) => {
      const current = Number(row.readiness ?? 0);
      if (current <= 0) return null;
      return {
        id: row.id,
        readiness: Math.max(0, current - 1),
        updated_at: stamp,
      };
    })
    .filter(Boolean) as Array<{ id: string; readiness: number; updated_at: string }>;
  if (updates.length) {
    await applyChunks(db, updates);
  }
  return { processed: data.length, decreased: updates.length };
}

async function applyChunks(
  db: ReturnType<typeof supabaseServer>,
  rows: Array<{ id: string; readiness: number; updated_at: string }>,
) {
  const chunks = chunk(rows, CHUNK_SIZE);
  for (const part of chunks) {
    const { error } = await db.from("black_students").upsert(part, { onConflict: "id" });
    if (error) throw new Error(`upsert_failed: ${error.message}`);
  }
}

function chunk<T>(input: T[], size: number): T[][] {
  if (input.length <= size) return [input];
  const parts: T[][] = [];
  for (let i = 0; i < input.length; i += size) {
    parts.push(input.slice(i, i + size));
  }
  return parts;
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
