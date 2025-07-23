import React from "react";
import type { PortableTextComponents } from "@portabletext/react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css"; // **importa i css di KaTeX**
import { LucideQuote as BlockquoteIcon } from "lucide-react";

export const ptComponents: PortableTextComponents = {
  /* ----------   BLOCKS   ---------- */
  block: {
    h2: ({ children }) => (
      <h2 className="mt-8 mb-4 text-2xl font-bold">{children}</h2>
    ),
    normal: ({ children }) => <p className="my-4 leading-7">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="my-6 rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4 italic">
        <BlockquoteIcon size={18} className="mr-1 inline" />
        {children}
      </blockquote>
    ),
  },

  /* ----------   CUSTOM OBJECTS   ---------- */
  types: {
    horizontalRule: () => <hr className="my-8 border-t-2 border-gray-300" />,
    lineBreak: () => <br />,
    latex: ({ value }) =>
      value.display ? (
        /* modalità display (equazione centrata) */
        <BlockMath errorColor="#cc0000">{value.code}</BlockMath>
      ) : (
        /* inline \(...\) */
        <InlineMath errorColor="#cc0000">{value.code}</InlineMath>
      ),
  },

  /* ----------   MARK (span) --------- */
  marks: {
    em: ({ children }) => <em className="italic">{children}</em>,
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    underline: ({ children }) => <span className="underline">{children}</span>,
    link: ({ children, value }) => (
      <a
        href={value.href}
        target={value.href.startsWith("/") ? "_self" : "_blank"}
        rel="noopener noreferrer"
        className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
      >
        {children}
      </a>
    ),
  },
};
