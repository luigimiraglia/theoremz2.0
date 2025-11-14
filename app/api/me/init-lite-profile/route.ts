import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";

async function getUidAndClaims(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const claims = await getUidAndClaims(req);
  if (!claims?.uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { fullName?: string | null }
    | null;

  const derivedName =
    claims.firebase?.sign_in_provider === "password" && claims.email
      ? claims.email.split("@")[0]
      : null;
  const fullName = body?.fullName || claims.name || derivedName || null;

  try {
    await syncLiteProfilePatch(claims.uid, {
      full_name: fullName ?? null,
      email: claims.email ?? null,
      is_black: false,
    });
  } catch (error) {
    console.error("[init-lite-profile] sync failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
