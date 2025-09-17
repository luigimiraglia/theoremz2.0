// components/MathText.tsx
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

// Match $$...$$ | $...$ | \(...\) | \[...\]
const MATH_RE =
  /\$\$([\s\S]+?)\$\$|\$([^\$]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;

export default function MathText({
  text,
  allowBlock = false, // se true: forza visualizzazione display per ogni formula
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

    if (allowBlock) {
      parts.push(
        <div key={parts.length} className="my-3 overflow-x-auto">
          <BlockMath errorColor="#cc0000">{expr}</BlockMath>
        </div>
      );
    } else {
      const needsDisplayInline = /\\(?:d?frac|cfrac|tfrac)\b/.test(expr);
      const toRender = needsDisplayInline
        ? `\\displaystyle { ${expr} }`
        : expr;
      parts.push(
        <InlineMath key={parts.length} errorColor="#cc0000">
          {toRender}
        </InlineMath>
      );
    }

    last = i + full.length;
  }

  if (last < s.length) parts.push(s.slice(last));
  return <>{parts}</>;
}
