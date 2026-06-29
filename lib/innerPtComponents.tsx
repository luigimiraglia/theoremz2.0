// Subset of ptComponents used inside FAQ answers and similar nested blocks.
// Must NOT import FaqAccordion or ErroriComuniCards to avoid circular imports.
import React from "react";
import type { PortableTextComponents } from "@portabletext/react";
import { KaInline, KaBlock } from "@/components/KaTeX";
import "katex/dist/katex.min.css";
import MathText from "@/components/MathText";

const MathInChildren = ({ children }: { children: React.ReactNode }) => (
  <>
    {React.Children.map(children, (child, i) =>
      typeof child === "string" ? <MathText key={i} text={child} /> : child,
    )}
  </>
);

function withInlineMath(children: React.ReactNode): React.ReactNode {
  const map = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") return <MathText text={node} />;
    if (Array.isArray(node))
      return node.map((n, i) => (
        <React.Fragment key={i}>{map(n)}</React.Fragment>
      ));
    if (React.isValidElement(node)) {
      const props = (node as React.ReactElement<any>).props ?? {};
      return React.cloneElement(node as React.ReactElement<any>, {
        ...props,
        children: map(props.children),
      });
    }
    return node;
  };
  return map(children);
}

export const innerPtComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="my-2 leading-7 text-[0.93rem]">
        <MathInChildren>{children}</MathInChildren>
      </p>
    ),
  },
  types: {
    latex: ({ value }) => (
      <div className="my-3 overflow-x-auto">
        <KaBlock>{value.code}</KaBlock>
      </div>
    ),
  },
  marks: {
    bold: ({ children }) => (
      <strong className="font-bold">{withInlineMath(children)}</strong>
    ),
    italic: ({ children }) => (
      <em className="italic">{withInlineMath(children)}</em>
    ),
    blueBold: ({ children }) => (
      <strong className="font-bold text-blue-500">
        {withInlineMath(children)}
      </strong>
    ),
    redBold: ({ children }) => (
      <strong className="font-semibold text-red-500 [.dark_&]:text-red-400">
        {withInlineMath(children)}
      </strong>
    ),
    highlightBlue: ({ children }) => (
      <span className="relative inline rounded-[4px] px-[0.26em] py-[0.04em] bg-yellow-300/90 text-slate-900 [.dark_&]:bg-yellow-300/25 [.dark_&]:text-inherit [box-decoration-break:clone]">
        {withInlineMath(children)}
      </span>
    ),
    inlineLatex: ({ value }) => {
      const raw: string = value.code ?? "";
      const code = raw
        .replace(/^\\\(|\\\)$/g, "")
        .replace(/^\\\[|\\\]$/g, "")
        .replace(/^\$\$|\$\$$/g, "")
        .replace(/^\$|\$$/g, "")
        .trim();
      const needsDisplay = /\\(?:d?frac|cfrac|tfrac)\b/.test(code);
      return <KaInline>{needsDisplay ? `\\displaystyle { ${code} }` : code}</KaInline>;
    },
    mathBlueBox: ({ children }) => <>{children}</>,
    exUnderline: ({ children }) => <>{withInlineMath(children)}</>,
  },
};
