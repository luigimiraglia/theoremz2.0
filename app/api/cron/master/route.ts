import { NextResponse } from "next/server";

const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;
const FOLLOWUP_SECRET = process.env.WHATSAPP_FOLLOWUP_SECRET || "";
const VERCEL_URL = process.env.VERCEL_URL || "";

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

  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const results: Record<string, any> = {};

  // WhatsApp followup every run
  results.followup = await callFollowup();

  // Digest once in the 18:00 UTC window
  if (hour === 18 && minute < 15) {
    results.digest = await callInternal("/api/telegram/digest");
  }

  // Stripe sync once in the 00:00 UTC window
  if (hour === 0 && minute < 15) {
    results.sync = await callInternal("/api/cron/sync-black-subscriptions");
  }

  return NextResponse.json({ ok: true, results });
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

async function callFollowup() {
  if (!FOLLOWUP_SECRET) return { skipped: "missing_followup_secret" };
  return callInternal(`/api/whatsapp-cloud/followup?secret=${encodeURIComponent(FOLLOWUP_SECRET)}`);
}

async function callInternal(path: string) {
  const url = VERCEL_URL ? `https://${VERCEL_URL}${path}` : path;
  try {
    const res = await fetch(url, { method: "POST" });
    const data = await res.json().catch(() => null);
    return { status: res.status, body: data };
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}
