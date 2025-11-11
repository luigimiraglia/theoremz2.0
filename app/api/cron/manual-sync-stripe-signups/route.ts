import { NextResponse } from "next/server";
import { syncPendingStripeSignups } from "@/lib/black/manualStripeSync";

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

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const sinceParam = url.searchParams.get("since");

  try {
    const result = await syncPendingStripeSignups({
      limit: Number.isFinite(limitParam) ? limitParam : undefined,
      since: sinceParam || undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[manual-sync-route] failed", error);
    return NextResponse.json({ error: error?.message || "sync_failed" }, { status: 500 });
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
