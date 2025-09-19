import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminAuth } from "@/lib/firebaseAdmin";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function verifyAuth(req: Request) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded as { uid: string; email?: string | null };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    if (!auth)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const CONTACT_TO =
      process.env.CONTACT_TO || process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS;

    if (!CONTACT_TO || !GMAIL_USER || !GMAIL_APP_PASS) {
      return NextResponse.json(
        { error: "email_not_configured" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
    });

    const contentType = req.headers.get("content-type") || "";
    const attachments: any[] = [];
    let title = "Verifica";
    let studentEmail = String(auth.email || "");
    let examMd = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      title = String(form.get("title") || title);
      studentEmail = String(form.get("studentEmail") || studentEmail);
      examMd = String(form.get("examMd") || "");

      // photos[]
      const photos = form.getAll("photos");
      for (const p of photos) {
        if (p && typeof (p as any).arrayBuffer === "function") {
          const file = p as unknown as File;
          const buf = Buffer.from(await file.arrayBuffer());
          attachments.push({
            filename: file.name || `foto-${Date.now()}.jpg`,
            content: buf,
            contentType: file.type || "image/jpeg",
          });
        }
      }

      // examPdf optional, else build from examMd
      const examPdf = form.get("examPdf") as File | null;
      if (examPdf && typeof (examPdf as any)?.arrayBuffer === "function") {
        const buf = Buffer.from(await (examPdf as File).arrayBuffer());
        attachments.push({
          filename: `${safeFilename(title)}.pdf`,
          content: buf,
          contentType: "application/pdf",
        });
      } else if (examMd) {
        const buf = await mdToPdf(examMd, title);
        attachments.push({
          filename: `${safeFilename(title)}.pdf`,
          content: buf,
          contentType: "application/pdf",
        });
      }
    } else {
      // JSON fallback (retrocompatibile)
      const body = await req.json().catch(() => null);
      title = String(body?.title || title);
      studentEmail = String(body?.studentEmail || studentEmail);
      examMd = String(body?.examMd || "");
      if (examMd) {
        const buf = await mdToPdf(examMd, title);
        attachments.push({
          filename: `${safeFilename(title)}.pdf`,
          content: buf,
          contentType: "application/pdf",
        });
      }
    }

    if (!attachments.length) {
      return NextResponse.json({ error: "no_attachments" }, { status: 400 });
    }

    const html = `
      <div>
        <p>Nuova consegna verifica da: <strong>${escapeHtml(
          studentEmail || auth.email || auth.uid
        )}</strong></p>
        <p><strong>Titolo verifica:</strong> ${escapeHtml(title)}</p>
        <p>In allegato le foto dello svolgimento e il PDF della prova.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `Theoremz <${GMAIL_USER}>`,
      to: CONTACT_TO,
      subject: `Consegna verifica – ${studentEmail || auth.email || auth.uid}`,
      html,
      attachments,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("mock-exam submit error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function safeFilename(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").slice(0, 60);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function mdToPdf(markdown: string, title: string) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage();
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  let y = height - margin;
  page.drawText(title, { x: margin, y, size: 18, font: bold });
  y -= 26;
  const plain = markdown
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^-\s+/gm, "• ")
    .replace(/\r/g, "");
  const lines = wrapPlain(plain, font, 12, contentWidth);
  for (const line of lines) {
    if (y < margin + 14) {
      page = pdf.addPage();
      y = page.getSize().height - margin;
    }
    page.drawText(line, { x: margin, y, size: 12, font });
    y -= 16;
  }
  return Buffer.from(await pdf.save());
}

function wrapPlain(text: string, font: any, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      out.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}

