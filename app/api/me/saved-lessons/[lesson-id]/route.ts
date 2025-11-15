import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
import { deleteSavedLessonLite } from "@/lib/studentLiteSync";

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

  const db = supabaseServer();
  const { error } = await db
    .from("student_saved_lessons")
    .delete()
    .eq("user_id", uid)
    .eq("lesson_id", lessonId);
  if (error) {
    console.error("[saved-lessons-delete] supabase delete failed", error);
  }

  try {
    await deleteSavedLessonLite({ userId: uid, lessonId });
  } catch (error) {
    console.error("[saved-lessons-delete] lite sync failed", error);
  }
  return NextResponse.json({ ok: true });
}
