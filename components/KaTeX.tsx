import katex from "katex";
import React from "react";
import "katex/dist/katex.min.css";

type Props = { children: string };

export function KaInline({ children }: Props) {
  const html = React.useMemo(
    () =>
      katex.renderToString(children, {
        displayMode: false,
        throwOnError: false,
        strict: "ignore",
        errorColor: "#cc0000",
      }),
    [children]
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function KaBlock({ children }: Props) {
  const html = React.useMemo(
    () =>
      katex.renderToString(children, {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
        errorColor: "#cc0000",
      }),
    [children]
  );
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

