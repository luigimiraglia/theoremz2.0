import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
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
  const ref = adminDb.doc(`users/${uid}/exams/${id}`);
  const snap = await ref.get();
  const data = (snap.exists ? snap.data() : null) as any;
  await ref.delete();
  const gradeId = data?.grade_id || data?.gradeId || null;
  if (gradeId) {
    try {
      await adminDb.doc(`users/${uid}/grades/${gradeId}`).delete();
    } catch (error) {
      console.warn("[me-exams] failed to delete linked grade", error);
    }
  }
  if (data?.blackAssessmentId || data?.date) {
    await deleteBlackAssessment({
      uid,
      assessmentId: data?.blackAssessmentId || null,
      date: data?.date || null,
    });
  }
  return NextResponse.json({ ok: true });
}

async function deleteBlackAssessment({
  uid,
  assessmentId,
  date,
}: {
  uid: string;
  assessmentId: string | null;
  date: string | null;
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

  if (assessmentId) {
    await db
      .from("black_assessments")
      .delete()
      .eq("id", assessmentId)
      .eq("student_id", identity.canonicalStudentId);
  } else if (date) {
    await db
      .from("black_assessments")
      .delete()
      .eq("student_id", identity.canonicalStudentId)
      .eq("when_at", date);
  }

  try {
    await db.rpc("refresh_black_brief", { _student: identity.canonicalStudentId });
  } catch (err) {
    console.warn("[me-exams] delete refresh brief failed", err);
  }
}
