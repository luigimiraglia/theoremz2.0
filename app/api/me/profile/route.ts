import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";

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

export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: studentProfile, error } = await supabaseServer()
    .from("student_profiles")
    .select(
      "nickname, cycle, indirizzo, school_year, goal_grade, onboarding_segment, current_focus_subject, current_focus_topic, current_focus_topic_code, current_focus_need, help_urgency, tutor_help_requested",
    )
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("[profile] supabase read failed", error);
  }
  const onboardingSegment =
    (studentProfile?.onboarding_segment as Record<string, unknown> | null) ?? null;
  const profile = {
    cycle: mapStoredCycle(studentProfile?.cycle),
    year: studentProfile?.school_year ?? null,
    indirizzo: studentProfile?.indirizzo ?? null,
    goalMin: studentProfile?.goal_grade ?? 20,
    showBadges:
      typeof onboardingSegment?.showBadges === "boolean"
        ? onboardingSegment.showBadges
        : true,
    username: studentProfile?.nickname ?? null,
    onboardingSegment,
    currentFocusSubject: studentProfile?.current_focus_subject ?? null,
    currentFocusTopic: studentProfile?.current_focus_topic ?? null,
    currentFocusTopicCode: studentProfile?.current_focus_topic_code ?? null,
    currentFocusNeed: studentProfile?.current_focus_need ?? null,
    helpUrgency: studentProfile?.help_urgency ?? null,
    tutorHelpRequested: studentProfile?.tutor_help_requested ?? false,
  };
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.cycle === "medie" || body.cycle === "liceo" || body.cycle === "altro")
    patch.cycle = body.cycle;
  if (typeof body.year === "number") patch.year = Math.max(1, Math.min(5, body.year));
  if (typeof body.indirizzo === "string") patch.indirizzo = String(body.indirizzo).slice(0, 64);
  if (typeof body.goalMin === "number") patch.goalMin = Math.max(5, Math.min(120, body.goalMin));
  if (typeof body.showBadges === "boolean") patch.showBadges = body.showBadges;
  // avatar non più supportato

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  const db = supabaseServer();
  const { data: currentProfile, error: readError } = await db
    .from("student_profiles")
    .select("cycle, indirizzo, school_year, goal_grade, onboarding_segment")
    .eq("user_id", uid)
    .maybeSingle();
  if (readError) {
    console.error("[profile] supabase current read failed", readError);
  }
  const currentSegment =
    currentProfile && typeof currentProfile.onboarding_segment === "object"
      ? (currentProfile.onboarding_segment as Record<string, unknown>)
      : {};
  const onboardingSegment = {
    ...currentSegment,
    cycle: (patch.cycle as string | undefined) ?? mapStoredCycle(currentProfile?.cycle),
    schoolYear:
      (patch.year as number | undefined) ?? currentProfile?.school_year ?? null,
    indirizzo:
      (patch.indirizzo as string | undefined) ?? currentProfile?.indirizzo ?? null,
    schoolTrackLabel:
      (patch.indirizzo as string | undefined) ?? currentProfile?.indirizzo ?? null,
    goalMin: (patch.goalMin as number | undefined) ?? currentProfile?.goal_grade ?? 20,
    showBadges:
      (patch.showBadges as boolean | undefined) ??
      (typeof currentSegment.showBadges === "boolean"
        ? currentSegment.showBadges
        : true),
  };

  try {
    const userRecord = await adminAuth.getUser(uid);
    await syncLiteProfilePatch(uid, {
      full_name: userRecord?.displayName ?? null,
      email: userRecord?.email ?? null,
      phone: userRecord?.phoneNumber ?? null,
      cycle: (patch.cycle as string | undefined) ?? null,
      indirizzo: (patch.indirizzo as string | undefined) ?? null,
      school_year: (patch.year as number | undefined) ?? undefined,
      goal_grade: (patch.goalMin as number | undefined) ?? undefined,
      onboarding_segment: onboardingSegment,
    });
  } catch (error) {
    console.error("[profile] lite sync failed", error);
  }
  return NextResponse.json({ ok: true });
}

function mapStoredCycle(value?: string | null) {
  if (value === "superiori") return "liceo";
  if (value === "medie" || value === "altro") return value;
  return null;
}
