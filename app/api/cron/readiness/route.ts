import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { decayReadiness, resetReadiness } from "@/lib/black/readiness";

const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;

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
      const reset = await resetReadiness({ db });
      return NextResponse.json({ ok: true, mode: "reset", ...reset });
    }
    const decay = await decayReadiness({ db });
    return NextResponse.json({ ok: true, mode: "decay", ...decay });
  } catch (error: any) {
    console.error("[cron-readiness] failure", error);
    return NextResponse.json(
      { error: "readiness_update_failed", detail: error?.message || String(error) },
      { status: 500 },
    );
  }
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
