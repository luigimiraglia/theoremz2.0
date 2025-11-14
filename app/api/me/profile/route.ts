import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";

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

export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const snap = await adminDb.doc(`users/${uid}`).get();
  const data = snap.exists ? snap.data() : {};
  const profile = {
    cycle: data?.cycle ?? null,
    year: data?.year ?? null,
    indirizzo: data?.indirizzo ?? null,
    goalMin: data?.goalMin ?? 20,
    showBadges: data?.showBadges ?? true,
    username: data?.username ?? null,
  };
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.cycle === "medie" || body.cycle === "liceo" || body.cycle === "altro")
    patch.cycle = body.cycle;
  if (typeof body.year === "number") patch.year = Math.max(1, Math.min(5, body.year));
  if (typeof body.indirizzo === "string") patch.indirizzo = String(body.indirizzo).slice(0, 64);
  if (typeof body.goalMin === "number") patch.goalMin = Math.max(5, Math.min(120, body.goalMin));
  if (typeof body.showBadges === "boolean") patch.showBadges = body.showBadges;
  // avatar non più supportato

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  await adminDb.doc(`users/${uid}`).set({ ...patch, updatedAt: Date.now() }, { merge: true });

  try {
    const userRecord = await adminAuth.getUser(uid);
    await syncLiteProfilePatch(uid, {
      full_name: userRecord?.displayName ?? null,
      email: userRecord?.email ?? null,
      phone: userRecord?.phoneNumber ?? null,
      cycle: (patch.cycle as string | undefined) ?? null,
      indirizzo: (patch.indirizzo as string | undefined) ?? null,
      school_year: (patch.year as number | undefined) ?? undefined,
      goal_grade: (patch.goalMin as number | undefined) ?? undefined,
    });
  } catch (error) {
    console.error("[profile] lite sync failed", error);
  }
  return NextResponse.json({ ok: true });
}
