import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
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
  const ref = adminDb.doc(`users/${uid}/exams/${id}`);
  const snap = await ref.get();
  const data = (snap.exists ? snap.data() : null) as any;
  await ref.delete();
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
  const { data: student, error } = await db
    .from("black_students")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("[me-exams] delete lookup failed", error);
    return;
  }
  if (!student?.id) return;
  const studentId = student.id;

  if (assessmentId) {
    await db.from("black_assessments").delete().eq("id", assessmentId).eq("student_id", studentId);
  } else if (date) {
    await db
      .from("black_assessments")
      .delete()
      .eq("student_id", studentId)
      .eq("when_at", date);
  }

  try {
    await db.rpc("refresh_black_brief", { _student: studentId });
  } catch (err) {
    console.warn("[me-exams] delete refresh brief failed", err);
  }
}
