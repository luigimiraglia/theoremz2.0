import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS || "";
const MIN_SCORE = 40;
const INACTIVE_MIN_DAYS = 7;
const INACTIVE_MAX_DAYS = 30;
const REENGAGEMENT_COOLDOWN_DAYS = 7;

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

function buildTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
  });
}

function buildEmail(to: string, firstName: string, materia: string | null, lastSlug: string | null) {
  const materiaLabel = materia
    ? materia.charAt(0).toUpperCase() + materia.slice(1)
    : "Matematica e Fisica";
  const lessonUrl = lastSlug ? `https://theoremz.com/${lastSlug}` : "https://theoremz.com";

  const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
    <img src="https://theoremz.com/images/logo.webp" alt="Theoremz" style="height:32px;margin-bottom:24px;">
    <h2 style="color:#1e293b;font-size:20px;margin:0 0 12px;">
      Ciao ${firstName || "studente"} 👋
    </h2>
    <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Sono un po' che non ti vediamo su Theoremz. Stavi studiando <strong>${materiaLabel}</strong> — vuoi riprendere da dove hai lasciato?
    </p>
    ${lastSlug ? `
    <a href="${lessonUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:16px;">
      Continua a studiare →
    </a>
    ` : `
    <a href="https://theoremz.com" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:16px;">
      Torna su Theoremz →
    </a>
    `}
    <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;line-height:1.5;">
      Hai ricevuto questa email perché sei iscritto a Theoremz.<br>
      <a href="https://theoremz.com/account" style="color:#94a3b8;">Gestisci le preferenze email</a>
    </p>
  </div>
</body>
</html>`;

  return {
    from: `"Theoremz" <${GMAIL_USER}>`,
    to,
    subject: `${firstName ? `${firstName}, ti` : "Ti"} aspettiamo su Theoremz 📚`,
    html,
  };
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    return NextResponse.json({ error: "missing_gmail_config" }, { status: 500 });
  }

  const supabase = db();
  const now = new Date();
  const minInactiveDate = new Date(now.getTime() - INACTIVE_MIN_DAYS * 86_400_000).toISOString();
  const maxInactiveDate = new Date(now.getTime() - INACTIVE_MAX_DAYS * 86_400_000).toISOString();
  const cooldownDate = new Date(now.getTime() - REENGAGEMENT_COOLDOWN_DAYS * 86_400_000).toISOString();

  // Lead attivi con score >= MIN_SCORE e inattivi 7-30gg
  const { data: leads, error: leadsErr } = await supabase
    .from("canonical_leads")
    .select("id, email, full_name, metadata")
    .eq("status", "active")
    .not("email", "is", null)
    .gte(`metadata->lead_score`, MIN_SCORE);

  if (leadsErr) {
    console.error("[re-engagement] fetch leads:", leadsErr);
    return NextResponse.json({ error: "fetch_leads" }, { status: 500 });
  }
  if (!leads?.length) return NextResponse.json({ ok: true, sent: 0, reason: "no_leads" });

  // Filtra: non già contattati di recente
  const candidates = leads.filter((l: any) => {
    const lastRe = l.metadata?.last_reengagement_at;
    if (lastRe && new Date(lastRe) > new Date(cooldownDate)) return false;
    return true;
  });

  if (!candidates.length) return NextResponse.json({ ok: true, sent: 0, reason: "all_in_cooldown" });

  const emails = candidates.map((l: any) => l.email.toLowerCase());

  // Trova gli student corrispondenti
  const { data: students } = await supabase
    .from("students")
    .select("email, auth_uid")
    .in("email", emails);

  const authUids = (students || []).map((s: any) => s.auth_uid).filter(Boolean);

  // Profili: last_access_at e onboarding per filtrare inattivi + ottenere materia
  const { data: profiles } = authUids.length
    ? await supabase
        .from("student_profiles")
        .select("user_id, last_access_at, onboarding_segment")
        .in("user_id", authUids)
        .lt("last_access_at", minInactiveDate)
        .gt("last_access_at", maxInactiveDate)
    : { data: [] };

  // Ultima lezione vista per uid
  const { data: lastLessons } = authUids.length
    ? await supabase
        .from("student_lessons_progress")
        .select("user_id, slug, updated_at")
        .eq("status", "viewed")
        .in("user_id", authUids)
        .order("updated_at", { ascending: false })
    : { data: [] };

  // Indici
  const studentByEmail: Record<string, any> = {};
  for (const s of students || []) {
    if (s.email) studentByEmail[s.email.toLowerCase()] = s;
  }
  const profileByUid: Record<string, any> = {};
  for (const p of profiles || []) {
    if ((p as any).user_id) profileByUid[(p as any).user_id] = p;
  }
  const lastLessonByUid: Record<string, string> = {};
  for (const row of lastLessons || []) {
    const uid = (row as any).user_id;
    if (!lastLessonByUid[uid]) lastLessonByUid[uid] = (row as any).slug;
  }

  const transport = buildTransport();
  let sent = 0;
  let skipped = 0;

  for (const lead of candidates) {
    const email = (lead as any).email?.toLowerCase();
    const student = email ? studentByEmail[email] : null;
    const profile = student?.auth_uid ? profileByUid[student.auth_uid] : null;

    // Salta se il profilo non è nel range di inattività
    if (!profile) { skipped++; continue; }

    const firstName = ((lead as any).full_name || "").split(" ")[0] || "";
    const materia = profile.onboarding_segment?.materia ?? profile.onboarding_segment?.subject ?? null;
    const lastSlug = student?.auth_uid ? (lastLessonByUid[student.auth_uid] ?? null) : null;

    try {
      await transport.sendMail(buildEmail(email, firstName, materia, lastSlug));

      // Aggiorna metadata con la data dell'ultimo re-engagement
      const newMeta = {
        ...((lead as any).metadata ?? {}),
        last_reengagement_at: now.toISOString(),
      };
      await supabase
        .from("canonical_leads")
        .update({ metadata: newMeta, updated_at: now.toISOString() })
        .eq("id", (lead as any).id);

      sent++;
      console.log(`[re-engagement] sent to ${email} (score: ${(lead as any).metadata?.lead_score})`);
    } catch (err) {
      console.error(`[re-engagement] failed for ${email}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, candidates: candidates.length });
}
