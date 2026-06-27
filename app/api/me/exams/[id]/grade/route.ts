import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { syncBlackGrade } from "@/lib/black/gradeSync";
import { getRomeTodayYmd } from "@/lib/rome-time";
import { supabaseServer } from "@/lib/supabase";
import { ensureStudentRecord } from "@/lib/students";

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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const payload = await req.json().catch(() => ({}));
  const grade = Number(payload.grade);
  const subject =
    payload.subject === "matematica" || payload.subject === "fisica"
      ? payload.subject
      : null;

  if (!Number.isFinite(grade) || !subject) {
    return NextResponse.json({ error: "invalid_grade" }, { status: 400 });
  }
  const boundedGrade = Math.max(0, Math.min(10, grade));

  const db = supabaseServer();
  const { data, error: readError } = await db
    .from("student_assessments")
    .select("id, date, subject")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();
  if (readError) {
    console.error("[me-exam-grade] assessment read failed", readError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data?.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const date = data?.date;
  if (!date) {
    return NextResponse.json({ error: "missing_date" }, { status: 400 });
  }

  const today = getRomeTodayYmd();
  if (date > today) {
    return NextResponse.json(
      { error: "future_exam", detail: "Puoi registrare voti solo per verifiche passate." },
      { status: 400 }
    );
  }

  const student = await ensureStudentRecord({ authUid: uid, source: "auth" }, db);
  const { data: existingGrade, error: existingGradeError } = await db
    .from("student_grades")
    .select("id")
    .eq("user_id", uid)
    .eq("assessment_id", id)
    .maybeSingle();
  if (existingGradeError) {
    console.error("[me-exam-grade] existing grade read failed", existingGradeError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let gradeDocId = existingGrade?.id || null;
  if (gradeDocId) {
    const { error } = await db
      .from("student_grades")
      .update({
        subject,
        grade: boundedGrade,
        taken_on: date,
        source: "account_app",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gradeDocId)
      .eq("user_id", uid);
    if (error) {
      console.error("[me-exam-grade] grade update failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  } else {
    const { data: inserted, error } = await db
      .from("student_grades")
      .insert({
        student_id: student.id,
        user_id: uid,
        subject,
        grade: boundedGrade,
        taken_on: date,
        assessment_id: id,
        source: "account_app",
      })
      .select("id")
      .single();
    if (error) {
      console.error("[me-exam-grade] grade insert failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    gradeDocId = inserted.id;
  }

  const { error: assessmentUpdateError } = await db
    .from("student_assessments")
    .update({ grade: boundedGrade, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", uid);
  if (assessmentUpdateError) {
    console.error("[me-exam-grade] assessment update failed", assessmentUpdateError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  await syncBlackGrade({
    uid,
    date,
    grade: boundedGrade,
    subject,
    examSubject: data?.subject || null,
  });

  return NextResponse.json({
    ok: true,
    grade: {
      id: gradeDocId,
      date,
      subject,
      grade: boundedGrade,
    },
  });
}
