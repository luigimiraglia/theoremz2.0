import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";

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

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = supabaseServer();
  const { data: grade, error: readError } = await db
    .from("student_grades")
    .select("assessment_id")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();
  if (readError) {
    console.error("[me-grades] delete read failed", readError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { error } = await db
    .from("student_grades")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);
  if (error) {
    console.error("[me-grades] delete failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (grade?.assessment_id) {
    await db
      .from("student_assessments")
      .update({ grade: null, updated_at: new Date().toISOString() })
      .eq("id", grade.assessment_id)
      .eq("user_id", uid);
  }
  return NextResponse.json({ ok: true });
}
