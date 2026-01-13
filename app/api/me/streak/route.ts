import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { formatRomeYmd, romeDateToUtc } from "@/lib/rome-time";

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

function isoDay(d = new Date()) {
  return formatRomeYmd(d);
}
function daysBetweenISO(a: string, b: string) {
  const da = romeDateToUtc(a).getTime();
  const db = romeDateToUtc(b).getTime();
  return Math.round((db - da) / 86400000);
}

export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ref = adminDb.doc(`users/${uid}/meta/streak`);
  const snap = await ref.get();
  const data = snap.exists ? snap.data()! : { lastDate: null, count: 0 };
  return NextResponse.json({ lastDate: data.lastDate ?? null, count: data.count ?? 0 });
}

// POST → tick giornaliero
export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ref = adminDb.doc(`users/${uid}/meta/streak`);
  const today = isoDay();
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() as any) : { lastDate: null, count: 0 };
    let count = 1;
    if (prev.lastDate === today) {
      count = prev.count || 1;
    } else if (prev.lastDate) {
      const gap = daysBetweenISO(prev.lastDate, today);
      count = gap === 1 ? (prev.count || 0) + 1 : 1;
    }
    tx.set(ref, { lastDate: today, count, updatedAt: Date.now() });
  });

  const doc = await ref.get();
  const data = doc.data() as any;
  return NextResponse.json({ ok: true, lastDate: data.lastDate, count: data.count });
}
