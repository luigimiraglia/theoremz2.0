import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeadPayload = {
  firstName?: string;
  lastName?: string;
  phonePrefix?: string;
  phone?: string;
  email?: string;
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizePhonePrefix(prefix: string) {
  if (!prefix) return "";
  if (prefix.startsWith("+")) return prefix.slice(0, 6);
  return `+${prefix}`.slice(0, 6);
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").replace(/[^\d+]/g, "").slice(0, 32);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "missing_supabase_config" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as LeadPayload;
    const firstName = cleanText(body.firstName, 80);
    const lastName = cleanText(body.lastName, 80);
    const email = cleanText(body.email, 160);
    const phonePrefix = normalizePhonePrefix(cleanText(body.phonePrefix, 6));
    const phone = normalizePhone(cleanText(body.phone, 40));

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const referer = req.headers.get("referer");
    const pageUrl = referer ? cleanText(referer, 500) : null;

    const db = supabaseServer();
    const { error } = await db.from("ilmetodotheoremz_leads").insert({
      full_name: fullName,
      email,
      phone_prefix: phonePrefix || null,
      phone,
      page_url: pageUrl,
      source: "ilmetodotheoremz",
    });

    if (error) {
      console.error("[ilmetodotheoremz lead] insert error", error);
      return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    const fromUser = process.env.GMAIL_USER || "";
    const appPass = process.env.GMAIL_APP_PASS || "";
    const toEmail =
      process.env.ILMETODOLEADS_TO || "theoremz.team@gmail.com";

    let emailStatus: "sent" | "failed" | "skipped" = "skipped";

    if (fromUser && appPass) {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: fromUser, pass: appPass },
      });

      const fullPhone = `${phonePrefix}${phone}`;
      const whatsappDigits = fullPhone.replace(/\D/g, "");
      const whatsappLink = whatsappDigits
        ? `https://wa.me/${whatsappDigits}`
        : null;
      const safeName = escapeHtml(fullName);
      const safeEmail = escapeHtml(email);
      const safePhone = escapeHtml(fullPhone);
      const safePage = pageUrl ? escapeHtml(pageUrl) : null;

      const subject = `[Lead Metodo Theoremz] ${fullName}`;
      const text = [
        `Nome: ${fullName}`,
        `Telefono: ${fullPhone}`,
        `Email: ${email}`,
        whatsappLink ? `WhatsApp: ${whatsappLink}` : "WhatsApp: -",
        safePage ? `Pagina: ${pageUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const html = `
        <div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
          <p><strong>Nome:</strong> ${safeName}</p>
          <p><strong>Telefono:</strong> <a href="tel:${safePhone}">${safePhone}</a></p>
          <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          ${safePage ? `<p><strong>Pagina:</strong> <a href="${safePage}">${safePage}</a></p>` : ""}
          ${
            whatsappLink
              ? `<a href="${whatsappLink}" style="display:inline-block;margin-top:12px;padding:12px 18px;background:#25D366;color:#fff;text-decoration:none;border-radius:999px;font-weight:700">Apri WhatsApp</a>`
              : ""
          }
        </div>
      `.trim();

      try {
        await transporter.sendMail({
          from: `"Theoremz Lead" <${fromUser}>`,
          to: toEmail,
          subject,
          text,
          html,
          replyTo: email,
        });
        emailStatus = "sent";
      } catch (mailErr) {
        console.error("[ilmetodotheoremz lead] mail error", mailErr);
        emailStatus = "failed";
      }
    }

    return NextResponse.json({ ok: true, emailStatus });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "server_error" },
      { status: 500 }
    );
  }
}
