import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

async function getUid(req: Request) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid as string;
  } catch {
    return null;
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ "lesson-id": string }> }
) {
  const uid = await getUid(req);
  if (!uid)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { "lesson-id": lessonId } = await params;

  await adminDb.doc(`users/${uid}/savedLessons/${lessonId}`).delete();
  return NextResponse.json({ ok: true });
}
