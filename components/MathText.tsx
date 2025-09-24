// components/MathText.tsx
import React from "react";
import { KaInline, KaBlock } from "@/components/KaTeX";
import "katex/dist/katex.min.css";

// Match $$...$$ | $...$ | \(...\) | \[...\]
const MATH_RE =
  /\$\$([\s\S]+?)\$\$|\$([^\$]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;

export default function MathText({
  text,
  allowBlock = false, // se true: consenti il rendering in display per $$...$$ o \[...\]
}: {
  text?: string | null;
  allowBlock?: boolean;
}) {
  const s = String(text ?? "");
  if (!s) return null;

  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = MATH_RE.exec(s))) {
    const [full, dd, d, p, b] = m; // $$ $$ | $ $ | \( \) | \[ \]
    const i = m.index;

    if (i > last) parts.push(s.slice(last, i));

    const expr = dd ?? d ?? p ?? b ?? "";
    const isBlock = !!dd || !!b; // $$...$$ or \[...\]

    if (isBlock && allowBlock) {
      parts.push(
        <div key={parts.length} className="my-3 overflow-x-auto">
          <KaBlock>{expr}</KaBlock>
        </div>
      );
    } else {
      // Inline: ingrandisci frazioni con \displaystyle senza spezzare il flusso
      const needsDisplayInline = /\\(?:d?frac|cfrac|tfrac)\b/.test(expr);
      const toRender = needsDisplayInline ? `\\displaystyle { ${expr} }` : expr;
      parts.push(
        <KaInline key={parts.length}>{toRender}</KaInline>
      );
    }

    last = i + full.length;
  }

  if (last < s.length) parts.push(s.slice(last));
  return <>{parts}</>;
}
