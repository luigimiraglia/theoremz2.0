"use client";

import { useMemo } from "react";
import { PortableText } from "@portabletext/react";
import { ptComponents } from "@/lib/ptComponents";
import type { PortableTextBlock } from "sanity";

export default function PortableRenderer({
  value,
}: {
  value: PortableTextBlock[];
}) {
  // Override per non lazy‑loadare la PRIMA immagine del contenuto (potenziale LCP)
  const components = useMemo(() => {
    let firstImageUsed = false;
    return {
      ...ptComponents,
      types: {
        ...ptComponents.types,
        imageExternal: ({ value }: any) => {
          const url: string = value?.url || "";
          const alt: string = value?.alt || "Immagine";
          const eager = !firstImageUsed;
          firstImageUsed = true;

          // Sync with ptComponents: infer local image dimensions to prevent CLS
          const dims = (() => {
            try {
              const u = new URL(url, "https://theoremz.com");
              const isLocal = (!u.host || u.host === "theoremz.com") && u.pathname.startsWith("/images/");
              if (isLocal) {
                const name = u.pathname.split("/").pop()?.toLowerCase() || "";
                const known: Record<string, [number, number]> = {
                  "ap-esa.webp": [2000, 1396],
                  "ap-pent.webp": [2000, 1201],
                  "ap-triangolo.webp": [2000, 1006],
                  "ap-quadrato.webp": [2000, 985],
                };
                if (known[name]) return { width: known[name][0], height: known[name][1] };
                const m = name.match(/-(\d+)x(\d+)\.(?:webp|jpe?g|png)$/);
                if (m) return { width: Number(m[1]), height: Number(m[2]) };
              }
            } catch {}
            return null as null | { width: number; height: number };
          })();

          const sizes = "(min-width: 1024px) 40vw, (min-width: 640px) 60vw, 90vw";
          const style = dims ? ({ aspectRatio: `${dims.width} / ${dims.height}` } as React.CSSProperties) : undefined;

          return (
            <div className="my-6 flex justify-center">
              <img
                src={url}
                alt={alt}
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager ? ("high" as const) : undefined}
                decoding="async"
                sizes={sizes}
                width={dims?.width}
                height={dims?.height}
                style={style}
                className="rounded-xl max-w-9/10 sm:max-w-3/5 lg:max-w-2/5 h-auto"
              />
            </div>
          );
        },
      },
    } as typeof ptComponents;
  }, [value]);

  return <PortableText value={value} components={components} />;
}
