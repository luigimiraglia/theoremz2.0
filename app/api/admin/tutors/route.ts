import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function getViewer(request: Request) {
  if (process.env.NODE_ENV === "development") {
    return { isAdmin: true, email: null };
  }
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase() || null;
    if (!email || !isAdminEmail(email)) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    return { isAdmin: true, email };
  } catch (err) {
    console.error("[admin/tutors] auth error", err);
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
}

export async function GET(request: Request) {
  const auth = await getViewer(request);
  if ("error" in auth) return auth.error;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  const { data, error } = await db
    .from("tutors")
    .select("id, display_name, full_name, email, phone, notes, hours_due")
    .order("display_name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tutors = (data || []).map((t: any) => ({
    ...t,
    display_name: t.display_name || t.full_name || t.email || "Tutor",
  }));
  return NextResponse.json({ tutors });
}

export async function POST(request: Request) {
  const auth = await getViewer(request);
  if ("error" in auth) return auth.error;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.displayName || body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!name) {
    return NextResponse.json({ error: "displayName obbligatorio" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email obbligatoria per collegare l'account tutor" }, { status: 400 });
  }
  const payload: Record<string, any> = {
    display_name: name || email,
    full_name: name || email,
    email: email || null,
  };
  if (body.phone) payload.phone = String(body.phone).trim();
  if (body.notes || body.bio) payload.notes = String(body.notes || body.bio).trim();
  const { data, error } = await db
    .from("tutors")
    .insert(payload)
    .select("id, display_name, full_name, email, phone, notes, hours_due")
    .limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tutor = data?.[0]
    ? { ...data[0], display_name: data[0].display_name || data[0].full_name || data[0].email || "Tutor" }
    : null;
  return NextResponse.json({ tutor });
}

export async function PATCH(request: Request) {
  const auth = await getViewer(request);
  if ("error" in auth) return auth.error;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const displayName = String(body.displayName || "").trim();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const notes = String(body.notes || body.bio || "").trim();
  if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

  const patch: Record<string, any> = {};
  if (displayName) patch.display_name = displayName;
  if (fullName) patch.full_name = fullName;
  if (email) patch.email = email;
  patch.phone = phone || null;
  patch.notes = notes || null;
  patch.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("tutors")
    .update(patch)
    .eq("id", id)
    .select("id, display_name, full_name, email, phone, notes, hours_due")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tutor = data
    ? { ...data, display_name: data.display_name || data.full_name || data.email || "Tutor" }
    : null;
  return NextResponse.json({ tutor });
}

export async function DELETE(request: Request) {
  const auth = await getViewer(request);
  if ("error" in auth) return auth.error;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });
  const { error } = await db.from("tutors").delete().eq("id", id);
  if (error) {
    const isFk = error.code === "23503" || (error.message || "").includes("foreign key");
    const detail = isFk
      ? "Impossibile eliminare: tutor collegato ad altri record (es. studenti o booking)."
      : error.message;
    const status = isFk ? 409 : 500;
    return NextResponse.json({ error: detail }, { status });
  }
  return NextResponse.json({ ok: true });
}
