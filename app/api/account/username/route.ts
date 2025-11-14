// /app/api/account/username/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";

/** Normalizza & valida */
function normalize(u: string) {
  const s = (u || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(s)) return null;
  return s;
}

// GET /api/account/username?u=foobar  -> { available: true/false }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("u") || "";
  const u = normalize(raw);
  if (!u) return NextResponse.json({ available: false, reason: "invalid" });

  const snap = await adminDb.doc(`usernames/${u}`).get();
  return NextResponse.json({ available: !snap.exists });
}

// POST /api/account/username  { username }
export async function POST(req: Request) {
  // Verifica ID token da header Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  const uid = decoded.uid;

  const body = await req.json().catch(() => null);
  const u = normalize(body?.username);
  if (!u)
    return NextResponse.json({ error: "invalid_username" }, { status: 400 });

  const usersRef = adminDb.doc(`users/${uid}`);
  const unameRef = adminDb.doc(`usernames/${u}`);

  try {
    await adminDb.runTransaction(async (tx) => {
      // leggi profilo utente (per vecchio username)
      const userDoc = await tx.get(usersRef);
      const prev = (userDoc.exists ? userDoc.data()?.username : null) as
        | string
        | null;

      // se username già usato da altri -> 409
      const unameDoc = await tx.get(unameRef);
      if (unameDoc.exists && unameDoc.data()?.ownerUid !== uid) {
        throw new Error("conflict");
      }

      // libera il vecchio
      if (prev && prev !== u) {
        const prevRef = adminDb.doc(`usernames/${prev}`);
        const prevDoc = await tx.get(prevRef);
        if (prevDoc.exists && prevDoc.data()?.ownerUid === uid) {
          tx.delete(prevRef);
        }
      }

      // riserva quello nuovo
      tx.set(unameRef, { ownerUid: uid, updatedAt: Date.now() });

      // aggiorna profilo utente nel DB
      tx.set(usersRef, { username: u, updatedAt: Date.now() }, { merge: true });
    });

    // opzionale: aggiorna displayName in Firebase Auth
    try {
      await adminAuth.updateUser(uid, { displayName: u });
    } catch {
      // non blocca l'operazione se fallisce
    }

    try {
      await syncLiteProfilePatch(uid, { nickname: u });
    } catch (err) {
      console.error("[username] lite sync failed", err);
    }

    return NextResponse.json({ ok: true, username: u });
  } catch (e: any) {
    if (e.message === "conflict") {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
