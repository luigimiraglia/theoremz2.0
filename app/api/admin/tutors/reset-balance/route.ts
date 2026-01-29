import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";
import { resetTutorBalance } from "@/lib/tutor-balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded?.email || !isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (err) {
    console.error("[admin/tutors/reset-balance] auth error", err);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const tutorId = String(body.tutorId || body.id || "").trim();
  if (!tutorId) {
    return NextResponse.json({ error: "tutorId mancante" }, { status: 400 });
  }

  try {
    const result = await resetTutorBalance({ db, tutorId });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[admin/tutors/reset-balance] reset failed", err);
    return NextResponse.json(
      { error: err?.message || "Errore azzeramento saldo" },
      { status: 500 },
    );
  }
}
