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
  "il-metodo-theoremz.pdf",
);
const PDF_FILENAME = "il-metodo-theoremz.pdf";

type LeadMagnetPayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  consent?: boolean;
  pageUrl?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as LeadMagnetPayload | null;
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Dati non validi" },
      { status: 400 },
    );
  }

  const firstName = compact(body.firstName, 80);
  const lastName = compact(body.lastName, 80);
  const email = compact(body.email, 160)?.toLowerCase();
  const phone = compact(body.phone, 40);
  const pageUrl = compact(body.pageUrl, 500);

  if (!firstName || firstName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Inserisci il tuo nome" },
      { status: 400 },
    );
  }
  if (!lastName || lastName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Inserisci il tuo cognome" },
      { status: 400 },
    );
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Inserisci una email valida" },
      { status: 400 },
    );
  }
  if (!phone || normalizeDigits(phone).length < 8) {
    return NextResponse.json(
      { ok: false, error: "Inserisci un numero di telefono valido" },
      { status: 400 },
    );
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { ok: false, error: "Serve il consenso per ricevere la guida" },
      { status: 400 },
    );
  }

  const fullName = `${firstName} ${lastName}`.trim();

  try {
    await storeLeadAndNotify({
      fullName,
      email,
      phone,
      source: "metodo_theoremz_pdf",
      funnel: "ilmetodo",
      pageUrl,
      contactPreference: "whatsapp",
      subjectLabel: "Lead Metodo Theoremz - Guida PDF",
      metadata: {
        firstName,
        lastName,
        consent: true,
        leadMagnet: "il_metodo_theoremz_pdf",
      },
      fallbackKey: `metodo-theoremz-pdf:${email}`,
    });
  } catch (error) {
    console.error("[lead-magnet-theoremz] lead intake failed", error);
  }

  try {
    await sendGuideEmail({ to: email, firstName });
  } catch (error) {
    console.error("[lead-magnet-theoremz] resend email failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Non siamo riusciti a inviare la guida. Riprova tra poco.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function sendGuideEmail({
  to,
  firstName,
}: {
  to: string;
  firstName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing");

  const pdf = await readFile(PDF_PATH);
  const from =
    process.env.RESEND_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "Theoremz <noreply@theoremz.com>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "La tua guida Theoremz è qui",
      html: buildEmailHtml(escapeHtml(firstName)),
      text: buildEmailText(firstName),
      attachments: [
        {
          filename: PDF_FILENAME,
          content: pdf.toString("base64"),
          content_type: "application/pdf",
        },
      ],
      tags: [
        { name: "source", value: "metodo_theoremz_pdf" },
        { name: "type", value: "lead_magnet" },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Resend email failed (${response.status}): ${errorText}`);
  }
}

function buildEmailText(firstName: string) {
  return [
    `Ciao ${firstName},`,
    "",
    "in allegato trovi la guida gratuita Theoremz: il metodo per migliorare in matematica e fisica.",
    "Ti consiglio di partire dalla caccia alle lacune e dal Quaderno degli Errori: sono i due passaggi che cambiano più velocemente il modo in cui studi.",
    "",
    "Buono studio,",
    "Theoremz",
  ].join("\n");
}

function buildEmailHtml(safeName: string) {
  const items = [
    "La caccia alle lacune in 3 step",
    "La sessione da 40 minuti",
    "Il test per capire cosa non hai capito",
    "Il Quaderno degli Errori",
    "Il piano dei 30 giorni",
  ];

  const list = items
    .map(
      (item) => `<tr>
        <td style="width:30px;padding:8px 0;vertical-align:top;">
          <span style="display:inline-block;width:20px;height:20px;border-radius:999px;background:#336DFD;color:#ffffff;text-align:center;line-height:20px;font-size:13px;font-weight:900;">✓</span>
        </td>
        <td style="padding:8px 0;color:#334155;font-size:14px;line-height:1.55;font-weight:700;">${escapeHtml(item)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>La tua guida Theoremz</title>
  </head>
  <body style="margin:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4ff;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;border-radius:24px;overflow:hidden;background:#ffffff;border:1px solid #dbeafe;">
            <tr>
              <td style="background:#071126;padding:28px 28px 24px;color:#ffffff;">
                <div style="font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#9DD6FF;">Theoremz</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.12;font-weight:900;">La tua guida Theoremz è pronta</h1>
                <p style="margin:12px 0 0;color:#cbd5e1;font-size:14px;line-height:1.6;font-weight:700;">PDF gratuito · 12 pagine · Piano dei 30 giorni</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.6;font-weight:800;color:#0f172a;">Ciao ${safeName},</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
                  in allegato trovi la guida <strong>Il Metodo Theoremz per matematica e fisica</strong>.
                  È pensata per trasformare lo studio da ore confuse a un sistema semplice, ripetibile e misurabile.
                </p>
                <div style="border:1px solid #dbeafe;border-radius:18px;background:#f8fbff;padding:18px 20px;margin:0 0 22px;">
                  <div style="font-size:12px;font-weight:900;color:#336DFD;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Parti da qui</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list}</table>
                </div>
                <p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#64748b;">
                  Apri il PDF, stampa la checklist finale e usa il primo esercizio già dalla prossima sessione.
                </p>
                <a href="https://theoremz.com/ilmetodotheoremz" style="display:inline-block;border-radius:14px;background:#336DFD;color:#ffffff;text-decoration:none;padding:14px 20px;font-size:14px;font-weight:900;">
                  Scopri il Metodo Theoremz
                </a>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0;padding:16px 28px;color:#64748b;font-size:12px;line-height:1.5;font-weight:700;">
                Hai ricevuto questa email perché hai richiesto la guida gratuita su theoremz.com.
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
