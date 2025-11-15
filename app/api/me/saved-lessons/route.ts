import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
import { upsertSavedLessonLite } from "@/lib/studentLiteSync";

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
  const db = supabaseServer();
  const { data, error } = await db
    .from("student_saved_lessons")
    .select(
      "lesson_id, lesson_slug, title, thumb_url, status, saved_at, updated_at"
    )
    .eq("user_id", uid)
    .order("saved_at", { ascending: false })
    .limit(Math.min(limit, 200));

  if (error) {
    console.error("[saved-lessons] supabase fetch failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const items =
    data?.map((row) => ({
      lessonId: row.lesson_id,
      slug: row.lesson_slug,
      title: row.title,
      thumb: row.thumb_url,
      status: row.status,
      savedAt: row.saved_at,
      updatedAt: row.updated_at,
    })) ?? [];

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

  const savedAt = Date.now();
  const db = supabaseServer();
  const { error } = await db.from("student_saved_lessons").upsert(
    {
      user_id: uid,
      lesson_id: lessonId,
      lesson_slug: slug,
      title,
      thumb_url: thumb ?? null,
      status: "saved",
      saved_at: new Date(savedAt).toISOString(),
      updated_at: new Date(savedAt).toISOString(),
    },
    { onConflict: "user_id,lesson_id" }
  );
  if (error) {
    console.error("[saved-lessons] supabase upsert failed", error);
  }

  try {
    await upsertSavedLessonLite({
      userId: uid,
      slug,
      status: "saved",
      savedAt: Date.now(),
    });
  } catch (error) {
    console.error("[saved-lessons] lite sync failed", error);
  }

  return NextResponse.json({ ok: true });
}
