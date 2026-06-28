import nodemailer from "nodemailer";
import { upsertCanonicalLead } from "@/lib/canonicalLeads";

type LeadContactPreference = "call" | "whatsapp";

export type LeadIntakeInput = {
  fullName: string;
  email?: string | null;
  phone: string;
  source: string;
  funnel: string;
  note?: string | null;
  slot?: string | null;
  pageUrl?: string | null;
  contactPreference?: LeadContactPreference;
  replyToEmail?: string | null;
  subjectLabel: string;
  metadata?: Record<string, unknown>;
  fallbackKey: string;
};

function compactText(value: string | null | undefined, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMailer() {
  const fromUser = process.env.GMAIL_USER || "";
  const appPass = process.env.GMAIL_APP_PASS || "";
  if (!fromUser || !appPass) return null;

  return {
    fromUser,
    transporter: nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: fromUser, pass: appPass },
    }),
  };
}

export async function storeLeadAndNotify(input: LeadIntakeInput) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false as const, error: "missing_supabase_config" };
  }

  const fullName = compactText(input.fullName, 180);
  const email = compactText(input.email, 180)?.toLowerCase() || null;
  const phone = compactText(input.phone, 40);
  const source = compactText(input.source, 80) || "manual";
  const funnel = compactText(input.funnel, 40) || "manual";
  const note = compactText(input.note, 1000);
  const slot = compactText(input.slot, 40);
  const pageUrl = compactText(input.pageUrl, 500);
  const replyToEmail = compactText(input.replyToEmail, 180)?.toLowerCase() || null;

  if (!fullName || !phone) {
    return { ok: false as const, error: "missing_fields" };
  }

  const leadId = await upsertCanonicalLead({
    fullName,
    email,
    phone,
    channel: input.contactPreference === "whatsapp" ? "whatsapp" : "phone",
    source,
    funnel,
    status: "active",
    responseStatus: "pending",
    note: [slot ? `Slot: ${slot}` : null, note].filter(Boolean).join(" | ") || null,
    pageUrl,
    metadata: {
      ...input.metadata,
      contactPreference: input.contactPreference || "call",
      source,
      funnel,
      slot,
      pageUrl,
    },
    fallbackKey: input.fallbackKey,
  });

  const mailer = getMailer();
  const contactTo =
    process.env.CONTACT_TO || process.env.ILMETODOLEADS_TO || process.env.GMAIL_USER || "";

  if (!mailer || !contactTo) {
    console.warn("[lead-intake] email skipped: missing mail config", {
      subjectLabel: input.subjectLabel,
      source,
      funnel,
    });
    return { ok: true as const, leadId, emailStatus: "skipped" as const };
  }

  const safeName = escapeHtml(fullName);
  const safeEmail = email ? escapeHtml(email) : null;
  const safePhone = escapeHtml(phone);
  const safeSource = escapeHtml(source);
  const safeFunnel = escapeHtml(funnel);
  const safeNote = note ? escapeHtml(note) : null;
  const safeSlot = slot ? escapeHtml(slot) : null;
  const safePage = pageUrl ? escapeHtml(pageUrl) : null;

  const html = `
    <div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;max-width:560px">
      <p style="margin:0 0 12px"><strong>Nome:</strong> ${safeName}</p>
      <p style="margin:0 0 12px"><strong>Telefono:</strong> <a href="tel:${safePhone}">${safePhone}</a></p>
      ${safeEmail ? `<p style="margin:0 0 12px"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>` : ""}
      <p style="margin:0 0 12px"><strong>Source:</strong> ${safeSource}</p>
      <p style="margin:0 0 12px"><strong>Funnel:</strong> ${safeFunnel}</p>
      ${safeSlot ? `<p style="margin:0 0 12px"><strong>Slot:</strong> ${safeSlot}</p>` : ""}
      ${safeNote ? `<p style="margin:0 0 12px"><strong>Note:</strong> ${safeNote}</p>` : ""}
      ${safePage ? `<p style="margin:0 0 12px"><strong>Pagina:</strong> <a href="${safePage}">${safePage}</a></p>` : ""}
    </div>
  `.trim();

  const text = [
    `Nome: ${fullName}`,
    `Telefono: ${phone}`,
    email ? `Email: ${email}` : null,
    `Source: ${source}`,
    `Funnel: ${funnel}`,
    slot ? `Slot: ${slot}` : null,
    note ? `Note: ${note}` : null,
    pageUrl ? `Pagina: ${pageUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await mailer.transporter.sendMail({
      from: `"Theoremz Lead" <${mailer.fromUser}>`,
      to: contactTo,
      subject: `[${input.subjectLabel}] ${fullName}`,
      text,
      html,
      replyTo: replyToEmail || email || undefined,
    });
    return { ok: true as const, leadId, emailStatus: "sent" as const };
  } catch (error) {
    console.error("[lead-intake] email failed", {
      subjectLabel: input.subjectLabel,
      source,
      funnel,
      error,
    });
    return { ok: true as const, leadId, emailStatus: "failed" as const };
  }
}
