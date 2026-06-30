import { NextResponse } from "next/server";
import { groq } from "next-sanity";
import katex from "katex";
import puppeteer from "puppeteer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { client as base } from "@/sanity/lib/client";
import { requirePremium } from "@/lib/premium-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortableBlock = {
  _type?: string;
  style?: string;
  children?: Array<{ text?: string; marks?: string[] }>;
  markDefs?: Array<{ _key?: string; _type?: string; code?: string }>;
  code?: string;
  titolo?: string;
  definizione?: string;
  formulaPrincipale?: string;
  puntiChiave?: Array<{ testo?: string }>;
  caption?: string;
  headers?: string[];
  rows?: Array<{ cells?: string[] }>;
  title?: string;
  content?: PortableBlock[];
};

type FormulaFlashcard = {
  title?: string;
  formula?: string;
  explanation?: string;
  difficulty?: number;
};

type LessonPayload = {
  _id: string;
  title: string;
  slug?: string;
  materia?: string | null;
  content?: PortableBlock[];
  formule?: FormulaFlashcard[];
};

type FormulaItem = {
  title: string;
  formula: string;
  note?: string | null;
  source: "formula" | "riepilogo" | "latex" | "esempio";
};

type SummaryItem = {
  title: string;
  definition?: string | null;
  points: string[];
};

type TableItem = {
  caption: string;
  headers: string[];
  rows: string[][];
};

type FormularioData = {
  formulas: FormulaItem[];
  summaries: SummaryItem[];
  tables: TableItem[];
};

const QUERY = groq`
*[_type=="lesson" && _id==$lessonId][0]{
  _id,
  title,
  materia,
  "slug": slug.current,
  content,
  formule[]{ title, formula, explanation, difficulty }
}
`;

export async function GET(req: Request) {
  const auth = await requirePremium(req);
  if (!("user" in auth)) return auth;

  const url = new URL(req.url);
  const lessonId = compact(url.searchParams.get("lessonId"));
  if (!lessonId) {
    return NextResponse.json({ ok: false, error: "Missing lessonId" }, { status: 400 });
  }

  const lesson = await fetchLesson(lessonId);
  if (!lesson) {
    return NextResponse.json({ ok: false, error: "Lezione non trovata" }, { status: 404 });
  }

  const data = extractFormularioData(lesson);
  if (!data.formulas.length && !data.summaries.length && !data.tables.length) {
    return NextResponse.json(
      { ok: false, error: "Formulario non disponibile per questa lezione" },
      { status: 404 }
    );
  }

  const html = await buildHtml(lesson, data);
  const pdf = await renderPdf(html);
  const filename = `${safeFilename(lesson.title || "formulario")}-formulario-theoremz.pdf`;

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

async function fetchLesson(lessonId: string) {
  const client = base.withConfig({
    token: process.env.SANITY_TOKEN,
    apiVersion: "2025-07-23",
    useCdn: false,
  });

  return client.fetch<LessonPayload | null>(QUERY, { lessonId });
}

function extractFormularioData(lesson: LessonPayload): FormularioData {
  const formulas: FormulaItem[] = [];
  const summaries: SummaryItem[] = [];
  const tables: TableItem[] = [];
  const seen = new Set<string>();

  const addFormula = (item: FormulaItem) => {
    const formula = compact(item.formula, 1200);
    if (!formula) return;
    const key = formula.replace(/\s+/g, "").toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    formulas.push({
      ...item,
      formula,
      title: compact(item.title, 120) || "Formula",
      note: compact(item.note, 500),
    });
  };

  for (const item of lesson.formule ?? []) {
    addFormula({
      title: item.title || "Formula da ricordare",
      formula: item.formula || "",
      note: item.explanation || null,
      source: "formula",
    });
  }

  const collectStructuredBlocks = (blocks?: PortableBlock[]) => {
    for (const block of blocks ?? []) {
      if (block?._type === "riepilogoBlock") {
        const title = compact(block.titolo, 140) || "Riepilogo";
        const points = (block.puntiChiave ?? [])
          .map((point) => compact(point.testo, 240))
          .filter(Boolean) as string[];
        summaries.push({
          title,
          definition: compact(block.definizione, 700),
          points,
        });
        if (block.formulaPrincipale) {
          addFormula({
            title,
            formula: block.formulaPrincipale,
            note: block.definizione || null,
            source: "riepilogo",
          });
        }
        continue;
      }

      if (block?._type === "schemaRapidoBlock") {
        const rows = (block.rows ?? [])
          .map((row) => (row.cells ?? []).map((cell) => String(cell ?? "")))
          .filter((row) => row.some((cell) => cell.trim()));
        if (rows.length || block.headers?.length) {
          tables.push({
            caption: compact(block.caption, 140) || "Schema rapido",
            headers: block.headers ?? [],
            rows,
          });
        }
        continue;
      }
    }
  };

  collectStructuredBlocks(lesson.content);

  return { formulas, summaries, tables };
}

async function buildHtml(lesson: LessonPayload, data: FormularioData) {
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
      padding: 17mm 16mm 15mm;
      page-break-after: always;
      position: relative;
    }
    .document-header {
      display: grid;
      grid-template-columns: 1fr 35mm;
      gap: 14px;
      align-items: end;
      margin-bottom: 15px;
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
      margin: 0;
      max-width: 150mm;
      font-size: 22px;
      line-height: 1.14;
      font-weight: 800;
    }
    .summary {
      padding: 9px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      background: #f8fafc;
    }
    .summary strong {
      display: block;
      color: #2b7fff;
      font-size: 20px;
      line-height: 1;
    }
    .summary span {
      color: #475569;
      font-size: 9px;
      font-weight: 700;
    }
    .section-title {
      margin: 0 0 12px;
      padding-bottom: 9px;
      border-bottom: 1px solid #d7dee8;
    }
    .section-title h2 {
      margin: 0;
      color: #0f172a;
      font-size: 18px;
      line-height: 1.25;
    }
    .section-title p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 10px;
      font-weight: 600;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px;
    }
    .card {
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      overflow: hidden;
      background: #ffffff;
    }
    .card-head {
      display: grid;
      grid-template-columns: 36px 1fr;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .number {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
    }
    .title {
      padding: 9px 11px;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.32;
    }
    .body { padding: 11px 12px 12px; }
    .formula-box {
      margin: 0 0 8px;
      padding: 8px 9px;
      overflow: hidden;
      border: 1px solid #dbeafe;
      border-radius: 7px;
      background: #f8fbff;
      text-align: center;
    }
    .formula-box .katex-display { margin: 0; }
    .formula-box .katex { font-size: 1.02em; }
    .note {
      margin: 0;
      color: #475569;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.5;
    }
    .summary-card {
      margin-bottom: 9px;
      padding: 11px 12px;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #2b7fff;
      border-radius: 8px;
      background: #f8fafc;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .summary-card h3 {
      margin: 0 0 5px;
      font-size: 13px;
      color: #0f172a;
    }
    .summary-card p {
      margin: 0 0 6px;
      color: #334155;
      font-size: 10.5px;
      font-weight: 600;
    }
    .summary-card ul {
      margin: 0;
      padding-left: 16px;
      color: #475569;
      font-size: 10px;
      font-weight: 600;
    }
    .summary-card .katex,
    .table-card .katex,
    .note .katex {
      font-size: 1em;
    }
    .summary-card .katex-display,
    .table-card .katex-display,
    .note .katex-display {
      margin: 5px 0;
      padding: 5px 6px;
      border: 1px solid #dbeafe;
      border-radius: 6px;
      background: #ffffff;
      overflow: hidden;
    }
    .table-card {
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .table-card h3 {
      margin: 0 0 6px;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #d7dee8;
      padding: 7px 8px;
      vertical-align: top;
    }
    th {
      color: #0f172a;
      background: #eef5ff;
      font-weight: 800;
    }
    td { font-weight: 600; color: #334155; }
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
  </style>
</head>
<body>
  <section class="page">
    <div class="document-header">
      <div>
        <div class="brand-line">Theoremz - Formulario</div>
        <h1>${escapeHtml(lesson.title)}</h1>
      </div>
      <div class="summary">
        <strong>${data.formulas.length}</strong>
        <span>${data.formulas.length === 1 ? "formula" : "formule"}</span>
      </div>
    </div>
    ${
      data.summaries.length
        ? `<div class="section-title"><h2>Riepilogo essenziale</h2><p>Definizioni e punti chiave della lezione.</p></div>
           ${data.summaries.map(renderSummary).join("")}`
        : ""
    }
    ${
      data.formulas.length
        ? `<div class="section-title"><h2>Formule da ricordare</h2><p>Le formule principali sono raccolte in modo rapido da ripassare.</p></div>
           <div class="grid">${data.formulas.map(renderFormulaCard).join("")}</div>`
        : ""
    }
    <div class="footer"><span>theoremz.com</span><span>Formulario</span></div>
  </section>
  ${
    data.tables.length
      ? `<section class="page">
          <div class="section-title"><h2>Schemi e tabelle rapide</h2><p>Riferimenti sintetici utili durante il ripasso.</p></div>
          ${data.tables.map(renderTable).join("")}
          <div class="footer"><span>theoremz.com</span><span>Schemi</span></div>
        </section>`
      : ""
  }
</body>
</html>`;
}

function renderSummary(item: SummaryItem) {
  return `<section class="summary-card">
    <h3>${escapeHtml(item.title)}</h3>
    ${item.definition ? `<p>${renderTextWithMath(item.definition)}</p>` : ""}
    ${
      item.points.length
        ? `<ul>${item.points.map((point) => `<li>${renderTextWithMath(point)}</li>`).join("")}</ul>`
        : ""
    }
  </section>`;
}

function renderFormulaCard(item: FormulaItem, index: number) {
  return `<article class="card">
    <div class="card-head">
      <div class="number">${String(index + 1).padStart(2, "0")}</div>
      <div class="title">${escapeHtml(item.title)}</div>
    </div>
    <div class="body">
      <div class="formula-box">${renderMath(item.formula, true)}</div>
      ${item.note ? `<p class="note">${renderTextWithMath(item.note)}</p>` : ""}
    </div>
  </article>`;
}

function renderTable(table: TableItem) {
  const colCount = Math.max(table.headers.length, ...table.rows.map((row) => row.length), 0);
  if (!colCount) return "";

  const headers = normalizeCells(table.headers, colCount);
  const rows = table.rows.map((row) => normalizeCells(row, colCount));
  const hasRows = rows.some((row) => row.some((cell) => cell.trim()));

  return `<section class="table-card">
    <h3>${escapeHtml(table.caption)}</h3>
    <table>
      ${headers.some(Boolean) ? `<thead><tr>${headers.map((cell) => `<th>${renderCell(cell)}</th>`).join("")}</tr></thead>` : ""}
      ${
        hasRows
          ? `<tbody>${rows
              .map((row) => `<tr>${row.map((cell) => `<td>${renderCell(cell)}</td>`).join("")}</tr>`)
              .join("")}</tbody>`
          : ""
      }
    </table>
  </section>`;
}

function renderCell(value: string) {
  return renderTextWithMath(value.trim());
}

function normalizeCells(cells: string[], count: number) {
  return Array.from({ length: count }, (_, index) => cells[index] ?? "");
}

function renderMath(code: string, displayMode: boolean) {
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

function renderTextWithMath(value: string) {
  if (!value) return "";

  const parts: string[] = [];
  const mathPattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;
  let cursor = 0;

  for (const match of value.matchAll(mathPattern)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push(escapeHtml(value.slice(cursor, index)));
    }

    const parsed = unwrapMath(raw);
    parts.push(renderMath(parsed.code, parsed.displayMode));
    cursor = index + raw.length;
  }

  if (cursor < value.length) {
    parts.push(escapeHtml(value.slice(cursor)));
  }

  return parts.join("");
}

function unwrapMath(raw: string) {
  if (raw.startsWith("$$") && raw.endsWith("$$")) {
    return { code: raw.slice(2, -2).trim(), displayMode: true };
  }
  if (raw.startsWith("\\[") && raw.endsWith("\\]")) {
    return { code: raw.slice(2, -2).trim(), displayMode: true };
  }
  if (raw.startsWith("\\(") && raw.endsWith("\\)")) {
    return { code: raw.slice(2, -2).trim(), displayMode: false };
  }
  if (raw.startsWith("$") && raw.endsWith("$")) {
    return { code: raw.slice(1, -1).trim(), displayMode: false };
  }
  return { code: raw, displayMode: false };
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

function compact(value?: string | null, max = 180) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function safeFilename(name: string) {
  const cleaned = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "formulario";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
