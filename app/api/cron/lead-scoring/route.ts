import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;

function isAuthorized(req: NextRequest) {
  if (process.env.NODE_ENV !== "production" && !CRON_SECRET) return true;
  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const provided = bearer || req.headers.get("x-cron-secret") || null;
  if (CRON_SECRET) return provided === CRON_SECRET;
  return req.headers.has("x-vercel-cron");
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type ScoreSignals = {
  daysSinceLastAccess: number | null;
  lessonsViewed: number;
  needCode: string | null;
  hasPhone: boolean;
};

function calcLeadScore(s: ScoreSignals): number {
  let score = 0;

  // Recency: quando ha visitato l'ultima volta (0-40 punti)
  if (s.daysSinceLastAccess !== null) {
    if (s.daysSinceLastAccess <= 1) score += 40;
    else if (s.daysSinceLastAccess <= 3) score += 30;
    else if (s.daysSinceLastAccess <= 7) score += 20;
    else if (s.daysSinceLastAccess <= 30) score += 10;
  }

  // Engagement: quante lezioni ha visto (0-30 punti)
  if (s.lessonsViewed >= 10) score += 30;
  else if (s.lessonsViewed >= 5) score += 20;
  else if (s.lessonsViewed >= 2) score += 10;
  else if (s.lessonsViewed >= 1) score += 5;

  // Urgenza bisogno dall'onboarding (0-20 punti)
  const need = s.needCode?.toLowerCase() ?? "";
  if (need.includes("recupero")) score += 20;
  else if (need.includes("esame")) score += 15;
  else if (need.includes("approfondimento")) score += 10;
  else if (need) score += 5;

  // Qualità contatto: ha il telefono? (0-10 punti)
  score += s.hasPhone ? 10 : 5;

  return Math.min(score, 100);
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = db();

  // Prendi tutti i lead attivi con email
  const { data: leads, error: leadsErr } = await supabase
    .from("canonical_leads")
    .select("id, email, phone, metadata")
    .eq("status", "active")
    .not("email", "is", null);

  if (leadsErr) {
    console.error("[lead-scoring] fetch leads:", leadsErr);
    return NextResponse.json({ error: "fetch_leads" }, { status: 500 });
  }
  if (!leads?.length) return NextResponse.json({ ok: true, scored: 0 });

  const emails = leads.map((l: any) => l.email.toLowerCase()).filter(Boolean);

  // Prendi students per questi email → per avere l'auth_uid
  const { data: students } = await supabase
    .from("students")
    .select("email, auth_uid")
    .in("email", emails);

  const authUids = (students || []).map((s: any) => s.auth_uid).filter(Boolean);

  // Profili: last_access_at + onboarding_segment
  const { data: profiles } = authUids.length
    ? await supabase
        .from("student_profiles")
        .select("user_id, last_access_at, onboarding_segment")
        .in("user_id", authUids)
    : { data: [] };

  // Conteggio lezioni viste per uid
  const { data: viewRows } = authUids.length
    ? await supabase
        .from("student_lessons_progress")
        .select("user_id")
        .eq("status", "viewed")
        .in("user_id", authUids)
    : { data: [] };

  const viewCountByUid: Record<string, number> = {};
  for (const row of viewRows || []) {
    const uid = (row as any).user_id;
    viewCountByUid[uid] = (viewCountByUid[uid] || 0) + 1;
  }

  // Indici rapidi email → student, uid → profile
  const studentByEmail: Record<string, any> = {};
  for (const s of students || []) {
    if (s.email) studentByEmail[s.email.toLowerCase()] = s;
  }
  const profileByUid: Record<string, any> = {};
  for (const p of profiles || []) {
    if ((p as any).user_id) profileByUid[(p as any).user_id] = p;
  }

  const now = Date.now();
  let scored = 0;

  for (const lead of leads) {
    const email = (lead as any).email?.toLowerCase();
    const student = email ? studentByEmail[email] : null;
    const profile = student?.auth_uid ? profileByUid[student.auth_uid] : null;

    const lastAccessMs = profile?.last_access_at
      ? new Date(profile.last_access_at).getTime()
      : null;
    const daysSinceLastAccess = lastAccessMs
      ? Math.floor((now - lastAccessMs) / 86_400_000)
      : null;

    const segment = profile?.onboarding_segment ?? {};
    const needCode = segment.needCode ?? segment.need_code ?? null;
    const lessonsViewed = student?.auth_uid ? (viewCountByUid[student.auth_uid] ?? 0) : 0;
    const hasPhone = !!(lead as any).phone;

    const score = calcLeadScore({ daysSinceLastAccess, lessonsViewed, needCode, hasPhone });

    const newMeta = {
      ...((lead as any).metadata ?? {}),
      lead_score: score,
      lead_score_at: new Date().toISOString(),
      lead_score_signals: { daysSinceLastAccess, lessonsViewed, needCode, hasPhone },
    };

    const { error } = await supabase
      .from("canonical_leads")
      .update({ metadata: newMeta, updated_at: new Date().toISOString() })
      .eq("id", (lead as any).id);

    if (error) console.error("[lead-scoring] update lead", (lead as any).id, error);
    else scored++;
  }

  console.log(`[lead-scoring] scored ${scored}/${leads.length} leads`);
  return NextResponse.json({ ok: true, scored, total: leads.length });
}
