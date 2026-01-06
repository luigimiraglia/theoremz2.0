import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebaseAdmin";
import { supabaseServer } from "@/lib/supabase";

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

type PersonalizedInsights = {
  tips: string[];
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
  const planPitch = buildPlanPitch({ plan, quiz, responses });
  const insights = buildPersonalizedInsights({ quiz, responses });
  const quizLabel = getQuizLabel(quiz);
  let submittedAtReadable = submittedAtIso;
  try {
    submittedAtReadable = new Date(submittedAtIso).toLocaleString("it-IT", { timeZone: "Europe/Rome" });
  } catch {
    submittedAtReadable = submittedAtIso;
  }
  const whatsapp = buildWhatsAppMessage({
    quizLabel,
    quiz,
    phone,
    plan,
    insights,
    planPitch,
  });

  try {
    await logQuizLead({
      quiz,
      quizLabel,
      phone,
      plan,
      planPitch,
      responses,
      submittedAtIso,
    });
  } catch (error) {
    console.error("quiz-report lead log error", error);
  }

  const textLines = [
    `Quiz: ${quizLabel}`,
    `Telefono: ${phone}`,
    whatsapp.link ? `WhatsApp: ${whatsapp.link}` : null,
    plan.name ? `Piano suggerito: ${plan.name}` : null,
    plan.highlight ? `Highlight: ${plan.highlight}` : null,
    plan.description ? `Descrizione: ${plan.description}` : null,
    planPitch,
    `Inviato: ${submittedAtReadable}`,
    "",
    ...(insights.tips.length
      ? ["", "Consigli pratici:", ...insights.tips.map((tip, index) => `${index + 1}. ${tip}`)]
      : []),
    whatsapp.message ? ["", "Messaggio WhatsApp suggerito:", whatsapp.message].join("\n") : null,
  ].filter(Boolean) as string[];

  const text = textLines.join("\n");

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.65;color:#111827">
      <p style="margin:0 0 8px"><strong>Quiz:</strong> ${escapeHtml(quizLabel)}</p>
      <p style="margin:0 0 8px"><strong>Telefono:</strong> ${escapeHtml(phone)}</p>
      ${
        whatsapp.link
          ? `<p style="margin:0 0 12px"><strong>WhatsApp:</strong> <a href="${escapeHtml(
              whatsapp.link,
            )}" style="color:#0ea5e9;text-decoration:none">Apri chat con messaggio precompilato</a></p>`
          : ""
      }
      ${plan.name ? `<p style="margin:0 0 8px"><strong>Piano suggerito:</strong> ${escapeHtml(plan.name)}</p>` : ""}
      ${plan.highlight ? `<p style="margin:0 0 8px"><strong>Highlight:</strong> ${escapeHtml(plan.highlight)}</p>` : ""}
      ${plan.description ? `<p style="margin:0 0 8px"><strong>Descrizione:</strong> ${escapeHtml(plan.description)}</p>` : ""}
      ${planPitch ? `<p style="margin:0 0 12px;color:#0f172a">${escapeHtml(planPitch)}</p>` : ""}
      <p style="margin:0 0 12px;color:#4b5563"><strong>Inviato:</strong> ${escapeHtml(submittedAtReadable)}</p>
      ${
        insights.tips.length
          ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
             <p style="margin:0 0 8px"><strong>Consigli pratici:</strong></p>
             <ul style="margin:0;padding-left:18px;color:#111827">${insights.tips
               .map((tip) => `<li style="margin-bottom:6px">${escapeHtml(tip)}</li>`)
               .join("")}</ul>`
          : ""
      }
      ${
        whatsapp.message
          ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
             <p style="margin:0 0 8px"><strong>Messaggio WhatsApp suggerito:</strong></p>
             <pre style="margin:0;background:#f1f5f9;border-radius:12px;padding:12px;font-family:ui-monospace,Menlo,Consolas,'Liberation Mono',monospace;white-space:pre-wrap">${escapeHtml(
               whatsapp.message,
             )}</pre>`
          : ""
      }
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

    // L'invio automatico del template info su WhatsApp dopo il quiz è disattivato.

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

function buildPlanPitch({
  plan,
  quiz,
  responses,
}: {
  plan: PlanInfo;
  quiz: QuizKind;
  responses: QuizResponse[];
}) {
  const name = plan.name?.trim() || "Theoremz Black";
  const targetLabel = quiz === "start-genitore" ? "tuo figlio" : "te";
  const outcome = derivePlanOutcome(quiz, responses);
  if (outcome) {
    return `Il nostro piano ${name} porta ${targetLabel} ${outcome}. Dimmi se vuoi attivare subito il percorso o hai altre domande.`;
  }

  const defaultReason =
    quiz === "start-genitore"
      ? "lo seguiamo ogni giorno con tutor, materiali mirati e report chiari"
      : "ti seguiamo ogni giorno con tutor, materiali mirati e report chiari";
  const reason =
    plan.highlight?.trim() ||
    plan.description?.trim() ||
    defaultReason;
  return `Il nostro piano ${name} sarebbe perfetto per ${targetLabel} proprio perché ${reason}. Dimmi se vuoi attivare subito il percorso o hai altre domande.`;
}

function buildWhatsAppMessage({
  quizLabel,
  quiz,
  phone,
  plan,
  insights,
  planPitch,
}: {
  quizLabel: string;
  quiz: QuizKind;
  phone: string;
  plan: PlanInfo;
  insights: PersonalizedInsights;
  planPitch: string;
}): { link: string | null; message: string | null } {
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return { link: null, message: null };

  const templateMessage = buildPlanTemplateMessage({ plan, quiz });
  if (templateMessage) {
    const link = `https://wa.me/${digits}?text=${encodeURIComponent(templateMessage)}`;
    return { link, message: templateMessage };
  }

  const planLine = plan.name
    ? `Percorso suggerito: ${plan.name}${plan.highlight ? ` - ${plan.highlight}` : ""}`
    : null;

  const messageLines = [
    "Ciao! Sono Flavio di Theoremz.",
    `Ho letto il quiz ${quizLabel} e ti mando subito i punti chiave.`,
    planLine,
    insights.tips.length ? "Consigli pratici da provare subito:" : null,
    ...insights.tips.map((tip, index) => `${index + 1}. ${tip}`),
    planPitch,
  ].filter(Boolean) as string[];

  const message = messageLines.join("\n\n");
  const link = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  return { link, message };
}

function derivePlanOutcome(quiz: QuizKind, responses: QuizResponse[]) {
  if (quiz === "start-studente") {
    return deriveStudentOutcomeForPitch(responses);
  }
  if (quiz === "start-genitore") {
    return deriveParentOutcomeForPitch(responses);
  }
  return null;
}

function deriveStudentOutcomeForPitch(responses: QuizResponse[]) {
  const difficulty = getAnswerValue(responses, 0);
  const reaction = getAnswerValue(responses, 1);
  const time = getAnswerValue(responses, 2);
  const support = getAnswerValue(responses, 3);
  const goal = getAnswerValue(responses, 4);

  if (includesAnyNormalized(difficulty, ["teoria", "capire"])) {
    return "dal non sapere come spiegare la teoria al riuscire a rifarla in poche righe prima delle verifiche, perché trasformiamo ogni tuo dubbio in esempi concreti da ripetere";
  }
  if (
    includesAnyNormalized(support, ["risponde subito"]) ||
    includesAnyNormalized(reaction, ["mi blocco", "chiedo"]) ||
    includesAnyNormalized(reaction, ["passo oltre"])
  ) {
    return "dal restare bloccato da solo al ricevere risposte rapide ogni volta che ci mandi una foto, così arrivi alle verifiche già sbloccato";
  }
  if (includesAnyNormalized(difficulty, ["applicare", "esercizi"])) {
    return "dal dover copiare i passaggi degli altri al saper impostare ogni esercizio, perché facciamo allenamento guidato sugli stessi problemi che hai indicato nel quiz";
  }
  if (includesAnyNormalized(difficulty, ["calcoli", "errori"])) {
    return "dal consegnare con errori di distrazione al chiudere gli esercizi sapendo già dove correggere i calcoli critici";
  }
  if (includesAnyNormalized(time, ["meno", "2-4"])) {
    return "dal trovare solo ritagli di tempo al sapere esattamente quali tre esercizi fare e ricevere conferma che li hai svolti bene";
  }
  if (includesAnyNormalized(goal, ["recuperare", "passare"])) {
    return "dal rincorrere insufficienze al presentarti sereno alle prossime verifiche, perché lavoriamo prima sulle due lacune più urgenti";
  }
  if (
    includesAnyNormalized(goal, ["sicuri", "voti", "alti"]) ||
    includesAnyNormalized(goal, ["migliori", "10"])
  ) {
    return "dal puntare a restare a galla al prepararti per voti alti con esercizi specchio e feedback su misura prima di ogni interrogazione";
  }

  return null;
}

function deriveParentOutcomeForPitch(responses: QuizResponse[]) {
  const attitude = getAnswerValue(responses, 0);
  const blockers = getAnswerValue(responses, 1);
  const time = getAnswerValue(responses, 2);
  const support = getAnswerValue(responses, 3);
  const goal = getAnswerValue(responses, 4);

  if (includesAnyNormalized(attitude, ["disorganizzato", "scoraggia"])) {
    return "dal doverlo rincorrere ogni giorno al sapere che ha micro sessioni guidate e un tutor che vi aggiorna senza stress";
  }
  if (includesAnyNormalized(blockers, ["teoria"])) {
    return "dal vederlo confuso sulla teoria al sentirlo spiegare gli argomenti con esempi concreti, perché glieli prepariamo sui dubbi che ci avete segnalato";
  }
  if (
    includesAnyNormalized(blockers, ["qualcuno"]) ||
    includesAnyNormalized(support, ["chat"])
  ) {
    return "dal dover aspettare la prossima lezione al ricevere risposte sul momento quando ci manda una foto, così non accumula ritardi";
  }
  if (includesAnyNormalized(time, ["meno", "2-4"])) {
    return "dal non trovare spazio per studiare al seguire un piano leggero con reminder che gli mantiene il ritmo";
  }
  if (includesAnyNormalized(goal, ["recuperare", "serenità"])) {
    return "dal preoccuparvi per le insufficienze al vedere la media risalire con due settimane dedicate alle lacune peggiori";
  }
  if (includesAnyNormalized(goal, ["voti alti", "autonomia"])) {
    return "dal doverlo guidare voi al vederlo lavorare in autonomia con esercizi sfidanti e report che vi arrivano ogni settimana";
  }

  return null;
}

function getAnswerValue(responses: QuizResponse[], index: number) {
  return (responses[index]?.answer || "").toLowerCase();
}

function includesAnyNormalized(value: string, tokens: string[]) {
  if (!value) return false;
  const normalized = value.replace(/–/g, "-").toLowerCase();
  return tokens.some((token) => normalized.includes(token.replace(/–/g, "-").toLowerCase()));
}

async function logQuizLead({
  quiz,
  quizLabel,
  phone,
  plan,
  planPitch,
  responses,
  submittedAtIso,
}: {
  quiz: QuizKind;
  quizLabel: string;
  phone: string;
  plan: PlanInfo;
  planPitch: string;
  responses: QuizResponse[];
  submittedAtIso: string;
}) {
  const doc = {
    quiz,
    quizLabel,
    phone,
    planName: plan.name ?? null,
    planDescription: plan.description ?? null,
    planHighlight: plan.highlight ?? null,
    planPitch,
    responses,
    submittedAt: submittedAtIso,
    createdAt: Date.now(),
    source: "quiz-report",
  };

  await adminDb.collection("quiz_leads").add(doc);

  // Inserisci/aggiorna anche nella tabella manual_leads (Supabase) per il follow-up automatico
  if (quiz === "start-studente") {
    try {
      await upsertManualLeadFromQuiz({ phone, quizLabel, planName: plan?.name });
    } catch (err) {
      console.error("quiz-report manual_leads sync error", err);
    }
  }
}

const FOLLOWUP_STEPS_DAYS = [1, 2, 7, 30];

function normalizePhone(raw?: string | null) {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "").trim();
  const digits = compact.replace(/\D/g, "");
  if (!digits) return null;
  if (compact.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00") && digits.length > 2) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function computeNextFollowUp(stepIndex: number, from: Date) {
  const offset = FOLLOWUP_STEPS_DAYS[stepIndex];
  if (offset === undefined) return null;
  return addDays(from, offset);
}

async function upsertManualLeadFromQuiz({
  phone,
  quizLabel,
  planName,
}: {
  phone: string;
  quizLabel: string;
  planName?: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return;

  const db = supabaseServer();
  const now = new Date();
  const nextFollowUp = computeNextFollowUp(0, now);
  const noteParts = [`Quiz: ${quizLabel}`];
  if (planName) noteParts.push(`Piano: ${planName}`);
  const note = noteParts.join(" • ").slice(0, 220);

  // Se esiste già, riattiva e resetta il follow-up
  const { data: existing, error: fetchErr } = await db
    .from("manual_leads")
    .select("id, status")
    .eq("whatsapp_phone", normalizedPhone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (existing?.id) {
    const { error: updateErr } = await db
      .from("manual_leads")
      .update({
        whatsapp_phone: normalizedPhone,
        channel: "whatsapp",
        status: "active",
        current_step: 0,
        next_follow_up_at: nextFollowUp ? nextFollowUp.toISOString() : null,
        last_contacted_at: null,
        completed_at: null,
        note,
      })
      .eq("id", existing.id);
    if (updateErr) throw updateErr;
    return;
  }

  const { error: insertErr } = await db.from("manual_leads").insert({
    full_name: null,
    whatsapp_phone: normalizedPhone,
    instagram_handle: null,
    channel: "whatsapp",
    status: "active",
    current_step: 0,
    next_follow_up_at: nextFollowUp ? nextFollowUp.toISOString() : null,
    note,
  });
  if (insertErr) throw insertErr;
}

function buildPlanTemplateMessage({ plan, quiz }: { plan: PlanInfo; quiz: QuizKind }) {
  const planName = plan.name?.toLowerCase() || "";
  const isParent = quiz === "start-genitore";
  if (planName.includes("mentor")) {
    return buildMentorTemplate(isParent);
  }
  if (planName.includes("black")) {
    return buildBlackTemplate(isParent);
  }
  return null;
}

function buildBlackTemplate(isParent: boolean) {
  if (isParent) {
    return [
      "Ciao! Sono Flavio di Theoremz.",
      "Ho letto il quiz di tuo figlio e ti mando subito i punti chiave per sbloccare il suo studio.",
      "",
      "Percorso suggerito: Theoremz Black - lezioni guidate, esercizi mirati e supporto continuo per lui.",
      "",
      "Consigli pratici da provare subito:",
      "",
      "- Tuo figlio deve studiare per esempi, non per pagine. Ogni argomento va fissato con un suo esempio scritto in due righe: così resta lucido anche sotto verifica.",
      "- Mini allenamenti quotidiani: venti minuti al giorno bastano se sono mirati. Un esercizio facile, uno medio e uno di ragionamento per allenare metodo e sicurezza.",
      "- Error log personale: chiedigli di appuntare ogni errore e il perché. In cinque giorni crea la sua guida privata di errori risolti.",
      "- Fase bonus: quando si sente sicuro su un argomento, fammi correggere un esercizio \"oltre\". È lì che capisce di essere davvero pronto.",
      "",
      "Con Theoremz Black tuo figlio ha tutto questo già organizzato: lezioni, esercizi e feedback ogni settimana con un metodo costruito per farlo andare più veloce.",
      "",
      "Prima di dirti se Mentor è la soluzione giusta, ti faccio una domanda veloce:",
      "qual è l’argomento che ti fa perdere più punti nelle verifiche?",
    ].join("\n");
  }

  return [
    "Ciao! Sono Flavio di Theoremz.",
    "Ho letto il tuo quiz e ti mando subito i punti chiave per sbloccare lo studio.",
    "",
    "Percorso suggerito: Theoremz Black - lezioni guidate, esercizi mirati e supporto continuo.",
    "",
    "Consigli pratici da provare subito:",
    "",
    "- Studia per esempi, non per pagine. Ogni argomento fissalo con un tuo esempio scritto in due righe: così resti lucido anche sotto verifica.",
    "- Mini allenamenti quotidiani: venti minuti al giorno bastano se sono mirati. Un esercizio facile, uno medio e uno di ragionamento.",
    "- Error log personale: appunta ogni errore e il perché. In cinque giorni crei la tua guida privata di errori risolti.",
    "- Fase bonus: quando ti senti sicuro su un argomento, fammi correggere un esercizio \"oltre\". È lì che capisci di essere davvero pronto.",
    "",
    "Con Theoremz Black hai tutto questo già organizzato: lezioni, esercizi e feedback ogni settimana, con un metodo costruito per farti andare più veloce.",
    "",
    "Prima di dirti se Mentor è la soluzione giusta, ti faccio una domanda veloce:",
    "qual è l’argomento che ti fa perdere più punti nelle verifiche?",
  ].join("\n");
}

function buildMentorTemplate(isParent: boolean) {
  if (isParent) {
    return [
      "Ciao! Sono Flavio di Theoremz.",
      "Ho analizzato il quiz di tuo figlio e ti riassumo subito i punti strategici.",
      "",
      "Percorso suggerito: Theoremz Mentor - lezioni 1:1, percorso su misura e revisione costante.",
      "",
      "Azioni ad alto impatto da iniziare subito:",
      "",
      "- Fagli spiegare ad alta voce quello che sta studiando. Se riesce a insegnarlo in trenta secondi, l'ha davvero capito.",
      "- Cambia un solo dato negli esercizi che ha già fatto: così allena il ragionamento e non la memoria.",
      "- Ogni volta che sbaglia, chiedigli di scrivere in due righe cosa pensava. È il modo più rapido per correggere il processo mentale.",
      "- Ogni due settimane fate una verifica simulata corretta insieme finché i voti veri diventano prevedibili.",
      "",
      "Il programma Mentor è pensato per chi vuole risultati visibili e un metodo personale, non standard.",
      "",
      "Prima di dirti se Black è la soluzione giusta, ti faccio una domanda veloce:",
      "qual è l’argomento che ti fa perdere più punti nelle verifiche?",
    ].join("\n");
  }

  return [
    "Ciao! Sono Flavio di Theoremz.",
    "Ho analizzato il tuo quiz e ti riassumo subito i punti strategici.",
    "",
    "Percorso suggerito: Theoremz Mentor - lezioni 1:1, percorso su misura e revisione costante.",
    "",
    "Azioni ad alto impatto da iniziare subito:",
    "",
    "- Spiega ad alta voce. Se riesci a insegnarlo in trenta secondi, l'hai davvero capito.",
    "- Cambia un solo dato. Prendi un esercizio fatto e modifica un numero: alleni il ragionamento, non la memoria.",
    "- Racconta l'errore. Ogni volta che sbagli, scrivi in due righe cosa pensavi: è il modo più rapido per correggere il processo mentale.",
    "- Verifica simulata. Ogni due settimane una prova reale, corretta insieme, finché i voti veri diventano prevedibili.",
    "",
    "Il programma Mentor è pensato per chi vuole risultati visibili e un metodo personale, non standard.",
    "",
    "Prima di dirti se Black è la soluzione giusta, ti faccio una domanda veloce:",
    "qual è l’argomento che ti fa perdere più punti nelle verifiche?",
  ].join("\n");
}

function buildPersonalizedInsights({
  quiz,
  responses,
}: {
  quiz: QuizKind;
  responses: QuizResponse[];
}): PersonalizedInsights {
  if (quiz === "start-studente") {
    return buildStudentInsights(responses);
  }
  if (quiz === "start-genitore") {
    return buildParentInsights(responses);
  }
  return buildGenericInsights();
}

function buildStudentInsights(responses: QuizResponse[]): PersonalizedInsights {
  const getAnswer = (index: number) => responses[index]?.answer || "";
  const difficulty = getAnswer(0).toLowerCase();
  const reaction = getAnswer(1).toLowerCase();
  const time = getAnswer(2).toLowerCase();
  const support = getAnswer(3).toLowerCase();
  const goal = getAnswer(4).toLowerCase();

  const tips: string[] = [];
  const addTip = (tip: string) => {
    if (tip && !tips.includes(tip)) tips.push(tip);
  };
  if (includesAnyNormalized(difficulty, ["teoria", "capire"])) {
    addTip("Scrivi in due righe la definizione e inventa un esempio tuo prima di aprire il libro: se ti riesce senza guardare hai già fissato la teoria.");
  }
  if (includesAnyNormalized(difficulty, ["applicare", "esercizi"])) {
    addTip("Prima di partire fai lo schema 'dato → formula → passaggi'. Se uno step non torna segnalo con un punto interrogativo e mandamelo: ti rispondo su quello.");
  }
  if (includesAnyNormalized(difficulty, ["calcoli", "errori"])) {
    addTip("Quando finisci rifai solo i calcoli al contrario con penna diversa così scovi subito segni o frazioni sbagliate.");
  }
  if (
    includesAnyNormalized(difficulty, ["concentrato", "organizzato"]) ||
    includesAnyNormalized(reaction, ["mi blocco", "passo oltre"])
  ) {
    addTip("Lavora a cicli da dodici minuti e negli ultimi trenta secondi registra un audio in cui spieghi cosa hai fatto: riascoltandolo capisci dove perdi il filo.");
  }
  if (includesAnyNormalized(time, ["meno", "2-4"])) {
    addTip("Se hai poco tempo prepara un mini kit: un esercizio base, uno medio e un recap di due righe da girarmi. Meglio di un'ora senza obiettivo.");
  }
  if (
    includesAnyNormalized(support, ["risponde subito"]) ||
    includesAnyNormalized(reaction, ["chiedo", "mi blocco"])
  ) {
    addTip("Quando ti blocchi fai foto, cerchia il punto e scrivi 'bloccato perché...': ti mando subito audio o screenshot sul passaggio giusto.");
  }
  if (includesAnyNormalized(support, ["da solo"])) {
    addTip("Chiudi ogni esercizio salvando il passaggio chiave in un documento 'trucchi': rileggerlo prima della verifica richiede un minuto.");
  }
  if (includesAnyNormalized(support, ["insegnante", "passo"])) {
    addTip("In call uno a uno ripartiamo dall'ultima verifica, rifacciamo un esercizio gemello e ti lascio lo schema per i prossimi due giorni.");
  }
  if (includesAnyNormalized(goal, ["recuperare", "passare"])) {
    addTip("La prima settimana rifacciamo i due argomenti insufficienti cambiando i numeri e mi mandi l'audio di come li imposti.");
  } else if (includesAnyNormalized(goal, ["sicuri", "voti", "alti"])) {
    addTip("Quarantotto ore prima della verifica fai tre esercizi specchio e registri un audio di un minuto sui passaggi: ti dico io dove stringere.");
  } else if (includesAnyNormalized(goal, ["migliori", "10"])) {
    addTip("Quando il programma base è chiaro ti passo un esercizio 'oltre' così la verifica reale ti sembra più semplice.");
  }

  if (!tips.length) {
    addTip("Ti aiuto a scegliere due esercizi mirati e a mandarmi il recap: zero tempo perso, solo progressi concreti.");
  }

  return { tips: tips.slice(0, 4) };
}

function buildParentInsights(responses: QuizResponse[]): PersonalizedInsights {
  const getAnswer = (index: number) => responses[index]?.answer || "";
  const attitude = getAnswer(0).toLowerCase();
  const blockers = getAnswer(1).toLowerCase();
  const time = getAnswer(2).toLowerCase();
  const support = getAnswer(3).toLowerCase();
  const goal = getAnswer(4).toLowerCase();

  const tips: string[] = [];
  const addTip = (tip: string) => {
    if (tip && !tips.includes(tip)) tips.push(tip);
  };
  if (includesAnyNormalized(attitude, ["si impegna", "fatica"])) {
    addTip("Quando chiude un esercizio fatevi raccontare in trenta secondi cosa ha capito e registrate l'audio: se non riesce interveniamo subito.");
  }
  if (includesAnyNormalized(attitude, ["disorganizzato", "scoraggia"])) {
    addTip("La domenica fate foto al diario e create semaforo verde, giallo e rosso sugli argomenti: uso quel quadro per programmare i check in chat.");
  }
  if (includesAnyNormalized(attitude, ["dubbi"])) {
    addTip("Appena spunta un dubbio fateci avere la foto con il punto evidenziato: rispondo io così non resta fermo fino alla prossima lezione.");
  }
  if (includesAnyNormalized(attitude, ["bravo", "stimolato"])) {
    addTip("Inseriamo esercizi challenge e gli mando feedback vocale per farlo sentire davvero stimolato.");
  }
  if (includesAnyNormalized(blockers, ["teoria"])) {
    addTip("Prima di studiare lo faccio riscrivere definizione più esempio reale; se non gli viene uso metafore quotidiane e ve le giro.");
  }
  if (includesAnyNormalized(blockers, ["collegare"])) {
    addTip("Lavoriamo con coppie di problemi 'gemelli' per mostrargli come cambia il ragionamento quando cambiano solo i numeri.");
  }
  if (
    includesAnyNormalized(blockers, ["qualcuno"]) ||
    includesAnyNormalized(support, ["chat"])
  ) {
    addTip("Il tutor risponde ogni giorno con note vocali e screenshot, quindi non deve aspettare la lezione successiva per sbloccarsi.");
  }
  if (includesAnyNormalized(blockers, ["fiducia", "metodo"])) {
    addTip("Trasformiamo ogni piccolo successo in una nota vocale che gli fate riascoltare il giorno della verifica per alzare la fiducia.");
  }
  if (includesAnyNormalized(time, ["meno", "2-4"])) {
    addTip("Inseriamo micro slot da quindici minuti dopo pranzo o cena con reminder WhatsApp per non perdere il ritmo.");
  }
  if (includesAnyNormalized(support, ["autonomia"])) {
    addTip("Gli diamo un playbook passo passo e un tutor digitale: a voi basta chiedere 'hai mandato il recap a Flavio?' per tenerlo responsabile.");
  }
  if (includesAnyNormalized(support, ["videolezione", "insegnante"])) {
    addTip("Ha un mentor fisso, sempre la stessa persona, e ricevete un recap scritto subito dopo la call.");
  }
  if (includesAnyNormalized(goal, ["recuperare", "serenità"])) {
    addTip("Le prime due settimane lavoriamo solo sulle lacune peggiori e ogni venerdì vi mando screenshot della media aggiornata.");
  } else if (includesAnyNormalized(goal, ["sicurezza", "costanza"])) {
    addTip("Prima di ogni verifica ricevete un report semaforo per capire se è pronto o serve ancora una spinta.");
  } else if (includesAnyNormalized(goal, ["voti alti", "autonomia"])) {
    addTip("Quando supera l'otto inseriamo esercizi challenge e lui registra un video di come li risolve per consolidare l'autonomia.");
  }

  if (!tips.length) {
    addTip("Allineiamo tutor, studente e famiglia con obiettivi chiari e report vocali così non ci sono sorprese.");
  }

  return { tips: tips.slice(0, 4) };
}

function buildGenericInsights(): PersonalizedInsights {
  return {
    tips: [
      "Ti mando schema e esercizi gemelli appena ci scrivi, così non resti fermo ore sullo stesso dubbio.",
      "Ogni settimana chiudiamo con un recap vocale su risultati e prossimi passi, così sai sempre dove stai andando.",
    ],
  };
}
