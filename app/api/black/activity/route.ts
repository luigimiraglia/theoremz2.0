import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type ActivityPayload = {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  sessionId?: string | null;
  meta?: Record<string, any> | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ActivityPayload | null;
    if (!body?.userId) {
      return NextResponse.json({ error: "missing_user" }, { status: 400 });
    }

    const db = supabaseServer();
    const now = new Date().toISOString();
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.length ? body.sessionId : null;

    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    const { data: studentRow } = await db
      .from("black_students")
      .select("id")
      .eq("user_id", body.userId)
      .maybeSingle();

    if (studentRow) {
      await db
        .from("black_students")
        .update({ last_active_at: now })
        .eq("user_id", body.userId);
    }

    const firebaseUser = await fetchFirebaseUser(body.userId);
    const firestoreMeta = body.meta || (await fetchFirestoreMeta(body.userId));
    const resolvedEmail =
      body.email || firebaseUser?.email || firestoreMeta?.student_email || null;
    const resolvedFullName =
      body.fullName ||
      firebaseUser?.displayName ||
      firestoreMeta?.full_name ||
      firestoreMeta?.parent_name ||
      null;

    await upsertProfile(db, {
      userId: body.userId,
      email: resolvedEmail,
      fullName: resolvedFullName,
      isBlack: Boolean(studentRow),
      firebaseCreatedAt: firebaseUser?.metadata?.creationTime || null,
      updatedAt: now,
    });

    if (studentRow && firestoreMeta) {
      const studentUpdate = buildStudentUpdate(firestoreMeta);
      if (Object.keys(studentUpdate).length) {
        studentUpdate.updated_at = now;
        await db.from("black_students").update(studentUpdate).eq("user_id", body.userId);
      }
    }

    await upsertAccessLog(db, {
      userId: body.userId,
      sessionId,
      ip,
      userAgent,
      timestamp: now,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[black-activity] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function fetchFirebaseUser(uid: string) {
  try {
    return await adminAuth.getUser(uid);
  } catch (error) {
    console.warn("[black-activity] firebase user lookup failed", error);
    return null;
  }
}

async function fetchFirestoreMeta(uid: string) {
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    return snap.exists ? snap.data() ?? null : null;
  } catch (error) {
    console.warn("[black-activity] firestore meta fetch failed", error);
    return null;
  }
}

async function upsertProfile(
  db: ReturnType<typeof supabaseServer>,
  payload: {
    userId: string;
    email: string | null;
    fullName: string | null;
    isBlack: boolean;
    firebaseCreatedAt: string | null;
    updatedAt: string;
  },
) {
  const profile: Record<string, any> = {
    id: payload.userId,
    role: "student",
    subscription_tier: payload.isBlack ? "black" : "free",
    updated_at: payload.updatedAt,
  };
  if (payload.email) profile.email = payload.email;
  if (payload.fullName) profile.full_name = payload.fullName;
  if (payload.firebaseCreatedAt) profile.created_at = payload.firebaseCreatedAt;
  await db.from("profiles").upsert(profile, { onConflict: "id" });
}

async function upsertAccessLog(
  db: ReturnType<typeof supabaseServer>,
  opts: { userId: string; sessionId: string | null; ip: string | null; userAgent: string | null; timestamp: string },
) {
  const accessDate = opts.timestamp.slice(0, 10);
  const { data, error } = await db
    .from("black_access_logs")
    .select("id, access_count")
    .eq("user_id", opts.userId)
    .eq("access_date", accessDate)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    console.warn("[black-activity] access log lookup failed", error);
    return;
  }
  if (data?.id) {
    await db
      .from("black_access_logs")
      .update({
        last_access_at: opts.timestamp,
        access_count: (data.access_count || 0) + 1,
        last_session_id: opts.sessionId,
        last_ip: opts.ip,
        last_user_agent: opts.userAgent,
      })
      .eq("id", data.id);
  } else {
    await db.from("black_access_logs").insert({
      user_id: opts.userId,
      access_date: accessDate,
      first_access_at: opts.timestamp,
      last_access_at: opts.timestamp,
      access_count: 1,
      last_session_id: opts.sessionId,
      last_ip: opts.ip,
      last_user_agent: opts.userAgent,
    });
  }
}

function buildStudentUpdate(meta: Record<string, any>) {
  const update: Record<string, any> = {};
  const yearClass = mapYear(meta) || meta.year_class || null;
  if (yearClass) update.year_class = yearClass;
  if (meta.goal) update.goal = meta.goal;
  if (meta.difficulty || meta.difficulty_focus)
    update.difficulty_focus = meta.difficulty || meta.difficulty_focus;
  if (meta.track) update.track = meta.track;
  if (meta.next_assessment_subject) {
    update.next_assessment_subject = meta.next_assessment_subject;
  }
  if (meta.next_assessment_date) {
    update.next_assessment_date = meta.next_assessment_date;
  } else if (Array.isArray(meta.verifiche) && meta.verifiche.length) {
    const upcoming = meta.verifiche.find((v: any) => v?.date || v?.when);
    if (upcoming?.date || upcoming?.when) {
      update.next_assessment_date = normalizeDate(upcoming.date || upcoming.when);
    }
    if (upcoming?.subject || upcoming?.materia) {
      update.next_assessment_subject = upcoming.subject || upcoming.materia;
    }
  }
  if (meta.parent_email) update.parent_email = meta.parent_email;
  if (meta.parent_phone) update.parent_phone = meta.parent_phone;
  if (meta.parent_name) update.parent_name = meta.parent_name;
  if (meta.student_email) update.student_email = meta.student_email;
  if (meta.student_phone) update.student_phone = meta.student_phone;
  return update;
}

function mapYear(meta: Record<string, any>) {
  if (typeof meta?.year_class === "string") return meta.year_class;
  const yearNum = Number(meta?.year);
  if (!Number.isFinite(yearNum)) return null;
  const indirizzo = String(meta?.indirizzo || "").toLowerCase();
  if (indirizzo.includes("liceo")) return `${yearNum}°Liceo`;
  return `${yearNum}°Superiore`;
}

function normalizeDate(value: any) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}
