import { NextResponse } from "next/server";
import { groq } from "next-sanity";
import katex from "katex";
import puppeteer from "puppeteer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { client as base } from "@/sanity/lib/client";
import { requirePremium } from "@/lib/premium-access";
import { upsertCanonicalLead } from "@/lib/canonicalLeads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortableBlock = {
  _type?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: Array<{ text?: string; marks?: string[] }>;
  markDefs?: Array<{ _key?: string; _type?: string; code?: string }>;
  code?: string;
  latex?: string;
  body?: string;
};

type ExerciseDoc = {
  _id: string;
  titolo: string;
  testo?: PortableBlock[];
  soluzione?: PortableBlock[];
  passaggi?: PortableBlock[];
};

type LessonPayload = {
  _id: string;
  title: string;
  slug?: string;
  materia?: string | null;
  exercises: ExerciseDoc[];
};

const QUERY = groq`
*[_type=="lesson" && _id==$lessonId][0]{
  _id,
  title,
  materia,
  "slug": slug.current,
  "exercises": *[_type=="exercise" && references(^._id)]{
    _id,
    titolo,
    testo,
    soluzione,
    passaggi
  } | order(titolo asc)
}
`;

const EXERCISES_PER_PAGE = 5;
const SOLUTIONS_PER_PAGE = 3;

export async function GET(req: Request) {
  const auth = await requirePremium(req);
  if (!("user" in auth)) return auth;

  const url = new URL(req.url);
  const lessonId = url.searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ ok: false, error: "Missing lessonId" }, { status: 400 });
  }

  const lesson = await fetchLesson(lessonId);
  const unavailable = validateLessonForPdf(lesson);
  if (unavailable) return unavailable;

  return generatePdfResponse(lesson as LessonPayload);
}

export async function POST(req: Request) {
  let body: {
    lessonId?: string;
    lessonSlug?: string;
    lessonTitle?: string;
    email?: string;
    phone?: string;
    pageUrl?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Dati non validi" }, { status: 400 });
  }

  const lessonId = compact(body.lessonId);
  const email = compact(body.email)?.toLowerCase();
  const phone = compact(body.phone);
  const lessonSlug = compact(body.lessonSlug);
  const pageUrl = compact(body.pageUrl, 500);

  if (!lessonId) {
    return NextResponse.json({ ok: false, error: "Missing lessonId" }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Inserisci una email valida" }, { status: 400 });
  }
  if (!phone || normalizePhone(phone).length < 8) {
    return NextResponse.json(
      { ok: false, error: "Inserisci un numero di telefono valido" },
      { status: 400 }
    );
  }

  const lesson = await fetchLesson(lessonId);
  const unavailable = validateLessonForPdf(lesson);
  if (unavailable) return unavailable;
  const validLesson = lesson as LessonPayload;

  try {
    await upsertCanonicalLead({
      email,
      phone,
      channel: "email",
      source: "free_exercises_pdf",
      funnel: "lesson_pdf",
      status: "active",
      responseStatus: "pending",
      pageUrl,
      note: `Download PDF esercizi: ${validLesson.title}`,
      metadata: {
        lessonId: validLesson._id,
        lessonSlug: validLesson.slug || lessonSlug,
        lessonTitle: validLesson.title,
        exerciseCount: validLesson.exercises.length,
      },
    });
  } catch (error) {
    console.error("[exercises-pdf] lead save failed", error);
    return NextResponse.json(
      { ok: false, error: "Non riesco ad attivare il download. Riprova tra poco." },
      { status: 500 }
    );
  }

  return generatePdfResponse(validLesson);
}

async function fetchLesson(lessonId: string) {
  const client = base.withConfig({
    token: process.env.SANITY_TOKEN,
    apiVersion: "2025-07-23",
    useCdn: false,
  });

  return client.fetch<LessonPayload | null>(QUERY, { lessonId });
}

function validateLessonForPdf(lesson: LessonPayload | null) {
  if (!lesson) {
    return NextResponse.json({ ok: false, error: "Lezione non trovata" }, { status: 404 });
  }
  if (!lesson.exercises?.length) {
    return NextResponse.json(
      { ok: false, error: "Nessun esercizio disponibile per questa lezione" },
      { status: 404 }
    );
  }
  return null;
}

async function generatePdfResponse(lesson: LessonPayload) {
  const generatedAt = new Date();
  const html = await buildHtml(lesson);
  const pdf = await renderPdf(html);
  const filename = `${safeFilename(lesson.title || "esercizi")}-esercizi-theoremz-${generatedAt.getTime()}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function compact(value?: string | null, max = 180) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function normalizePhone(value: string) {
  return value.replace(/\D+/g, "");
}

async function renderPdf(html: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMediaType("print");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
}

async function buildHtml(lesson: LessonPayload) {
  const katexCssPath = path.join(process.cwd(), "node_modules", "katex", "dist", "katex.min.css");
  const katexCss = await readFile(katexCssPath, "utf8");
  const katexBase = pathToFileURL(path.dirname(katexCssPath) + path.sep).href;
  const fontRoot = path.join(process.cwd(), "public", "fonts", "Montserrat");
  const montserratRegular = pathToFileURL(path.join(fontRoot, "Montserrat-Regular.ttf")).href;
  const montserratBold = pathToFileURL(path.join(fontRoot, "Montserrat-Bold.ttf")).href;
  const montserratSemiBold = pathToFileURL(path.join(fontRoot, "Montserrat-SemiBold.ttf")).href;

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <base href="${katexBase}" />
  <style>${katexCss}</style>
  <style>
    @font-face { font-family: Montserrat; src: url("${montserratRegular}") format("truetype"); font-weight: 400; }
    @font-face { font-family: Montserrat; src: url("${montserratSemiBold}") format("truetype"); font-weight: 600; }
    @font-face { font-family: Montserrat; src: url("${montserratBold}") format("truetype"); font-weight: 800; }
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      background: #ffffff;
      font-family: Montserrat, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.55;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 16mm 16mm;
      page-break-after: always;
      position: relative;
    }
    .document-header {
      display: grid;
      grid-template-columns: 1fr 34mm;
      gap: 12px;
      align-items: end;
      margin-bottom: 13px;
      padding-bottom: 12px;
      border-bottom: 2px solid #0f172a;
    }
    .brand-line {
      color: #2b7fff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    h1 {
      font-size: 22px;
      line-height: 1.15;
      letter-spacing: 0;
      margin: 0;
      max-width: 150mm;
    }
    .summary {
      padding: 9px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      background: #f8fafc;
    }
    .summary strong { display: block; font-size: 20px; color: #2b7fff; line-height: 1; }
    .summary span { color: #475569; font-size: 9px; font-weight: 700; }
    .footer {
      position: absolute;
      left: 16mm;
      right: 16mm;
      bottom: 8mm;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #d7dee8;
      padding-top: 7px;
      color: #64748b;
      font-size: 9px;
      font-weight: 600;
    }
    .section-title {
      margin: 0 0 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #d7dee8;
    }
    .section-title h2 {
      margin: 0;
      color: #0f172a;
      font-size: 19px;
      line-height: 1.25;
    }
    .section-title p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 10px;
      font-weight: 600;
    }
    .exercise {
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 0 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      overflow: hidden;
      background: #ffffff;
    }
    .exercise.prompt {
      border-color: #94a3b8;
    }
    .exercise-head {
      display: grid;
      grid-template-columns: 42px 1fr;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .number {
      background: #0f172a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 13px;
    }
    .title {
      padding: 10px 13px;
      font-weight: 800;
      font-size: 13px;
      line-height: 1.35;
    }
    .prompt .title { font-size: 14px; }
    .body { padding: 13px 15px 15px; }
    .prompt .body {
      padding: 15px 17px 17px;
      font-size: 13px;
      line-height: 1.62;
    }
    .solution-card .body {
      padding: 12px 14px 14px;
      font-size: 11.5px;
    }
    .section { margin-top: 10px; }
    .section:first-child { margin-top: 0; }
    .label {
      display: inline-flex;
      border-radius: 6px;
      background: #eef5ff;
      color: #1d4ed8;
      padding: 3px 7px;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 6px;
    }
    .content p { margin: 0 0 7px; }
    .content ul { margin: 0 0 7px 16px; padding: 0; }
    .content li { margin: 0 0 4px; }
    .katex-display {
      margin: 8px 0 10px;
      padding: 9px 10px;
      overflow: visible;
      border-radius: 7px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      text-align: center;
    }
    .katex { font-size: 1.02em; }
    .page-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 13px;
      padding-bottom: 8px;
      border-bottom: 1px solid #d7dee8;
    }
    .page-title strong { color: #2b7fff; font-size: 13px; }
    .page-title span { color: #64748b; font-size: 9px; font-weight: 700; }
    .answers-intro {
      margin: 8mm 0 10mm;
      padding: 13px 15px;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #2b7fff;
      border-radius: 8px;
      color: #334155;
      background: #f8fafc;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${chunkExercises(lesson.exercises, EXERCISES_PER_PAGE)
    .map(
      (chunk, pageIndex) => `<section class="page">
        ${
          pageIndex === 0
            ? `<div class="document-header">
                <div>
                  <div class="brand-line">Theoremz - Esercizi PDF</div>
                  <h1>${escapeHtml(lesson.title)}</h1>
                </div>
                <div class="summary"><strong>${lesson.exercises.length}</strong><span>esercizi</span></div>
              </div>`
            : `<div class="page-title"><strong>Theoremz</strong><span>${escapeHtml(lesson.title)}</span></div>`
        }
        ${
          pageIndex === 0
            ? `<div class="section-title"><h2>Esercizi</h2><p>Soluzioni e passaggi sono raccolti nelle pagine finali.</p></div>`
            : ""
        }
        ${chunk
          .map((exercise, index) => renderExercisePrompt(exercise, pageIndex * EXERCISES_PER_PAGE + index + 1))
          .join("")}
        <div class="footer"><span>theoremz.com</span><span>Esercizi</span></div>
      </section>`
    )
    .join("")}
  ${chunkExercises(lesson.exercises, SOLUTIONS_PER_PAGE)
    .map(
      (chunk, pageIndex) => `<section class="page">
        <div class="page-title"><strong>Theoremz</strong><span>${escapeHtml(lesson.title)}</span></div>
        ${
          pageIndex === 0
            ? `<div class="section-title"><h2>Soluzioni e passaggi</h2><p>Usa questa sezione solo dopo aver svolto gli esercizi.</p></div><div class="answers-intro">Le soluzioni sono abbinate allo stesso numero dell'esercizio corrispondente.</div>`
            : ""
        }
        ${chunk
          .map((exercise, index) => renderExerciseSolution(exercise, pageIndex * SOLUTIONS_PER_PAGE + index + 1))
          .join("")}
        <div class="footer"><span>theoremz.com</span><span>Soluzioni e passaggi</span></div>
      </section>`
    )
    .join("")}
</body>
</html>`;
}

function renderExercisePrompt(exercise: ExerciseDoc, index: number) {
  return `<article class="exercise prompt">
    <div class="exercise-head">
      <div class="number">${String(index).padStart(2, "0")}</div>
      <div class="title">${renderInlineText(exercise.titolo || `Esercizio ${index}`)}</div>
    </div>
    <div class="body">
      ${portableToHtml(exercise.testo)}
    </div>
  </article>`;
}

function renderExerciseSolution(exercise: ExerciseDoc, index: number) {
  return `<article class="exercise solution-card">
    <div class="exercise-head">
      <div class="number">${String(index).padStart(2, "0")}</div>
      <div class="title">${renderInlineText(exercise.titolo || `Esercizio ${index}`)}</div>
    </div>
    <div class="body">
      ${renderSection("Soluzione", exercise.soluzione)}
      ${renderSection("Passaggi", exercise.passaggi)}
    </div>
  </article>`;
}

function renderSection(label: string, blocks?: PortableBlock[]) {
  const html = portableToHtml(blocks);
  if (!html.trim()) return "";
  return `<section class="section"><div class="label">${label}</div><div class="content">${html}</div></section>`;
}

function portableToHtml(blocks?: PortableBlock[]) {
  if (!Array.isArray(blocks)) return "";
  const html: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  for (const block of blocks) {
    if (block?._type === "block") {
      const line = renderBlockChildren(block);
      if (!line.trim()) continue;
      if (block.listItem) {
        if (!listOpen) {
          html.push("<ul>");
          listOpen = true;
        }
        html.push(`<li>${line}</li>`);
      } else {
        closeList();
        html.push(`<p>${line}</p>`);
      }
      continue;
    }

    closeList();

    if (block?._type === "latex") {
      const code = block.code || block.latex || block.body || "";
      if (code) html.push(renderLatex(code, true));
      continue;
    }
    if (block?._type === "lineBreak") html.push("<br />");
    if (block?._type === "horizontalRule") html.push("<hr />");
  }

  closeList();
  return html.join("");
}

function renderBlockChildren(block: PortableBlock) {
  const marks = new Map((block.markDefs || []).map((mark) => [mark._key, mark]));
  return (block.children || [])
    .map((child) => {
      const latexMark = (child.marks || [])
        .map((key) => marks.get(key))
        .find((mark) => mark?._type === "inlineLatex" && mark.code);
      if (latexMark?.code) return renderLatex(latexMark.code, false);
      return renderInlineText(child.text || "");
    })
    .join("");
}

function renderInlineText(value: string) {
  const parts = String(value || "").split(/(\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return renderLatex(part.slice(1, -1), false);
      }
      return escapeHtml(part);
    })
    .join("");
}

function renderLatex(code: string, displayMode: boolean) {
  try {
    return katex.renderToString(code, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      output: "html",
    });
  } catch {
    return `<code>${escapeHtml(code)}</code>`;
  }
}

function chunkExercises(items: ExerciseDoc[], size: number) {
  const chunks: ExerciseDoc[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function safeFilename(name: string) {
  return String(name || "esercizi")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "esercizi";
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
