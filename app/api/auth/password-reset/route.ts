import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  email?: string;
};

const fromUser = process.env.GMAIL_USER || "";
const appPass = process.env.GMAIL_APP_PASS || "";

const transporter =
  fromUser && appPass
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: fromUser, pass: appPass },
      })
    : null;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com")
  .trim()
  .replace(/\/$/, "");
const resetUrl = `${siteUrl}/reset-password`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "missing_email" },
        { status: 400 }
      );
    }

    if (!transporter) {
      return NextResponse.json(
        { ok: false, error: "missing_email_config" },
        { status: 500 }
      );
    }

    let link = "";
    try {
      const { adminAuth } = await import("@/lib/firebaseAdmin");
      link = await adminAuth.generatePasswordResetLink(email, {
        url: resetUrl,
        handleCodeInApp: true,
      });
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/user-not-found") {
        return NextResponse.json(
          { ok: false, error: code },
          { status: 404 }
        );
      }
      if (code === "auth/invalid-email") {
        return NextResponse.json(
          { ok: false, error: code },
          { status: 400 }
        );
      }
      console.error("[password reset] admin error", err);
      return NextResponse.json(
        { ok: false, error: code || "admin_error" },
        { status: 500 }
      );
    }

    const subject = "Reset password Theoremz";
    const text = [
      "Hai richiesto il reset della password.",
      "",
      `Link di reset: ${link}`,
      "",
      "Se non hai richiesto tu, ignora questa email.",
    ].join("\n");

    const html = `
<div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
  <p>Hai richiesto il reset della password.</p>
  <p><a href="${escapeHtml(link)}">Apri il link di reset</a></p>
  <p style="color:#64748b;font-size:12px">Se non hai richiesto tu, ignora questa email.</p>
</div>
`.trim();

    try {
      await transporter.sendMail({
        from: `"Theoremz" <${fromUser}>`,
        to: email,
        subject,
        text,
        html,
      });
    } catch (err) {
      console.error("[password reset] mail error", err);
      return NextResponse.json(
        { ok: false, error: "send_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[password reset] request error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
