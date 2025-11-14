import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { logStudentAccessLite } from "@/lib/studentLiteSync";

async function getUid(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid as string;
  } catch {
    return null;
  }
}

function resolveIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { sessionId?: string | null }
    | null;
  const sessionId =
    typeof body?.sessionId === "string" && body.sessionId.length
      ? body.sessionId.slice(0, 128)
      : null;

  try {
    await logStudentAccessLite({
      userId: uid,
      sessionId,
      ip: resolveIp(req),
      userAgent: req.headers.get("user-agent"),
    });
  } catch (error) {
    console.error("[access-log] sync failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
