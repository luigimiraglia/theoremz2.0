import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

// helper: verifica Bearer token
async function getUidFromRequest(req: Request) {
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

// GET → lista
export async function GET(req: Request) {
  const uid = await getUidFromRequest(req);
  if (!uid)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 50);
  const snap = await adminDb
    .collection(`users/${uid}/savedLessons`)
    .orderBy("savedAt", "desc")
    .limit(Math.min(limit, 200))
    .get();

  const items = snap.docs.map((d) => d.data());
  return NextResponse.json({ items });
}

// POST → salva/aggiorna
// body: { lessonId, slug, title, thumb? }
export async function POST(req: Request) {
  const uid = await getUidFromRequest(req);
  if (!uid)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { lessonId, slug, title, thumb } = body || {};
  if (!lessonId || !slug || !title) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const ref = adminDb.doc(`users/${uid}/savedLessons/${lessonId}`);
  await ref.set(
    {
      lessonId,
      slug,
      title,
      thumb: thumb ?? null,
      savedAt: Date.now(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
