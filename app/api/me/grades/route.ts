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

// GET /api/me/grades?subject=matematica|fisica
export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const subject = u.searchParams.get("subject");

  let q = adminDb.collection(`users/${uid}/grades`).orderBy("date");
  if (subject === "matematica" || subject === "fisica") {
    q = q.where("subject", "==", subject);
  }

  const snap = await q.get();
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return NextResponse.json({ items });
}

// POST { date: YYYY-MM-DD, subject: matematica|fisica, grade: number }
export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : null;
  const subject = body.subject === "matematica" || body.subject === "fisica" ? body.subject : null;
  const grade = Number(body.grade);

  if (!date || !subject || !Number.isFinite(grade)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const doc = await adminDb.collection(`users/${uid}/grades`).add({
    date,
    subject,
    grade: Math.max(0, Math.min(10, grade)),
    createdAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id: doc.id });
}

