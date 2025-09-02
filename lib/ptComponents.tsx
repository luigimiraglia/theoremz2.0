import React from "react";
import type { PortableTextComponents } from "@portabletext/react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { LucideQuote as BlockquoteIcon } from "lucide-react";
import MathText from "@/components/MathText";

/* ---- helper: applica MathText solo ai nodi stringa dei children ---- */
const MathInChildren = ({ children }: { children: React.ReactNode }) => (
  <>
    {React.Children.map(children, (child, i) =>
      typeof child === "string" ? <MathText key={i} text={child} /> : child
    )}
  </>
);

/* ---------------- Helpers per le tabelle ---------------- */

// matcha una cella che è SOLO una formula $...$ (non inline-pezzo)
const isWholeMathCell = (s: string) =>
  /^\$[\s\S]*\$$/.test(s) && !s.slice(1, -1).includes("$");

// render cella: se è $...$ => KaTeX; altrimenti testo con parsing inline di MathText
const renderCell = (raw: unknown) => {
  const s = String(raw ?? "");
  if (!s) return "";
  if (isWholeMathCell(s)) {
    const inner = s.slice(1, -1);
    return <InlineMath errorColor="#cc0000">{inner}</InlineMath>;
  }
  return <MathText text={s} />;
};

// normalizza le celle alla stessa lunghezza
const normalize = (cells: Array<unknown> | undefined, len: number) =>
  Array.from({ length: len }, (_, i) => cells?.[i] ?? "");

/* ---------------- Helpers per block-math puro ---------------- */

// $$...$$ oppure \[...\] come UNICO contenuto del blocco
const PURE_BLOCK_MATH_RE = /^\s*(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])\s*$/;

// estrae il testo "piatto" del block PT
const blockPlainText = (value: any): string =>
  (value?.children ?? []).map((c: any) => c?.text ?? "").join("");

// decide se un block è “solo” math
const isPureBlockMath = (value: any) =>
  PURE_BLOCK_MATH_RE.test(blockPlainText(value));

/* -------------------------------------------------------- */

export const ptComponents: PortableTextComponents = {
  /* ----------   BLOCKS   ---------- */
  block: {
    h2: ({ children }) => (
      <h2 className="mt-8 mb-4 text-2xl text-blue-500 font-extrabold">
        <MathInChildren>{children}</MathInChildren>
      </h2>
    ),

    normal: ({ children, value }) => {
      if (isPureBlockMath(value)) {
        return <MathText text={blockPlainText(value)} allowBlock />;
      }
      return (
        <p className="my-4 leading-7 font-medium">
          <MathInChildren>{children}</MathInChildren>
        </p>
      );
    },

    blockquote: ({ children }) => (
      <blockquote className="my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 italic">
        <BlockquoteIcon size={18} className="mr-1 inline" />
        <MathInChildren>{children}</MathInChildren>
      </blockquote>
    ),
  },

  /* ----------   LISTS   ---------- */
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside ml-6 my-4">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside ml-6 my-4">{children}</ol>
    ),
  },

  listItem: {
    bullet: ({ children }) => (
      <li>
        <MathInChildren>{children}</MathInChildren>
      </li>
    ),
    number: ({ children }) => (
      <li>
        <MathInChildren>{children}</MathInChildren>
      </li>
    ),
  },

  /* ----------   CUSTOM OBJECTS   ---------- */
  types: {
    horizontalRule: () => (
      <hr className="mt-1 border-t-2 border-blue-950 rounded-full mx-1" />
    ),
    lineBreak: () => <br />,

    // retro-compatibilità oggetto "latex"
    latex: ({ value }) =>
      value.display ? (
        <BlockMath errorColor="#cc0000">{value.code}</BlockMath>
      ) : (
        <InlineMath errorColor="#cc0000">{value.code}</InlineMath>
      ),

    imageExternal: ({ value }) => (
      <div className="my-6 flex justify-center">
        <img
          src={value.url}
          alt={value.alt || "Immagine"}
          loading="lazy"
          decoding="async"
          className="rounded-xl max-w-9/10 sm:max-w-3/5 lg:max-w-2/5 h-auto"
        />
      </div>
    ),

    section: ({ value }) => {
      const anchor = value.shortTitle
        ?.toLowerCase()
        .replace(/[^\w]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return (
        <h2
          id={anchor}
          className="mt-4 text-2xl font-bold text-blue-500 scroll-mt-24"
        >
          <MathText text={value.heading} />
        </h2>
      );
    },

    /* ----------   TABLE (@sanity/table)   ---------- */
    table: ({ value }) => {
      const rows = (value?.rows || []).filter(Boolean);
      if (!rows.length) return null;

      const headerLikely =
        !!rows[0]?.isHeader ||
        rows[0]?.style === "header" ||
        (value?.header && (value.header as any).rows === 1) ||
        false;

      const colCount = Math.max(
        0,
        ...rows.map((r: any) => r?.cells?.length ?? 0)
      );
      const headerCells = headerLikely ? (rows[0]?.cells ?? []) : [];
      const bodyRows = headerLikely ? rows.slice(1) : rows;

      return (
        <div className="my-8 flex justify-center">
          <div className="w-full max-w-[860px] overflow-x-auto rounded-2xl shadow-sm ring-2 ring-blue-700 bg-blue-600">
            <table className="w-full border-collapse text-sm md:text-base">
              {headerLikely && (
                <thead>
                  <tr className="bg-blue-900/60">
                    {normalize(headerCells, colCount).map((c, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left font-semibold text-blue-100 border-b border-blue-700"
                      >
                        {renderCell(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {bodyRows.map((r: any, ri: number) => (
                  <tr key={ri} className={ri % 2 ? "bg-blue-900/30" : ""}>
                    {normalize(r?.cells, colCount).map((c, ci) => (
                      <td
                        key={ci}
                        className="px-4 py-3 text-white/90 font-semibold border-b-2 border-l-2 border-blue-900/50 align-top"
                      >
                        {renderCell(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    },
  },

  /* ----------   MARKS (inline) ---------- */
  marks: {
    /* nuovi decorator custom (schema v4: value "italic" e "bold") */
    italic: ({ children }) => <em className="italic">{children}</em>,
    bold: ({ children }) => <strong className="font-bold">{children}</strong>,

    /* retro-compatibilità per contenuti già salvati con em/strong */
    em: ({ children }) => <em className="italic">{children}</em>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,

    underline: ({ children }) => <span className="underline">{children}</span>,
    blueBold: ({ children }) => (
      <strong className="font-bold text-blue-500">{children}</strong>
    ),

    // link: niente MathText dentro
    link: ({ children, value }) => (
      <a
        href={value.href}
        target={
          typeof value?.href === "string" && value.href.startsWith("/")
            ? "_self"
            : "_blank"
        }
        rel="noopener noreferrer"
        className="text-blue-500 underline underline-offset-2 hover:text-blue-900"
      >
        {children}
      </a>
    ),

    // code: mantieni letterale
    code: ({ children }) => (
      <code className="px-1 py-0.5 rounded bg-zinc-100">{children}</code>
    ),

    // retro-compatibilità: mark "inlineLatex"
    inlineLatex: ({ value }) => (
      <InlineMath errorColor="#cc0000">{value.code}</InlineMath>
    ),
  },
};
