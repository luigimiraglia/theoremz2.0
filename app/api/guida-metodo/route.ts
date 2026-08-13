import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { storeLeadAndNotify } from "@/lib/leadIntake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PDF_PATH = path.join(
  process.cwd(),
  "public",
  "pdf",
  "il-metodo-theoremz.pdf"
);
const PDF_FILENAME = "il-metodo-theoremz.pdf";

type LeadPayload = {
  role?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  consent?: boolean;
  pageUrl?: string;
};

export async function POST(req: Request) {
  let body: LeadPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dati non validi" }, { status: 400 });
  }

  const role: "genitore" | "studente" = body.role === "genitore" ? "genitore" : "studente";
  const roleLabel = role === "genitore" ? "Genitore" : "Studente";
  const firstName = compact(body.firstName, 80);
  const lastName = compact(body.lastName, 80);
  const email = compact(body.email, 160)?.toLowerCase();
  const phone = compact(body.phone, 40);
  const pageUrl = compact(body.pageUrl, 500);

  if (!firstName || firstName.length < 2) {
    return NextResponse.json({ ok: false, error: "Inserisci il tuo nome" }, { status: 400 });
  }
  if (!lastName || lastName.length < 2) {
    return NextResponse.json({ ok: false, error: "Inserisci il tuo cognome" }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Inserisci una email valida" }, { status: 400 });
  }
  if (!phone || normalizeDigits(phone).length < 8) {
    return NextResponse.json(
      { ok: false, error: "Inserisci un numero di telefono valido" },
      { status: 400 }
    );
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { ok: false, error: "Devi acconsentire per ricevere la guida" },
      { status: 400 }
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();

  try {
    await storeLeadAndNotify({
      fullName,
      email,
      phone,
      source: "guida_metodo_pdf",
      funnel: "other",
      pageUrl,
      contactPreference: "call",
      subjectLabel: `Lead Guida Metodo PDF — ${roleLabel}`,
      note: `Ruolo: ${roleLabel}`,
      metadata: { firstName, lastName, role },
      fallbackKey: `guida-metodo:${email}`,
    });
  } catch (error) {
    console.error("[guida-metodo] lead intake failed", error);
  }

  try {
    await sendGuidePdfEmail({ to: email, firstName });
  } catch (error) {
    console.error("[guida-metodo] resend email failed", error);
    return NextResponse.json(
      { ok: false, error: "Non siamo riusciti a inviare la guida. Riprova tra poco." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

async function sendGuidePdfEmail({ to, firstName }: { to: string; firstName: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY missing");
  }

  const pdf = await readFile(PDF_PATH);

  const from =
    process.env.RESEND_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "Theoremz <noreply@theoremz.com>";

  const subject = "La tua guida gratuita è pronta — Il Metodo Theoremz";
  const safeName = escapeHtml(firstName);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: buildGuideEmailHtml(safeName),
      text: buildGuideEmailText(firstName),
      attachments: [
        {
          filename: PDF_FILENAME,
          content: pdf.toString("base64"),
          content_type: "application/pdf",
        },
      ],
      tags: [{ name: "source", value: "guida_metodo_pdf" }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Resend email failed (${response.status}): ${errorText}`);
  }
}

function buildGuideEmailText(firstName: string) {
  return [
    `Ciao ${firstName},`,
    ``,
    `in allegato trovi il PDF con il Metodo Theoremz: il sistema in 6 pilastri e il piano di 30 giorni per il tuo primo 9 in matematica e fisica.`,
    ``,
    `Buono studio,`,
    `Theoremz`,
  ].join("\n");
}

function buildGuideEmailHtml(safeName: string) {
  const checklist = [
    "La caccia alle lacune, passo per passo",
    "La sessione di studio da 40 minuti",
    "Il Quaderno degli Errori",
    "La strategia esatta per la verifica",
    "Il piano dei 30 giorni + checklist pre-verifica",
  ];

  const checklistHtml = checklist
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;vertical-align:top;width:28px;">
          <span style="display:inline-flex;width:20px;height:20px;border-radius:999px;background:#2b7fff;align-items:center;justify-content:center;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
        </td>
        <td style="padding:8px 0;font-size:14px;line-height:1.5;color:#334155;font-weight:600;">${escapeHtml(item)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>La tua guida Theoremz</title>
  </head>
  <body style="margin:0;background:#f4f7fb;font-family:Montserrat,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #dbeafe;box-shadow:0 18px 50px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:26px 28px;background:linear-gradient(90deg,#2563eb,#2b7fff,#55d4ff);color:#ffffff;">
                <div style="font-size:12px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;opacity:0.9;">Theoremz</div>
                <h1 style="margin:10px 0 0;font-size:26px;line-height:1.18;font-weight:900;">La tua guida è pronta</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.6;font-weight:700;color:#0f172a;">Ciao ${safeName},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                  in allegato trovi <strong>"Il Metodo per il tuo primo 9 in matematica e fisica"</strong>:
                  il sistema in 6 pilastri usato ogni giorno da migliaia di studenti per cambiare
                  metodo di studio — e media — in 30 giorni.
                </p>

                <div style="border:1px solid #dbeafe;border-left:5px solid #2b7fff;border-radius:16px;background:#f8fbff;padding:18px 20px;margin:0 0 22px;">
                  <div style="font-size:12px;font-weight:900;color:#2b7fff;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Cosa trovi dentro</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${checklistHtml}</table>
                </div>

                <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#64748b;">
                  Il PDF resta nella tua casella email: puoi riaprirlo o ristamparlo quando vuoi.
                </p>

                <a href="https://theoremz.com/ilmetodotheoremz" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:900;font-size:14px;">
                  Scopri come lavoriamo ogni giorno con gli studenti →
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;font-weight:700;">
                theoremz.com · Instagram @theoremz__
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function compact(value?: string | null, max = 180) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function normalizeDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
