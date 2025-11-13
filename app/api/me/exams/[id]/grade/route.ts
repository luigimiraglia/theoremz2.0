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

  const ref = adminDb.doc(`users/${uid}/exams/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const data = snap.data() as any;
  const date = data?.date;
  if (!date) {
    return NextResponse.json({ error: "missing_date" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (date > today) {
    return NextResponse.json(
      { error: "future_exam", detail: "Puoi registrare voti solo per verifiche passate." },
      { status: 400 }
    );
  }

  const gradesCollection = adminDb.collection(`users/${uid}/grades`);
  const assessmentId = data?.blackAssessmentId || data?.black_assessment_id || null;
  const existingGradeId = data?.grade_id || data?.gradeId || null;
  let gradeDocId = existingGradeId;
  if (!gradeDocId && assessmentId) {
    const snap = await gradesCollection
      .where("assessmentId", "==", assessmentId)
      .limit(1)
      .get();
    if (!snap.empty) gradeDocId = snap.docs[0].id;
  }
  if (gradeDocId) {
    await gradesCollection.doc(gradeDocId).set(
      {
        date,
        subject,
        grade: boundedGrade,
        assessmentId,
        updatedAt: Date.now(),
        source: "account_app",
      },
      { merge: true }
    );
  } else {
    const doc = await gradesCollection.add({
      date,
      subject,
      grade: boundedGrade,
      assessmentId,
      createdAt: Date.now(),
      source: "account_app",
    });
    gradeDocId = doc.id;
  }

  await ref.set(
    {
      grade: boundedGrade,
      grade_subject: subject,
      grade_id: gradeDocId,
      grade_synced_at: Date.now(),
    },
    { merge: true }
  );

  await syncBlackGrade({
    uid,
    date,
    grade: boundedGrade,
    subject,
    examData: data,
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

async function syncBlackGrade({
  uid,
  date,
  grade,
  subject,
  examData,
}: {
  uid: string;
  date: string;
  grade: number;
  subject: "matematica" | "fisica";
  examData: Record<string, any>;
}) {
  const db = supabaseServer();
  const { data: student, error } = await db
    .from("black_students")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("[me-exams] black student lookup failed", error);
    return;
  }
  if (!student?.id) return;
  const studentId = student.id;

  const insertPayload: Record<string, any> = {
    student_id: studentId,
    subject: subject,
    score: grade,
    max_score: 10,
    when_at: date,
  };
  const { error: gradeInsertError } = await db
    .from("black_grades")
    .insert(insertPayload);
  if (gradeInsertError) {
    console.error("[me-exams] black grade insert failed", gradeInsertError);
  }

  let assessmentRow: { id: string; subject?: string | null; topics?: string | null } | null =
    null;
  const existingAssessmentId =
    examData?.blackAssessmentId || examData?.black_assessment_id || null;
  if (existingAssessmentId) {
    const { data: assessment, error: assessmentError } = await db
      .from("black_assessments")
      .select("id, subject, topics")
      .eq("id", existingAssessmentId)
      .maybeSingle();
    if (!assessmentError && assessment?.id) {
      assessmentRow = assessment;
    }
  }
  if (!assessmentRow) {
    const { data: candidates, error: candidatesError } = await db
      .from("black_assessments")
      .select("id, subject, topics")
      .eq("student_id", studentId)
      .eq("when_at", date);
    if (!candidatesError) {
      if (candidates?.length === 1) assessmentRow = candidates[0];
      else if (candidates?.length && examData?.subject) {
        const normalized = String(examData.subject).toLowerCase();
        assessmentRow =
          candidates.find(
            (row) => (row.subject || "").toLowerCase() === normalized
          ) || null;
      }
    }
  }

  if (assessmentRow) {
    const resultLine = buildAssessmentResultLine({
      score: grade,
      max: 10,
      subject: subject,
    });
    const topics = mergeAssessmentTopics(assessmentRow.topics || "", resultLine);
    const { error: updateError } = await db
      .from("black_assessments")
      .update({ topics })
      .eq("id", assessmentRow.id);
    if (updateError) {
      console.error("[me-exams] assessment update failed", updateError);
    }
  }

  await refreshBriefSafe(db, studentId);
}

function buildAssessmentResultLine({
  score,
  max,
  subject,
}: {
  score: number;
  max: number;
  subject: string | null;
}) {
  const cleanScore =
    Number.isFinite(score) && Number.isFinite(max)
      ? `${score}/${max}`
      : "";
  const label = subject ? `Esito ${subject}` : "Esito verifica";
  return cleanScore ? `${label}: ${cleanScore}` : `${label}: registrato`;
}

function mergeAssessmentTopics(current: string, resultLine: string) {
  const lines = current
    ? current.split("\n").map((line) => line.trimEnd())
    : [];
  const idx = lines.findIndex((line) =>
    line.trim().toLowerCase().startsWith("esito")
  );
  if (idx >= 0) lines[idx] = resultLine;
  else lines.push(resultLine);
  return lines.filter(Boolean).join("\n");
}

async function refreshBriefSafe(
  db: ReturnType<typeof supabaseServer>,
  studentId: string
) {
  try {
    await db.rpc("refresh_black_brief", { _student: studentId });
  } catch (error) {
    console.warn("[me-exams] refresh brief failed", error);
  }
}
