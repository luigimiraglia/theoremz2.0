import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebaseAdmin";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const CONTACT_TO = process.env.CONTACT_TO || GMAIL_USER;

type PersonaKind = "start-studente" | "start-genitore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error("stripe webhook not configured");
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error: any) {
    console.error("stripe webhook signature error", error?.message || error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch (error) {
    console.error("stripe webhook handler error", error);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (!stripe) return;

  const hydratedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product"],
  });

  const customer = hydratedSession.customer_details;
  const metadata = hydratedSession.metadata || {};
  const lineItem = hydratedSession.line_items?.data?.[0];
  const planName =
    (metadata.planName as string) ||
    (lineItem?.price?.nickname as string) ||
    (typeof lineItem?.price?.product === "object" && lineItem.price.product
      ? (lineItem.price.product as Stripe.Product).name
      : undefined) ||
    lineItem?.description ||
    "Theoremz Black";

  const persona = (metadata.persona || metadata.profile || metadata.role || "").toLowerCase();
  const isParent = persona.includes("parent") || persona.includes("genitore");

  const phone =
    customer?.phone || (metadata.phone as string) || (metadata.whatsapp as string) || null;
  const email = customer?.email || (metadata.email as string) || null;
  const name = customer?.name || (metadata.name as string) || null;
  const amount =
    typeof hydratedSession.amount_total === "number"
      ? formatAmount(hydratedSession.amount_total, hydratedSession.currency)
      : null;

  const whatsappMessage =
    buildPlanTemplateMessage({
      plan: { name: planName },
      quiz: isParent ? "start-genitore" : "start-studente",
    }) || buildFallbackWelcomeMessage(planName, isParent);

  const whatsappLink = phone ? buildWhatsAppLink(phone, whatsappMessage) : null;

  await logSubscription({
    sessionId: session.id,
    planName,
    email,
    phone,
    name,
    amount,
  });

  await sendWelcomeEmail({
    planName,
    email,
    name,
    phone,
    amount,
    whatsappLink,
    whatsappMessage,
  });
}

async function logSubscription({
  sessionId,
  planName,
  email,
  phone,
  name,
  amount,
}: {
  sessionId: string;
  planName: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  amount: string | null;
}) {
  try {
    await adminDb.collection("stripe_subscriptions").doc(sessionId).set(
      {
        planName,
        email,
        phone,
        customerName: name,
        amount,
        createdAt: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("stripe subscription log error", error);
  }
}

async function sendWelcomeEmail({
  planName,
  email,
  name,
  phone,
  amount,
  whatsappLink,
  whatsappMessage,
}: {
  planName: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  amount: string | null;
  whatsappLink: string | null;
  whatsappMessage: string | null;
}) {
  if (!GMAIL_USER || !GMAIL_APP_PASS || !CONTACT_TO) {
    console.error("gmail envs missing, cannot send welcome email");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
  });

  const textLines = [
    "Nuova attivazione Stripe",
    `Piano: ${planName}`,
    name ? `Cliente: ${name}` : null,
    email ? `Email: ${email}` : null,
    phone ? `Telefono: ${phone}` : null,
    amount ? `Importo: ${amount}` : null,
    whatsappLink ? `WhatsApp: ${whatsappLink}` : "WhatsApp: numero non disponibile",
    "",
    whatsappMessage ? "Messaggio suggerito:" : null,
    whatsappMessage || null,
  ].filter(Boolean) as string[];

  const text = textLines.join("\n");
  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.65;color:#111827">
      <p><strong>Nuova attivazione Stripe</strong></p>
      <p><strong>Piano:</strong> ${escapeHtml(planName)}</p>
      ${name ? `<p><strong>Cliente:</strong> ${escapeHtml(name)}</p>` : ""}
      ${email ? `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` : ""}
      ${phone ? `<p><strong>Telefono:</strong> ${escapeHtml(phone)}</p>` : ""}
      ${amount ? `<p><strong>Importo:</strong> ${escapeHtml(amount)}</p>` : ""}
      ${
        whatsappLink
          ? `<p><strong>WhatsApp:</strong> <a href="${escapeHtml(
              whatsappLink,
            )}" style="color:#0ea5e9;text-decoration:none">Apri chat con messaggio precompilato</a></p>`
          : "<p><strong>WhatsApp:</strong> numero non disponibile</p>"
      }
      ${
        whatsappMessage
          ? `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
             <p><strong>Messaggio suggerito:</strong></p>
             <pre style="background:#f1f5f9;border-radius:12px;padding:12px;font-family:ui-monospace,Menlo,Consolas,'Liberation Mono',monospace;white-space:pre-wrap">${escapeHtml(
               whatsappMessage,
             )}</pre>`
          : ""
      }
    </div>
  `;

  await transporter.sendMail({
    from: `Theoremz Attivazioni <${GMAIL_USER}>`,
    to: CONTACT_TO,
    subject: `[Stripe] Nuova attivazione ${planName}`,
    text,
    html,
  });
}

function formatAmount(amount: number, currency?: string | null) {
  if (!currency) return `${(amount / 100).toFixed(2)} ${currency ?? ""}`.trim();
  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function buildPlanTemplateMessage({
  plan,
  quiz,
}: {
  plan: { name?: string | null };
  quiz: PersonaKind;
}) {
  const name = plan.name?.toLowerCase() || "";
  const isParent = quiz === "start-genitore";
  if (name.includes("mentor")) return buildMentorTemplate(isParent);
  if (name.includes("black")) return buildBlackTemplate(isParent);
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
      "Se vuoi iniziare oggi, puoi attivarlo qui: theoremz.com/black",
      "Ti arriva subito l'accesso completo e il piano personalizzato.",
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
    "Se vuoi iniziare oggi, puoi attivarlo qui: theoremz.com/black",
    "Ti arriva subito l'accesso completo e il piano personalizzato.",
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
      "Puoi attivare subito il percorso qui: theoremz.com/mentor",
      "Dopo l'attivazione ti scrivo io per programmare la prima lezione e il piano di studio.",
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
    "Puoi attivare subito il tuo percorso qui: theoremz.com/mentor",
    "Dopo l'attivazione ti scrivo io per programmare la prima lezione e il piano di studio.",
  ].join("\n");
}

function buildFallbackWelcomeMessage(planName: string, isParent: boolean) {
  const audience = isParent ? "tuo figlio" : "te";
  return `Ciao! Sono Flavio di Theoremz. Grazie per aver attivato ${planName}. Ti scrivo a breve per impostare il percorso e mostrarti come aiutiamo ${audience} fin dal primo giorno.`;
}

function buildWhatsAppLink(phone: string, message: string | null) {
  if (!phone || !message) return null;
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
