import React from "react";
import type { PortableTextComponents } from "@portabletext/react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { LucideQuote as BlockquoteIcon } from "lucide-react";

export const ptComponents: PortableTextComponents = {
  /* ----------   BLOCKS   ---------- */
  block: {
    h2: ({ children }) => (
      <h2 className="mt-8 mb-4 text-2xl text-blue-500 font-extrabold">
        {children}
      </h2>
    ),
    normal: ({ children }) => (
      <p className="my-4 leading-7 font-medium">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 italic">
        <BlockquoteIcon size={18} className="mr-1 inline" />
        {children}
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

  /* ----------   CUSTOM OBJECTS   ---------- */
  types: {
    horizontalRule: () => (
      <hr className="mt-1 border-t-2 border-blue-950 rounded-full mx-1" />
    ),
    lineBreak: () => <br />,
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
          {value.heading}
        </h2>
      );
    },
  },

  /* ----------   MARKS (inline) ---------- */
  marks: {
    em: ({ children }) => <em className="italic">{children}</em>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    underline: ({ children }) => <span className="underline">{children}</span>,
    blueBold: ({ children }) => (
      <strong className="font-bold text-blue-500">{children}</strong>
    ),
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
    inlineLatex: ({ value }) => (
      <InlineMath errorColor="#cc0000">{value.code}</InlineMath>
    ),
  },
};
