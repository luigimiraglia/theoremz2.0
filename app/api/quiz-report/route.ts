import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const CONTACT_TO = process.env.CONTACT_TO || GMAIL_USER;

type QuizKind = "start-studente" | "start-genitore" | string;

type QuizResponse = {
  question: string;
  answer: string;
};

type PlanInfo = {
  name?: string;
  description?: string;
  highlight?: string;
};

type QuizPayload = {
  quiz?: QuizKind;
  phone?: string;
  responses?: QuizResponse[];
  plan?: PlanInfo;
  submittedAt?: string;
};

export async function POST(req: Request) {
  if (!GMAIL_USER || !GMAIL_APP_PASS || !CONTACT_TO) {
    return NextResponse.json({ error: "email_not_configured" }, { status: 500 });
  }

  let payload: QuizPayload | null = null;
  try {
    payload = (await req.json()) as QuizPayload;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const quiz = String(payload?.quiz || "start");
  const phone = String(payload?.phone || "").trim().slice(0, 60);
  const submittedAtIso = payload?.submittedAt && !Number.isNaN(Date.parse(payload.submittedAt))
    ? new Date(payload.submittedAt).toISOString()
    : new Date().toISOString();

  if (!phone) {
    return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  }

  const rawResponses = Array.isArray(payload?.responses) ? payload.responses : [];
  const responses = rawResponses
    .map((entry) => ({
      question: typeof entry?.question === "string" ? entry.question.slice(0, 300) : "",
      answer: typeof entry?.answer === "string" ? entry.answer.slice(0, 500) : "",
    }))
    .filter((entry) => entry.question || entry.answer);

  if (!responses.length) {
    return NextResponse.json({ error: "missing_responses" }, { status: 400 });
  }

  const plan: PlanInfo = {
    name:
      typeof payload?.plan?.name === "string" ? payload.plan.name.slice(0, 160) : undefined,
    description:
      typeof payload?.plan?.description === "string"
        ? payload.plan.description.slice(0, 400)
        : undefined,
    highlight:
      typeof payload?.plan?.highlight === "string"
        ? payload.plan.highlight.slice(0, 160)
        : undefined,
  };
  const quizLabel = getQuizLabel(quiz);
  let submittedAtReadable = submittedAtIso;
  try {
    submittedAtReadable = new Date(submittedAtIso).toLocaleString("it-IT", { timeZone: "Europe/Rome" });
  } catch {
    submittedAtReadable = submittedAtIso;
  }

  const textLines = [
    `Quiz: ${quizLabel}`,
    `Telefono: ${phone}`,
    plan.name ? `Piano suggerito: ${plan.name}` : null,
    plan.highlight ? `Highlight: ${plan.highlight}` : null,
    plan.description ? `Descrizione: ${plan.description}` : null,
    `Inviato: ${submittedAtReadable}`,
    "",
    "Risposte:",
    ...responses.map((entry, index) => {
      const answer = entry.answer || "(nessuna risposta)";
      return `${index + 1}. ${entry.question}\n   → ${answer}`;
    }),
  ].filter(Boolean) as string[];

  const text = textLines.join("\n");

  const htmlResponses = responses
    .map(
      (entry, index) => `
        <li style="margin-bottom:12px">
          <p style="margin:0 0 4px"><strong>${index + 1}. ${escapeHtml(entry.question)}</strong></p>
          <p style="margin:0;color:#1f2937">${escapeHtml(entry.answer || "(nessuna risposta)")}</p>
        </li>
      `,
    )
    .join("");

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.65;color:#111827">
      <p style="margin:0 0 8px"><strong>Quiz:</strong> ${escapeHtml(quizLabel)}</p>
      <p style="margin:0 0 8px"><strong>Telefono:</strong> ${escapeHtml(phone)}</p>
      ${plan.name ? `<p style="margin:0 0 8px"><strong>Piano suggerito:</strong> ${escapeHtml(plan.name)}</p>` : ""}
      ${plan.highlight ? `<p style="margin:0 0 8px"><strong>Highlight:</strong> ${escapeHtml(plan.highlight)}</p>` : ""}
      ${plan.description ? `<p style="margin:0 0 8px"><strong>Descrizione:</strong> ${escapeHtml(plan.description)}</p>` : ""}
      <p style="margin:0 0 12px;color:#4b5563"><strong>Inviato:</strong> ${escapeHtml(submittedAtReadable)}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
      <p style="margin:0 0 8px"><strong>Risposte:</strong></p>
      <ol style="margin:0;padding-left:18px;color:#111827">${htmlResponses}</ol>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
    });

    await transporter.sendMail({
      from: `Theoremz Start <${GMAIL_USER}>`,
      to: CONTACT_TO,
      subject: `[Theoremz • Quiz ${quizLabel}] Nuova richiesta report`,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("quiz-report email error", error);
    return NextResponse.json({ error: "email_failed" }, { status: 500 });
  }
}

function getQuizLabel(quiz: QuizKind) {
  if (quiz === "start-genitore") return "Start Genitore";
  if (quiz === "start-studente") return "Start Studente";
  return quiz || "Start";
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
