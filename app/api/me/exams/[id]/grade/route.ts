import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { syncBlackGrade } from "@/lib/black/gradeSync";

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
    assessmentId:
      data?.blackAssessmentId || data?.black_assessment_id || null,
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
