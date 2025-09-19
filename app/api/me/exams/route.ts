import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

async function getUid(req: Request) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  try {
    const d = await adminAuth.verifyIdToken(token);
    return d.uid as string;
  } catch {
    return null;
  }
}

// GET list exams, ordered by date asc
export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const snap = await adminDb
    .collection(`users/${uid}/exams`)
    .orderBy("date")
    .get();
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return NextResponse.json({ items });
}

// POST { date: YYYY-MM-DD, subject?: string|null }
export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : null;
  const subject = typeof body.subject === "string" && body.subject.trim() ? String(body.subject).slice(0, 80) : null;
  if (!date) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const doc = await adminDb.collection(`users/${uid}/exams`).add({
    date,
    subject,
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id: doc.id });
}

