import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { syncLiteProfilePatch } from "@/lib/studentLiteSync";

async function getUid(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid as string;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await syncLiteProfilePatch(uid, {
      onboarding_completed_at: null,
      onboarding_version: null,
      onboarding_return_to: null,
      onboarding_segment: null,
      current_focus_subject: null,
      current_focus_topic: null,
      current_focus_topic_code: null,
      current_focus_need: null,
      help_urgency: null,
      tutor_help_requested: false,
      tutor_help_requested_at: null,
      weak_subjects: null,
      weak_topics: null,
      current_topics: null,
    });

    return NextResponse.json({
      ok: true,
      onboardingUrl: "/onboarding?redirect=%2Faccount",
    });
  } catch (error) {
    console.error("[me-onboarding-reset] failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
