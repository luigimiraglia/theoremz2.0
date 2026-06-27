import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
import { resolveBlackStudentIdentity } from "@/lib/black/studentIdentity";

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
  const { data, error: readError } = await db
    .from("student_assessments")
    .select("id, date, subject")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();
  if (readError) {
    console.error("[me-exams] delete read failed", readError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data?.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error: gradeDeleteError } = await db
    .from("student_grades")
    .delete()
    .eq("user_id", uid)
    .eq("assessment_id", id);
  if (gradeDeleteError) {
    console.warn("[me-exams] failed to delete linked grade", gradeDeleteError);
  }

  const { error: deleteError } = await db
    .from("student_assessments")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);
  if (deleteError) {
    console.error("[me-exams] delete failed", deleteError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  await deleteBlackAssessment({
    uid,
    date: data.date || null,
    subject: data.subject || null,
  });
  return NextResponse.json({ ok: true });
}

async function deleteBlackAssessment({
  uid,
  date,
  subject,
}: {
  uid: string;
  date: string | null;
  subject: string | null;
}) {
  const db = supabaseServer();
  let identity = null;
  try {
    identity = await resolveBlackStudentIdentity(db, { authUid: uid });
  } catch (error) {
    console.error("[me-exams] delete lookup failed", error);
    return;
  }
  if (!identity?.canonicalStudentId) return;

  if (!date) return;
  let query = db
    .from("black_assessments")
    .delete()
    .eq("student_id", identity.canonicalStudentId)
    .eq("when_at", date);
  if (subject) query = query.eq("subject", subject);
  await query;

  try {
    await db.rpc("refresh_black_brief", { _student: identity.canonicalStudentId });
  } catch (err) {
    console.warn("[me-exams] delete refresh brief failed", err);
  }
}
