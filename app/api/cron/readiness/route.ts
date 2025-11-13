import { NextResponse } from "next/server";
import OpenAI from "openai";
import nodemailer from "nodemailer";
import { supabaseServer } from "@/lib/supabase";
import { decayReadiness, resetReadiness } from "@/lib/black/readiness";

const CRON_SECRET = process.env.BLACK_CRON_SECRET || process.env.CRON_SECRET;
const CONTACT_LOG_TABLE = "black_contact_logs";
const PRE_EXAM_SOURCE = "pre_exam_tip_email";
const GMAIL_USER = process.env.GMAIL_USER || null;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS || null;
const PRE_EXAM_CC =
  process.env.BLACK_PRE_EXAM_CC || process.env.CONTACT_TO || null;
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

let mailer: nodemailer.Transporter | null = null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseServer();
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "reset") {
      const reset = await resetReadiness({ db });
      return NextResponse.json({ ok: true, mode: "reset", ...reset });
    }
    if (action === "test-pre-exam") {
      const testResult = await handleTestPreExam(req);
      return NextResponse.json({ ok: !testResult.error, mode: "test", ...testResult });
    }
    const decay = await decayReadiness({ db });
    let preExamTips: Awaited<ReturnType<typeof maybeSendPreExamTips>> | null =
      null;
    try {
      preExamTips = await maybeSendPreExamTips(db);
    } catch (error) {
      console.error("[cron-readiness] pre-exam tips failed", error);
    }
    return NextResponse.json({
      ok: true,
      mode: "decay",
      ...decay,
      pre_exam: preExamTips,
    });
  } catch (error: any) {
    console.error("[cron-readiness] failure", error);
    return NextResponse.json(
      {
        error: "readiness_update_failed",
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

function isAuthorized(req: Request) {
  if (process.env.NODE_ENV !== "production" && !CRON_SECRET) return true;
  const header = req.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const url = new URL(req.url);
  const provided =
    bearer ||
    req.headers.get("x-cron-secret") ||
    url.searchParams.get("secret") ||
    null;
  if (CRON_SECRET) return provided === CRON_SECRET;
  return req.headers.has("x-vercel-cron");
}

async function handleTestPreExam(req: Request) {
  if (!openaiClient) return { error: "missing_openai_api_key" };
  const transporter = getMailer();
  if (!transporter) return { error: "missing_mail_transport" };

  let body: any;
  try {
    body = await req.json();
  } catch {
    return { error: "invalid_json" };
  }
  if (!body || typeof body !== "object") {
    return { error: "invalid_payload" };
  }

  const toCandidates: string[] = [];
  if (Array.isArray(body.to)) {
    toCandidates.push(...body.to);
  } else if (typeof body.to === "string") {
    toCandidates.push(body.to);
  }
  if (typeof body.additionalTo === "string") {
    toCandidates.push(body.additionalTo);
  }
  const fallbackTo =
    process.env.BLACK_PRE_EXAM_TEST_TO || process.env.BLACK_PRE_EXAM_CC || process.env.CONTACT_TO || GMAIL_USER;
  if (!toCandidates.length && fallbackTo) {
    toCandidates.push(fallbackTo);
  }
  const to = extractEmails(toCandidates.join(","));
  if (!to.length) {
    return { error: "missing_to" };
  }

  const parentName = body.parentName || "genitori";
  const subjectLabel = body.subject || "Matematica";
  const topics = body.topics || null;
  const date =
    body.date ||
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

  const assessment = {
    id: body.assessmentId || `test-${Date.now()}`,
    student_id: "test-student",
    subject: subjectLabel,
    topics,
    when_at: date,
  };

  const logs = Array.isArray(body.logs)
    ? body.logs.map(normalizeTestLog).filter(Boolean)
    : [];

  const briefMd =
    typeof body.briefMd === "string" && body.briefMd.trim()
      ? body.briefMd
      : defaultBriefMock(parentName);

  const tipPayload = await generateTipPlan({
    parentName,
    assessment,
    briefMd,
    logs,
    goal: body.goal || null,
    difficulty: body.difficulty || null,
  });
  if (!tipPayload) {
    return { error: "ai_generation_failed" };
  }
  const email = composeEmail({
    parentName,
    assessment,
    tipPayload,
    briefMd,
  });
  if (!email) {
    return { error: "email_compose_failed" };
  }

  const subjectPrefix = typeof body.subjectPrefix === "string" ? body.subjectPrefix.trim() : "[TEST]";
  const mailSubject = subjectPrefix ? `${subjectPrefix} ${email.subject}` : email.subject;

  try {
    await transporter.sendMail({
      from: `Team Theoremz <${GMAIL_USER}>`,
      to,
      subject: mailSubject,
      text: email.text,
      html: email.html,
    });
  } catch (error: any) {
    console.error("[pre-exam:test] send failed", error);
    return { error: error?.message || "send_failed" };
  }

  return {
    sent: true,
    to,
    subject: mailSubject,
    preview: email.preview,
    ai: tipPayload,
  };
}

async function maybeSendPreExamTips(db: ReturnType<typeof supabaseServer>) {
  if (!openaiClient) {
    return { skipped: "missing_openai_api_key" };
  }
  const transporter = getMailer();
  if (!transporter) {
    return { skipped: "missing_mail_transport" };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = tomorrow.toISOString().slice(0, 10);

  const { data: assessments, error: assessmentsError } = await db
    .from("black_assessments")
    .select("id, student_id, subject, topics, when_at")
    .eq("when_at", targetDate);
  if (assessmentsError) {
    console.error("[pre-exam] failed to fetch assessments", assessmentsError);
    return { error: assessmentsError.message };
  }
  if (!assessments?.length) {
    return { processed: 0, sent: 0 };
  }

  const studentIds = Array.from(
    new Set(
      assessments
        .map((assessment: any) => assessment.student_id)
        .filter(Boolean)
    )
  );
  if (!studentIds.length) {
    return { processed: assessments.length, sent: 0 };
  }

  const { data: students, error: studentsError } = await db
    .from("black_students")
    .select(
      "id, parent_email, parent_name, goal, difficulty_focus, readiness, next_assessment_subject, next_assessment_date"
    )
    .in("id", studentIds);
  if (studentsError) {
    console.error("[pre-exam] failed to fetch students", studentsError);
    return { error: studentsError.message };
  }

  const { data: briefs, error: briefsError } = await db
    .from("black_student_brief")
    .select("student_id, brief_md")
    .in("student_id", studentIds);
  if (briefsError) {
    console.error("[pre-exam] failed to fetch briefs", briefsError);
  }

  const logWindow = new Date();
  logWindow.setDate(logWindow.getDate() - 30);
  const logLimit = Math.max(50, studentIds.length * 20);
  const { data: contactLogs, error: logsError } = await db
    .from(CONTACT_LOG_TABLE)
    .select("student_id, contacted_at, body, source, author_label")
    .in("student_id", studentIds)
    .gte("contacted_at", logWindow.toISOString())
    .order("contacted_at", { ascending: false })
    .limit(logLimit);
  if (logsError) {
    console.error("[pre-exam] failed to fetch contact logs", logsError);
  }

  const studentMap = new Map(
    (students || []).map((student: any) => [student.id, student])
  );
  const briefMap = new Map(
    (briefs || []).map((briefRow: any) => [
      briefRow.student_id,
      briefRow.brief_md,
    ])
  );
  const logsByStudent = new Map<string, any[]>();
  const emailLogTokens = new Map<string, Set<string>>();
  for (const log of contactLogs || []) {
    const studentId = log.student_id;
    if (!logsByStudent.has(studentId)) logsByStudent.set(studentId, []);
    logsByStudent.get(studentId)!.push(log);
    if (log.source === PRE_EXAM_SOURCE) {
      const token = extractAssessmentToken(log.body || "");
      if (!emailLogTokens.has(studentId))
        emailLogTokens.set(studentId, new Set());
      if (token) emailLogTokens.get(studentId)!.add(token);
    }
  }

  let sent = 0;
  const sentThisRun = new Set<string>();
  for (const assessment of assessments) {
    const studentId = assessment.student_id;
    if (!studentId) continue;
    const student = studentMap.get(studentId);
    if (!student) continue;
    const recipients = extractEmails(student.parent_email);
    if (!recipients.length) continue;

    const dedupeToken = buildAssessmentToken(assessment.id);
    const studentTokenSet = emailLogTokens.get(studentId);
    const tokenKey = `${studentId}:${dedupeToken}`;
    if (studentTokenSet?.has(dedupeToken) || sentThisRun.has(tokenKey)) {
      continue;
    }

    const briefMd = briefMap.get(studentId) || null;
    const contextLogs =
      logsByStudent
        .get(studentId)
        ?.filter((log) => log.source !== PRE_EXAM_SOURCE)
        .slice(0, 8) || [];

    const tipPayload = await generateTipPlan({
      parentName: student.parent_name,
      assessment,
      briefMd,
      logs: contextLogs,
      goal: student.goal,
      difficulty: student.difficulty_focus,
    });
    if (!tipPayload) continue;

    const email = composeEmail({
      parentName: student.parent_name,
      assessment,
      tipPayload,
      briefMd,
    });
    if (!email) continue;

    try {
      await transporter.sendMail({
        from: `Team Theoremz <${GMAIL_USER}>`,
        to: recipients,
        cc: PRE_EXAM_CC || undefined,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      sent += 1;
      sentThisRun.add(tokenKey);
      if (!emailLogTokens.has(studentId))
        emailLogTokens.set(studentId, new Set());
      emailLogTokens.get(studentId)!.add(dedupeToken);
    } catch (mailError) {
      console.error("[pre-exam] failed to send email", {
        studentId,
        assessmentId: assessment.id,
        error: mailError,
      });
      continue;
    }

    try {
      await db.from(CONTACT_LOG_TABLE).insert({
        student_id: studentId,
        contacted_at: new Date().toISOString(),
        source: PRE_EXAM_SOURCE,
        body: `${dedupeToken} | ${email.preview}`,
        author_label: "cron_pre_exam",
        author_chat_id: "cron-pre-exam",
      });
    } catch (logError) {
      console.error("[pre-exam] failed to log contact", {
        studentId,
        assessmentId: assessment.id,
        error: logError,
      });
    }
  }

  return { processed: assessments.length, sent };
}

function getMailer() {
  if (!GMAIL_USER || !GMAIL_APP_PASS) return null;
  if (!mailer) {
    mailer = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
    });
  }
  return mailer;
}

type TipPlan = {
  focus_points?: Array<string | { title?: string; detail?: string }>;
  study_actions?: string[];
  motivation?: string;
  reminders?: string[];
  tone?: string;
};

async function generateTipPlan({
  parentName,
  assessment,
  briefMd,
  logs,
  goal,
  difficulty,
}: {
  parentName?: string | null;
  assessment: any;
  briefMd: string | null;
  logs: any[];
  goal?: string | null;
  difficulty?: string | null;
}): Promise<TipPlan | null> {
  if (!openaiClient) return null;
  const briefSnippet = truncate(briefMd || "Nessuna scheda disponibile.", 4000);
  const logSummary = formatLogsForPrompt(logs);
  const dateLabel = formatItalianDate(assessment.when_at);
  const userPrompt = [
    `Genitore: ${parentName || "Famiglia studente"}`,
    `Verifica: ${assessment.subject || "materia"} il ${dateLabel}`,
    goal ? `Obiettivo: ${goal}` : null,
    difficulty ? `Difficoltà dichiarate: ${difficulty}` : null,
    "",
    "Scheda riassuntiva:",
    briefSnippet,
    "",
    "Log chat recenti:",
    logSummary,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `Sei un coach didattico di Theoremz. Analizza le informazioni e produci consigli per i genitori.
Requisiti:
- linguaggio italiano, tono positivo ma diretto;
- non citare il nome dello studente, parla di "tuo figlio" o "ragazzo/ragazza";
- concentra i suggerimenti su verifiche del giorno successivo;
- restituisci SOLO JSON con i campi: focus_points (array massimo 3 voci), study_actions (array massimo 3 voci), motivation (stringa breve), reminders (array opzionale).`;

  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (parseError) {
      console.error("[pre-exam] failed to parse AI response", parseError, raw);
      return null;
    }
  } catch (error) {
    console.error("[pre-exam] AI generation failed", error);
    return null;
  }
}

function composeEmail({
  parentName,
  assessment,
  tipPayload,
  briefMd,
}: {
  parentName?: string | null;
  assessment: any;
  tipPayload: TipPlan;
  briefMd: string | null;
}) {
  const subjectLabel = assessment.subject || "la verifica di domani";
  const dateLabel = formatItalianDate(assessment.when_at);
  const greetingName = parentName?.trim() || "genitori";
  const focusPoints = formatFocusPoints(tipPayload.focus_points);
  const actions = formatActions(tipPayload.study_actions);
  if (!focusPoints.length && !actions.length) return null;
  const motivation = sanitizeOutput(
    tipPayload.motivation || "Siamo qui, scrivici se serve un check veloce.",
    briefMd
  );
  const reminders = formatReminders(tipPayload.reminders);
  const intro = `Ciao ${greetingName},\ndomani (${dateLabel}) è prevista la verifica di ${subjectLabel}. Ti lasciamo qualche idea rapida basata sulla scheda e sugli ultimi confronti.`;

  const sections = [
    intro,
    focusPoints.length
      ? `Priorità da ripassare:\n${focusPoints.map((p) => `• ${p}`).join("\n")}`
      : null,
    actions.length
      ? `Mini-piano per oggi:\n${actions.map((action, idx) => `${idx + 1}. ${action}`).join("\n")}`
      : null,
    reminders.length
      ? `Promemoria veloci:\n${reminders.map((r) => `- ${r}`).join("\n")}`
      : null,
    motivation,
    "Un abbraccio,\nTeam Theoremz",
  ].filter(Boolean);

  const text = sections.join("\n\n");
  const html = renderHtmlEmail({
    intro,
    focusPoints,
    actions,
    reminders,
    motivation,
  });
  const preview = truncate(
    `${subjectLabel} ${dateLabel} | ${focusPoints[0] || actions[0] || ""}`.trim(),
    160
  );
  const subject = `Consigli rapidi per ${subjectLabel} (${dateLabel})`;
  return { subject, text, html, preview };
}

function formatFocusPoints(
  points?: Array<string | { title?: string; detail?: string }>
) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => {
      if (!point) return null;
      if (typeof point === "string") return sanitizeOutput(point);
      const title = point.title ? sanitizeOutput(point.title) : null;
      const detail = point.detail ? sanitizeOutput(point.detail) : null;
      return [title, detail].filter(Boolean).join(": ");
    })
    .filter(Boolean) as string[];
}

function formatActions(actions?: string[]) {
  if (!Array.isArray(actions)) return [];
  return actions.map((action) => sanitizeOutput(action)).filter(Boolean);
}

function formatReminders(reminders?: string[]) {
  if (!Array.isArray(reminders)) return [];
  return reminders.map((reminder) => sanitizeOutput(reminder)).filter(Boolean);
}

function renderHtmlEmail({
  intro,
  focusPoints,
  actions,
  reminders,
  motivation,
}: {
  intro: string;
  focusPoints: string[];
  actions: string[];
  reminders: string[];
  motivation: string;
}) {
  const block = (title: string, items: string[], ordered = false) => {
    if (!items.length) return "";
    const tag = ordered ? "ol" : "ul";
    const inner = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return `
      <div style="margin:16px 0">
        <p style="margin:0 0 4px;font-weight:600">${escapeHtml(title)}</p>
        <${tag} style="margin:0 0 0 16px;padding:0">${inner}</${tag}>
      </div>
    `;
  };

  return `
    <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.55;color:#0f172a">
      <p>${escapeHtml(intro)}</p>
      ${block("Priorità da ripassare", focusPoints)}
      ${block("Mini-piano per oggi", actions, true)}
      ${block("Promemoria veloci", reminders)}
      <p>${escapeHtml(motivation)}</p>
      <p style="margin-top:24px">Un abbraccio,<br/>Team Theoremz</p>
    </div>
  `;
}

function normalizeTestLog(raw: any) {
  if (!raw || typeof raw !== "object") return null;
  const contacted_at =
    raw.contacted_at || raw.date || new Date().toISOString();
  const body =
    typeof raw.body === "string" && raw.body.trim()
      ? raw.body.trim()
      : raw.summary || "Nota di prova.";
  return {
    student_id: "test-student",
    contacted_at,
    body,
    source: raw.source || "test_payload",
    author_label: raw.author_label || raw.author || "tester",
  };
}

function defaultBriefMock(parentName: string) {
  const today = new Date().toLocaleDateString("it-IT");
  return `STUDENTE BLACK — Brief di prova

Contatti
Genitore: ${parentName} — +39 333 0000000 — famiglia@example.com
Studente: studente@example.com

Obiettivo
Portare matematica e fisica sopra il 7 entro fine quadrimestre.

Focus
Algebra, problemi con testi lunghi, gestione del tempo in verifica.

Stato
Readiness: 58/100
Rischio: yellow
Prossima verifica: Matematica — domani

Ultime note
- 2 giorni fa: consegnata scheda esercizi con qualche incertezza sulle disequazioni.
- Settimana scorsa: coach suggerisce di ripassare teoria sui sistemi.

Aggiornato: ${today}`;
}

function formatLogsForPrompt(logs: any[]) {
  if (!logs?.length) return "Nessun log negli ultimi 30 giorni.";
  return logs
    .slice(0, 8)
    .map((log) => {
      const when = log.contacted_at
        ? formatDateTime(log.contacted_at)
        : "data sconosciuta";
      const body = log.body ? truncate(log.body, 280) : "—";
      const author = log.author_label ? ` (${log.author_label})` : "";
      return `- ${when}${author}: ${body}`;
    })
    .join("\n");
}

function formatItalianDate(dateStr: string) {
  if (!dateStr) return "domani";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, max = 4000) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function extractEmails(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter((item) => /\S+@\S+\.\S+/.test(item));
}

function buildAssessmentToken(id: string) {
  return `[assessment:${id}]`;
}

function extractAssessmentToken(body: string) {
  const match = body.match(/\[assessment:[^)]+]/);
  return match ? match[0] : null;
}

function sanitizeOutput(text?: string, brief?: string | null) {
  if (!text) return "";
  const studentName = brief ? extractStudentName(brief) : null;
  let result = text.trim();
  if (studentName) {
    try {
      const escaped = studentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "gi"), "tuo figlio");
    } catch {
      // ignore regex issues
    }
  }
  return result;
}

function extractStudentName(brief: string) {
  const firstLine = brief.split("\n").find((line) => line.trim());
  if (!firstLine) return null;
  return firstLine.split("—")[0]?.trim() || null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
