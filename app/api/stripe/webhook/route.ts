import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import {
  resolveStripeCustomer,
  resolveStripeSubscription,
  syncBlackSubscriptionRecord,
} from "@/lib/black/subscriptionSync";
import { adminDb } from "@/lib/firebaseAdmin";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;
const CONTACT_TO = process.env.CONTACT_TO || GMAIL_USER;
const SUPPORT_WHATSAPP_NUMBER =
  process.env.SUPPORT_WHATSAPP_NUMBER || process.env.WHATSAPP_TUTOR_NUMBER || "3519523641";
const SUPPORT_WHATSAPP_MESSAGE_TEMPLATE =
  process.env.SUPPORT_WHATSAPP_MESSAGE ||
  "Ciao, sono [nome], nuovo abbonato [piano]. Ecco classe, materie e prossime verifiche:";
const SUPPORT_WHATSAPP_DISPLAY =
  process.env.SUPPORT_WHATSAPP_DISPLAY || SUPPORT_WHATSAPP_NUMBER;

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
    expand: ["line_items.data.price.product", "customer"],
  });
  const subscription = await resolveStripeSubscription(stripe, hydratedSession.subscription);
  const stripeCustomer = await resolveStripeCustomer(stripe, hydratedSession.customer);

  const customerDetails = hydratedSession.customer_details;
  const metadata = (hydratedSession.metadata || {}) as Stripe.Metadata;
  const lineItem = hydratedSession.line_items?.data?.[0];
  const planName =
    (metadata.planName as string) ||
    (lineItem?.price?.nickname as string) ||
    (typeof lineItem?.price?.product === "object" && lineItem.price.product
      ? (lineItem.price.product as Stripe.Product).name
      : undefined) ||
    lineItem?.description ||
    "Theoremz Black";
  const productId =
    typeof lineItem?.price?.product === "object"
      ? (lineItem.price.product as Stripe.Product).id
      : (lineItem?.price?.product as string | undefined);

  const persona = (metadata.persona || metadata.profile || metadata.role || "").toLowerCase();
  const isParent = persona.includes("parent") || persona.includes("genitore");

  const phone =
    customerDetails?.phone ||
    (metadata.phone as string) ||
    (metadata.whatsapp as string) ||
    null;
  const email = customerDetails?.email || (metadata.email as string) || null;
  const name = customerDetails?.name || (metadata.name as string) || null;
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

  await syncBlackSubscriptionRecord({
    source: `checkout_session:${session.id}`,
    planName,
    subscription,
    stripeCustomer,
    metadata,
    customerDetails,
    lineItem,
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

  await sendCustomerWelcomeEmail({
    planName,
    productId,
    email,
    name,
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

async function sendCustomerWelcomeEmail({
  planName,
  productId,
  email,
  name,
}: {
  planName: string;
  productId?: string | null;
  email: string | null;
  name: string | null;
}) {
  if (!email) return;
  if (!GMAIL_USER || !GMAIL_APP_PASS) {
    console.error("gmail envs missing, cannot send customer welcome email");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
  });

  const greetingName = name?.split(" ")[0] || name || "Ciao";
  const planCopy = buildCustomerWelcomeCopy(planName, productId ?? undefined);
  const supportContact = buildSupportWhatsAppContact({
    name,
    planTitle: planCopy.title,
  });

  const textLines = planCopy.textTemplate
    ? planCopy.textTemplate({
        greetingName,
        planTitle: planCopy.title,
        supportLink: supportContact.link,
        supportNumber: supportContact.displayNumber,
      })
    : [
        `${greetingName}! Benvenuto/a in ${planCopy.title}.`,
        "",
        planCopy.intro,
        "",
        ...planCopy.bullets.map((b) => `• ${b}`),
        "",
        planCopy.outro,
        supportContact.link
          ? `Puoi contattarci su WhatsApp quando vuoi: ${supportContact.link}`
          : null,
        "",
        "Ti seguiamo noi da qui.",
        "Team Theoremz",
      ].filter(Boolean) as string[];

  const html =
    planCopy.htmlTemplate?.({
      greetingName,
      planTitle: planCopy.title,
      supportLink: supportContact.link,
      supportNumber: supportContact.displayNumber,
      supportTel: supportContact.telHref,
      preheader: planCopy.preheader,
    }) ?? renderDefaultWelcomeHtml({
      greetingName,
      intro: planCopy.intro,
      bullets: planCopy.bullets,
      outro: planCopy.outro,
      supportLink: supportContact.link,
      supportNumber: supportContact.displayNumber,
      supportTel: supportContact.telHref,
    });

  await transporter.sendMail({
    from: `Flavio da Theoremz <${GMAIL_USER}>`,
    to: email,
    subject: planCopy.subject ?? `Benvenuto in ${planCopy.title}!`,
    text: textLines.join("\n"),
    html,
  });
}

type PlanKind =
  | "black-standard"
  | "black-annual"
  | "essential"
  | "mentor-base"
  | "mentor-advanced"
  | "generic";

type PlanCopy = {
  title: string;
  intro: string;
  bullets: string[];
  outro: string;
  subject?: string;
  preheader?: string;
  htmlTemplate?: (ctx: PlanHtmlTemplateContext) => string;
  textTemplate?: (ctx: PlanTextTemplateContext) => string[];
};

type PlanHtmlTemplateContext = {
  greetingName: string;
  planTitle: string;
  supportLink: string | null;
  supportNumber: string | null;
  supportTel?: string | null;
  preheader?: string;
};

type PlanTextTemplateContext = {
  greetingName: string;
  planTitle: string;
  supportLink: string | null;
  supportNumber: string | null;
};

const PRODUCT_KIND_MAP: Record<string, PlanKind> = {
  prod_PIltnHyTuX5Qig: "black-standard", // Theoremz Black Standard
  prod_Plm05qNZgUzhbj: "black-annual", // Theoremz Black Annuale
  prod_Plm5hK5Fvbov68: "essential", // Theoremz Black Essential
  prod_QiU8Zzfp0c4Gh4: "mentor-base", // Theoremz Mentor Base
  prod_QiUDUqYgN517MM: "mentor-advanced", // Theoremz Mentor Avanzato
};

function detectPlanKind(planName: string, productId?: string): PlanKind {
  if (productId && PRODUCT_KIND_MAP[productId]) {
    return PRODUCT_KIND_MAP[productId];
  }
  const normalized = (planName || "").toLowerCase();
  if (normalized.includes("mentor") && normalized.includes("avanz")) return "mentor-advanced";
  if (normalized.includes("mentor")) return "mentor-base";
  if (normalized.includes("annuale")) return "black-annual";
  if (normalized.includes("standard")) return "black-standard";
  if (normalized.includes("black")) return "black-standard";
  if (normalized.includes("essential")) return "essential";
  return "generic";
}

function buildCustomerWelcomeCopy(planName: string, productId?: string): PlanCopy {
  const kind = detectPlanKind(planName, productId);
  const title = planName || "Theoremz";

  switch (kind) {
    case "black-standard":
      return {
        title,
        subject: "Benvenuto in Theoremz Black",
        preheader:
          "Benvenuto in Theoremz Black: ecco come iniziare, le risorse incluse e il tuo tutor su WhatsApp.",
        intro:
          "Hai appena sbloccato Theoremz Black: lezioni guidate, esercizi mirati e tutor che ti seguono ogni settimana.",
        bullets: [
          "Ricevi il piano personalizzato entro 24 ore con gli argomenti da sbloccare per primi.",
          "Accedi alla chat AI Tutor per chiarire dubbi in tempo reale.",
          "Partecipa alle lezioni guidate e invia gli esercizi per la correzione rapida.",
        ],
        outro:
          "Prepara quaderni e domande: iniziamo a lavorare su spiegazioni, metodo ed esercizi già da oggi.",
        htmlTemplate: (ctx) =>
          renderBlackStandardHtmlTemplate({
            ...ctx,
            planTitle: title,
          }),
        textTemplate: ({ greetingName, supportLink, supportNumber }) => {
          const whatsappInstruction = supportLink
            ? `Apri la chat WhatsApp qui: ${supportLink}${
                supportNumber ? ` (salva ${supportNumber})` : ""
              }`
            : null;
          return [
            `${greetingName}! Benvenuto/a in Theoremz Black.`,
            "",
            "Ecco cosa include il tuo abbonamento:",
            "- Accesso completo a lezioni ed esercizi premium.",
            "- Piani di studio personalizzati per le prossime verifiche.",
            "- Correzioni mirate e supporto prioritario ogni settimana.",
            "",
            "Per iniziare:",
            "1. Scrivi al tutor su WhatsApp con nome, classe e date delle verifiche.",
            "2. Ricevi il mini-piano personalizzato per la settimana.",
            "3. Segui le lezioni consigliate e invia gli esercizi per la revisione.",
            "",
            whatsappInstruction,
            "",
            "Se hai bisogno di aiuto con accesso o pagamenti, basta rispondere a questa mail.",
            "Ti seguiamo noi da qui.",
            "Team Theoremz",
          ].filter(Boolean) as string[];
        },
      };
    case "essential":
      return {
        title,
        intro:
          "Benvenuto in Theoremz Essential: libreria di lezioni premium, schede riassuntive e strumenti per studiare in autonomia.",
        bullets: [
          "Sblocchi tutte le lezioni Premium di matematica e fisica con esempi svolti.",
          "Puoi salvare i tuoi argomenti preferiti e ripassarli anche da mobile.",
          "Ogni mese hai una selezione di esercizi guidati extra per verificare se sei pronto.",
        ],
        outro:
          "Ti mando a breve i primi argomenti consigliati in base al quiz iniziale così sai da dove partire.",
        subject: "Benvenuto in Theoremz Black Essential",
        preheader:
          "Benvenuto in Theoremz Black Essential: cosa è incluso e come iniziare subito con il tuo tutor su WhatsApp.",
        htmlTemplate: () =>
          renderEssentialHtmlTemplate({
            preheader:
              "Benvenuto in Theoremz Black Essential: cosa è incluso e come iniziare subito con il tuo tutor su WhatsApp.",
          }),
        textTemplate: ({ greetingName, supportLink, supportNumber }) => {
          const whatsappInstruction = supportLink
            ? `Apri la chat WhatsApp qui: ${supportLink}${
                supportNumber ? ` (salva ${supportNumber})` : ""
              }`
            : supportNumber
              ? `Scrivi al tutor su WhatsApp: ${supportNumber}`
              : null;
          return [
            `${greetingName}! Benvenuto in Theoremz Black Essential.`,
            "",
            "Ecco come partire al meglio:",
            "1. Invia al tutor il calendario delle verifiche e i tuoi obiettivi della settimana.",
            "2. Segui i moduli consigliati e completa gli esercizi chiave.",
            "3. Condividi i dubbi: ricevi esempi risolti e correzioni rapide.",
            "",
            whatsappInstruction,
            "",
            "Per assistenza basta rispondere a questa mail.",
            "Team Theoremz",
          ].filter(Boolean) as string[];
        },
      };
    case "mentor-base":
      return {
        title,
        intro:
          "Benvenuto nel percorso Mentor Base: lezioni 1:1 e un tutor dedicato per costruire metodo e continuità.",
        bullets: [
          "Nelle prossime ore ti scriviamo per fissare la prima call di allineamento.",
          "Prepariamo il piano settimanale con lezioni 1:1 e revisione esercizi.",
          "Ogni verifica viene simulata prima insieme per arrivare sereni al voto vero.",
        ],
        outro:
          "Tieni d'occhio la mail: ti inviamo subito calendario e istruzioni per la prima lezione.",
        subject: "Benvenuto in Theoremz Mentor",
        preheader:
          "Benvenuto in Theoremz Mentor: come funziona il percorso 1:1, cosa è incluso e come fissare la prima sessione.",
        htmlTemplate: () =>
          renderMentorHtmlTemplate({
            preheader:
              "Benvenuto in Theoremz Mentor: come funziona il percorso 1:1, cosa è incluso e come fissare la prima sessione.",
          }),
        textTemplate: ({ greetingName, supportLink, supportNumber }) => {
          const whatsappInstruction = supportLink
            ? `Apri la chat WhatsApp qui: ${supportLink}${
                supportNumber ? ` (salva ${supportNumber})` : ""
              }`
            : supportNumber
              ? `Scrivi al tutor su WhatsApp: ${supportNumber}`
              : null;
          return [
            `${greetingName}! Benvenuto in Theoremz Mentor.`,
            "",
            "Per iniziare:",
            "1. Invia al tutor nome, classe, materie prioritarie e date delle prossime verifiche.",
            "2. Fissiamo la prima sessione di allineamento.",
            "3. Ricevi il piano settimanale personalizzato con lezioni, esercizi e milestone.",
            "",
            whatsappInstruction,
            "",
            "Per qualsiasi dubbio rispondi a questa mail.",
            "Team Theoremz",
          ].filter(Boolean) as string[];
        },
      };
    case "mentor-advanced":
      return {
        title,
        intro:
          "Hai attivato Mentor Avanzato: percorso intensivo, tutor senior e revisione quotidiana.",
        bullets: [
          "Ricevi entro poche ore il piano d'urto con step giornalieri.",
          "Le lezioni 1:1 vengono integrate con feedback asincroni su ogni esercizio chiave.",
          "Monitoriamo voti, verifiche e stress per intervenire prima che si accumuli.",
        ],
        outro:
          "Ti contattiamo a breve per concordare l'orario della prima sessione strategica.",
        subject: "Benvenuto in Theoremz Mentor",
        preheader:
          "Benvenuto in Theoremz Mentor: come funziona il percorso 1:1, cosa è incluso e come fissare la prima sessione.",
        htmlTemplate: () =>
          renderMentorHtmlTemplate({
            preheader:
              "Benvenuto in Theoremz Mentor: come funziona il percorso 1:1, cosa è incluso e come fissare la prima sessione.",
          }),
        textTemplate: ({ greetingName, supportLink, supportNumber }) => {
          const whatsappInstruction = supportLink
            ? `Apri la chat WhatsApp qui: ${supportLink}${
                supportNumber ? ` (salva ${supportNumber})` : ""
              }`
            : supportNumber
              ? `Scrivi al tutor su WhatsApp: ${supportNumber}`
              : null;
          return [
            `${greetingName}! Benvenuto in Theoremz Mentor Avanzato.`,
            "",
            "Il tuo piano intensivo parte così:",
            "- Allineamento immediato su obiettivi e calendario.",
            "- Piano quotidiano con lezioni 1:1 e feedback sugli esercizi.",
            "- Check-in ravvicinati per correggere metodo e stress.",
            "",
            whatsappInstruction,
            "",
            "Ti seguiamo noi da qui.",
            "Team Theoremz",
          ].filter(Boolean) as string[];
        },
      };
    case "black-annual":
      return {
        title,
        intro:
          "Hai scelto Theoremz Black Annuale: un anno intero di lezioni premium, esercizi guidati e supporto quando serve.",
        bullets: [
          "Ricevi il calendario annuale con gli argomenti chiave per stare sempre avanti rispetto al programma.",
          "Ogni mese trovi moduli extra e sessioni intensive per prepararti a verifiche ed esami.",
          "Puoi contare su tutor e chat AI per tutto l'anno, senza limiti.",
        ],
        outro:
          "Sfruttiamo al massimo questi 12 mesi: ti invio a breve la roadmap con i primi step.",
        subject: "Benvenuto in Theoremz Black",
        preheader:
          "Benvenuto in Theoremz Black: ecco come iniziare, le risorse incluse e il tuo tutor su WhatsApp.",
        htmlTemplate: (ctx) =>
          renderBlackStandardHtmlTemplate({
            ...ctx,
            planTitle: title,
          }),
        textTemplate: ({ greetingName, supportLink, supportNumber }) => {
          const whatsappInstruction = supportLink
            ? `Apri la chat WhatsApp qui: ${supportLink}${
                supportNumber ? ` (salva ${supportNumber})` : ""
              }`
            : supportNumber
              ? `Scrivi al tutor su WhatsApp: ${supportNumber}`
              : null;
          return [
            `${greetingName}! Benvenuto/a in ${title}.`,
            "",
            "Hai un anno intero di lezioni, esercizi guidati e supporto prioritario.",
            "Ti invieremo subito la roadmap annuale con gli argomenti da anticipare.",
            "",
            whatsappInstruction,
            "",
            "Prepara domande e calendario verifiche: partiamo subito.",
            "Team Theoremz",
          ].filter(Boolean) as string[];
        },
      };
    default:
      return {
        title,
        intro:
          "Grazie per aver attivato Theoremz. Da questo momento hai accesso completo al percorso e al supporto dei nostri tutor.",
        bullets: [
          "Trovi subito in area riservata le lezioni consigliate.",
          "Puoi scriverci in chat ogni volta che incontri un blocco.",
          "Riceverai aggiornamenti e consigli mirati in base ai tuoi progressi.",
        ],
        outro: "Per qualsiasi dubbio basta rispondere a questa mail.",
      };
  }
}

type SupportContact = {
  link: string | null;
  displayNumber: string | null;
  telHref: string | null;
};

function buildSupportWhatsAppContact({
  name,
  planTitle,
}: {
  name: string | null;
  planTitle: string;
}): SupportContact {
  const digits = SUPPORT_WHATSAPP_NUMBER ? SUPPORT_WHATSAPP_NUMBER.replace(/\D+/g, "") : "";
  if (!digits) return { link: null, displayNumber: null, telHref: null };

  const formatted =
    SUPPORT_WHATSAPP_DISPLAY ||
    formatPhoneNumberForDisplay(digits) ||
    digits.replace(/(\d{3})(?=\d)/g, "$1 ");

  const message = SUPPORT_WHATSAPP_MESSAGE_TEMPLATE.replace(
    /\[nome\]/gi,
    name ?? "studente",
  ).replace(/\[piano\]/gi, planTitle || "Theoremz");

  const link = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  return { link, displayNumber: formatted, telHref: `tel:${digits}` };
}

function formatPhoneNumberForDisplay(input: string) {
  if (!input) return null;
  if (input.length === 10) {
    return `${input.slice(0, 3)} ${input.slice(3, 6)} ${input.slice(6)}`;
  }
  if (input.length === 11) {
    return `${input.slice(0, 3)} ${input.slice(3, 7)} ${input.slice(7)}`;
  }
  return input;
}

function renderDefaultWelcomeHtml({
  greetingName,
  intro,
  bullets,
  outro,
  supportLink,
  supportNumber,
  supportTel,
}: {
  greetingName: string;
  intro: string;
  bullets: string[];
  outro: string;
  supportLink: string | null;
  supportNumber: string | null;
  supportTel?: string | null;
}) {
  const htmlBullets = bullets
    .map((b) => `<li style="margin-bottom:6px">${escapeHtml(b)}</li>`)
    .join("");
  const fallbackTelText =
    supportNumber && supportTel
      ? `Salva il numero e scrivici quando vuoi: <a href="${escapeHtml(
          supportTel,
        )}" style="color:#7c3aed;text-decoration:none">${escapeHtml(
          supportNumber,
        )}</a>.`
      : null;
  let supportBlock = "";
  if (supportLink) {
    supportBlock = `<p style="margin:0 0 12px">Se preferisci puoi scriverci al volo su WhatsApp: <a href="${escapeHtml(
      supportLink,
    )}" style="color:#7c3aed;text-decoration:none">apri la chat</a>${
      supportNumber ? ` (salva ${escapeHtml(supportNumber)})` : ""
    }.${fallbackTelText ? `<br />${fallbackTelText}` : ""}</p>`;
  } else if (fallbackTelText) {
    supportBlock = `<p style="margin:0 0 12px">${fallbackTelText}</p>`;
  }

  return `
    <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.65;color:#0f172a">
      <p style="font-size:16px;margin:0 0 16px">Ciao ${escapeHtml(greetingName)}! 🎉</p>
      <p style="margin:0 0 12px">${escapeHtml(intro)}</p>
      <ul style="padding-left:20px;margin:12px 0 16px">${htmlBullets}</ul>
      <p style="margin:0 0 12px">${escapeHtml(outro)}</p>
      ${supportBlock}
      <p style="margin:24px 0 0">Ti seguiamo noi da qui.<br />Team Theoremz</p>
    </div>
  `;
}

function renderBlackStandardHtmlTemplate({
  planTitle,
  supportLink,
  supportNumber,
  supportTel,
  preheader,
}: PlanHtmlTemplateContext) {
  const effectivePlanTitle = planTitle || "Theoremz Black";
  const defaultWhatsappLink =
    "https://wa.me/3519523641?text=Ciao%2C%20sono%20%5BNome%5D%2C%20nuovo%20abbonato%20Theoremz%20Black.%20Ecco%20classe%2C%20materie%20e%20date%20delle%20prossime%20verifiche%3A%20%5Bscrivi%20qui%5D.";
  const resolvedLink = supportLink || defaultWhatsappLink;
  const resolvedTelNumber = supportNumber || "351\u00A0952\u00A03641";
  const resolvedTelHref = supportTel || "tel:3519523641";

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Benvenuto in ${escapeHtml(effectivePlanTitle)}</title>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#f6f8fb; }
    @media (prefers-color-scheme: dark) {
      body { background:#0b1220; }
    }
    a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  </style>
</head>
<body style="margin:0; padding:0; background:#f6f8fb;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${escapeHtml(
      preheader ||
        "Benvenuto in Theoremz Black: ecco come iniziare, le risorse incluse e il tuo tutor su WhatsApp.",
    )}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f8fb;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(16,24,40,.06);">
          <tr>
            <td style="background:#1e3a8a; padding:24px 28px;">
              <table width="100%" role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:18px; line-height:1.2; color:#e5edff; letter-spacing:.2px; font-weight:600;">
                      Theoremz<span style="opacity:.85;">&nbsp;Black</span>
                    </div>
                  </td>
                  <td align="right">
                    <div style="width:10px;height:10px;border-radius:50%;background:#93c5fd;display:inline-block;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <h1 style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:24px; line-height:1.3; color:#0b1220;">
                Benvenuto in Theoremz Black 🎓
              </h1>
              <p style="margin:12px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#334155;">
                Siamo felici di averti con noi. Qui trovi cosa include l’abbonamento e i prossimi passi per partire subito.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 0 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#0b1220;">
                Cosa include Theoremz Black
              </h2>
              <ul style="margin:0 0 0 18px; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.8; color:#475569;">
                <li>Accesso completo alle lezioni e agli esercizi premium.</li>
                <li>Percorso guidato per verifiche ed esami con piani di studio personalizzati.</li>
                <li>Correzioni mirate e feedback pratici per migliorare velocemente.</li>
                <li>Supporto prioritario e risorse aggiornate ogni settimana.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 10px 28px;">
              <div style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#334155;">
                Per iniziare subito, scrivi al tuo tutor su WhatsApp. Presentati con <em>nome</em>, <em>scuola/classe</em> e <em>prossime verifiche</em>.
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="border-radius:10px; background:#1e3a8a;">
                    <a href="${escapeHtml(
                      resolvedLink,
                    )}"
                       style="display:inline-block; padding:12px 18px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.2; color:#ffffff; text-decoration:none; font-weight:600;">
                      Apri la chat WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin:10px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#64748b;">
                Se il bottone non funziona, salva il numero del tutor e scrivigli su WhatsApp:
                <a href="${escapeHtml(resolvedTelHref)}" style="color:#1e3a8a; text-decoration:underline;">${escapeHtml(
                  resolvedTelNumber,
                )}</a>.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 0 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; color:#0b1220;">
                Prossimi passi consigliati
              </h2>
              <ol style="margin:0 0 0 18px; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.9; color:#475569;">
                <li>Invia al tutor il calendario delle prossime verifiche.</li>
                <li>Ricevi il mini-piano personalizzato per questa settimana.</li>
                <li>Segui le lezioni consigliate e completa gli esercizi mirati.</li>
                <li>Condividi i tuoi dubbi: rispondiamo con esempi e correzioni chiare.</li>
              </ol>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 8px 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; color:#0b1220;">
                Supporto e fatturazione
              </h2>
              <p style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.7; color:#475569;">
                Hai bisogno di aiuto con l’accesso o i pagamenti? Scrivici su WhatsApp al numero sopra.
                Le ricevute dell’abbonamento sono disponibili nell’area personale.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:8px 0 0 0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;">
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#94a3b8;">
                Ricevi questa email perché hai attivato Theoremz Black. Questo messaggio è transazionale.
              </p>
              <p style="margin:6px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#94a3b8;">
                © Theoremz. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function renderMentorHtmlTemplate({
  preheader,
}: {
  preheader?: string;
}) {
  const whatsappLink =
    "https://wa.me/3519523641?text=Ciao%2C%20sono%20%5BNome%5D%2C%20nuovo%20iscritto%20a%20Theoremz%20Mentor.%20Ecco%20classe%2Fscuola%2C%20materie%20prioritarie%20e%20date%20delle%20prossime%20verifiche%3A%20%5Bscrivi%20qui%5D.%20Quando%20possiamo%20fare%20la%20prima%20sessione%3F";
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Benvenuto in Theoremz Mentor</title>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#f6f8fb; }
    @media (prefers-color-scheme: dark) { body { background:#0b1220; } }
    a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  </style>
</head>
<body style="margin:0; padding:0; background:#f6f8fb;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${escapeHtml(
      preheader ||
        "Benvenuto in Theoremz Mentor: come funziona il percorso 1:1, cosa è incluso e come fissare la prima sessione.",
    )}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f8fb;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
               style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(16,24,40,.06);">
          <tr>
            <td style="background:#1e3a8a; padding:24px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                                font-size:18px; line-height:1.2; color:#e5edff; letter-spacing:.2px; font-weight:600;">
                      Theoremz <span style="opacity:.85;">Mentor</span>
                    </div>
                  </td>
                  <td align="right">
                    <div style="width:10px;height:10px;border-radius:50%;background:#93c5fd;display:inline-block;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <h1 style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                         font-size:24px; line-height:1.3; color:#0b1220;">
                Benvenuto in Theoremz Mentor
              </h1>
              <p style="margin:12px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                        font-size:15px; line-height:1.6; color:#334155;">
                Inizia il tuo percorso personalizzato 1:1: qui sotto trovi cosa è incluso e i prossimi passi per fissare la prima sessione.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 0 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                         font-size:16px; line-height:1.5; color:#0b1220;">
                Cosa include Mentor
              </h2>
              <ul style="margin:0 0 0 18px; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                         font-size:14px; line-height:1.8; color:#475569;">
                <li>Lezioni individuali online con tutor dedicato.</li>
                <li>Percorso su misura per i tuoi obiettivi, con piano settimanale.</li>
                <li>Correzioni mirate di esercizi, verifiche e metodo di studio.</li>
                <li>Check-in periodici, monitoraggio dei progressi e aggiustamenti rapidi.</li>
                <li>Accesso prioritario alle risorse premium Theoremz.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 10px 28px;">
              <div style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                          font-size:14px; line-height:1.6; color:#334155;">
                Per fissare la prima sessione, apri WhatsApp e invia al tutor: <em>nome</em>, <em>scuola/classe</em>,
                <em>materie prioritarie</em> e <em>date delle prossime verifiche</em>.
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="border-radius:10px; background:#1e3a8a;">
                    <a href="${escapeHtml(
                      whatsappLink,
                    )}"
                       style="display:inline-block; padding:12px 18px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                              font-size:14px; line-height:1.2; color:#ffffff; text-decoration:none; font-weight:600;">
                      Apri la chat WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin:10px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                          font-size:12px; line-height:1.6; color:#64748b;">
                Se il bottone non funziona, salva e scrivi al numero:
                <a href="tel:3519523641" style="color:#1e3a8a; text-decoration:underline;">351&nbsp;952&nbsp;3641</a>.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 0 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                         font-size:16px; color:#0b1220;">
                Come funziona il percorso
              </h2>
              <ol style="margin:0 0 0 18px; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                         font-size:14px; line-height:1.9; color:#475569;">
                <li>Allineamento iniziale su obiettivi, livello e calendario verifiche.</li>
                <li>Piano settimanale personalizzato con lezioni, esercizi e milestone.</li>
                <li>Sessioni 1:1 con correzioni e strategia di studio pratica.</li>
                <li>Recap a fine settimana e aggiornamento del piano successivo.</li>
              </ol>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 8px 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                         font-size:16px; color:#0b1220;">
                Supporto e fatturazione
              </h2>
              <p style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                        font-size:14px; line-height:1.7; color:#475569;">
                Per assistenza tecnica o amministrativa rispondi a questa email o scrivici su WhatsApp al numero sopra.
                Le ricevute dell’abbonamento sono disponibili nella tua area personale.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:8px 0 0 0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;">
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                        font-size:12px; line-height:1.6; color:#94a3b8;">
                Ricevi questa email perché hai attivato Theoremz Mentor. Questo messaggio è transazionale.
              </p>
              <p style="margin:6px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                        font-size:12px; line-height:1.6; color:#94a3b8;">
                © Theoremz. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderEssentialHtmlTemplate({
  preheader,
}: {
  preheader?: string;
}) {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Benvenuto in Theoremz Black Essential</title>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#f6f8fb; }
    @media (prefers-color-scheme: dark) { body { background:#0b1220; } }
    a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  </style>
</head>
<body style="margin:0; padding:0; background:#f6f8fb;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${escapeHtml(
      preheader ||
        "Benvenuto in Theoremz Black Essential: cosa è incluso e come iniziare subito con il tuo tutor su WhatsApp.",
    )}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f8fb;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(16,24,40,.06);">
          <tr>
            <td style="background:#1e3a8a; padding:24px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:18px; line-height:1.2; color:#e5edff; letter-spacing:.2px; font-weight:600;">
                      Theoremz <span style="opacity:.85;">Black&nbsp;Essential</span>
                    </div>
                  </td>
                  <td align="right">
                    <div style="width:10px;height:10px;border-radius:50%;background:#93c5fd;display:inline-block;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <h1 style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:24px; line-height:1.3; color:#0b1220;">
                Benvenuto in Theoremz Black Essential
              </h1>
              <p style="margin:12px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#334155;">
                Ottimo passo. Qui sotto trovi cosa include l’abbonamento e i prossimi passi per iniziare subito con metodo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 0 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#0b1220;">
                Cosa include Black Essential
              </h2>
              <ul style="margin:0 0 0 18px; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.8; color:#475569;">
                <li>Accesso alle lezioni e agli esercizi premium essenziali.</li>
                <li>Piani di studio guidati per verifiche ed esami, con priorità sugli argomenti chiave.</li>
                <li>Correzioni e feedback mirati su esercizi selezionati.</li>
                <li>Supporto su WhatsApp con check-in periodici e risorse aggiornate.</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 10px 28px;">
              <div style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#334155;">
                Per partire, scrivi al tuo tutor su WhatsApp presentandoti con <em>nome</em>, <em>classe/scuola</em> e <em>date delle prossime verifiche</em>.
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="border-radius:10px; background:#1e3a8a;">
                    <a href="https://wa.me/3519523641?text=Ciao%2C%20sono%20%5BNome%5D%2C%20nuovo%20abbonato%20Theoremz%20Black%20Essential.%20Classe%2FScuola%3A%20%5Bscrivi%5D.%20Prossime%20verifiche%3A%20%5Bdate%20e%20materie%5D."
                       style="display:inline-block; padding:12px 18px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.2; color:#ffffff; text-decoration:none; font-weight:600;">
                      Apri la chat WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin:10px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#64748b;">
                Se il bottone non funziona, salva il numero e scrivi su WhatsApp:
                <a href="tel:3519523641" style="color:#1e3a8a; text-decoration:underline;">351&nbsp;952&nbsp;3641</a>.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 0 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; color:#0b1220;">
                Come sfruttarlo al massimo
              </h2>
              <ol style="margin:0 0 0 18px; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.9; color:#475569;">
                <li>Invia al tutor il calendario delle verifiche con 1–2 obiettivi della settimana.</li>
                <li>Segui i moduli consigliati e completa gli esercizi chiave.</li>
                <li>Condividi i tuoi dubbi: riceverai esempi risolti e correzioni puntuali.</li>
                <li>Fai un breve recap a fine settimana per tarare il piano successivo.</li>
              </ol>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 8px 28px;">
              <h2 style="margin:0 0 8px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:16px; color:#0b1220;">
                Supporto e fatturazione
              </h2>
              <p style="margin:0 0 10px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.7; color:#475569;">
                Per assistenza tecnica o pagamenti, scrivi su WhatsApp al numero sopra. Le ricevute sono disponibili nella tua area personale.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:8px 0 0 0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px 28px;">
              <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#94a3b8;">
                Ricevi questa email perché hai attivato Theoremz Black Essential. Questo messaggio è transazionale.
              </p>
              <p style="margin:6px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#94a3b8;">
                © Theoremz. Tutti i diritti riservati.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
