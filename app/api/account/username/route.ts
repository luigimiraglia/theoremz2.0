// /app/api/account/username/route.ts
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
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

  const db = supabaseServer();
  const { data, error } = await db
    .from("usernames")
    .select("username")
    .eq("username", u)
    .maybeSingle();

  if (error) {
    console.error("[username] availability check failed", error);
    return NextResponse.json({ available: false, reason: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ available: !data });
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

  const db = supabaseServer();

  try {
    const { data: taken, error: takenError } = await db
      .from("usernames")
      .select("owner_auth_uid")
      .eq("username", u)
      .maybeSingle();

    if (takenError) throw takenError;
    if (taken && taken.owner_auth_uid !== uid) {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }

    const { data: current, error: currentError } = await db
      .from("usernames")
      .select("username")
      .eq("owner_auth_uid", uid)
      .maybeSingle();

    if (currentError) throw currentError;

    const now = new Date().toISOString();
    if (current) {
      if (current.username !== u) {
        const { error } = await db
          .from("usernames")
          .update({ username: u, updated_at: now })
          .eq("owner_auth_uid", uid);
        if (error) throw error;
      }
    } else {
      const { error } = await db.from("usernames").insert({
        username: u,
        owner_auth_uid: uid,
        updated_at: now,
      });
      if (error) throw error;
    }

    await syncLiteProfilePatch(uid, { nickname: u });

    // opzionale: aggiorna displayName in Firebase Auth
    try {
      await adminAuth.updateUser(uid, { displayName: u });
    } catch {
      // non blocca l'operazione se fallisce
    }

    return NextResponse.json({ ok: true, username: u });
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    console.error("[username] update failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
