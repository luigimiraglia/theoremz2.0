import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { upsertSavedLessonLite } from "@/lib/studentLiteSync";

async function verifyToken(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const claims = await verifyToken(request);
  if (!claims?.uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let slug: string;
  try {
    const body = await request.json();
    slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    await upsertSavedLessonLite({ userId: claims.uid, slug, status: "viewed" });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[track-lesson] upsert failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
