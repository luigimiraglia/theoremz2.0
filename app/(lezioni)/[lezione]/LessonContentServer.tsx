import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "sanity";
import { ptComponents } from "@/lib/ptComponents";

// Server component: renders lesson content without hydrating heavy libs on client.
// It also marks the first image as eager/high to improve LCP.
export default function LessonContentServer({
  value,
}: {
  value: PortableTextBlock[];
}) {
  let firstImageUsed = false;

  // Genera srcset responsive per immagini ospitate su cdn.sanity.io
  function buildSanitySrcSet(url: string): string | null {
    try {
      const u = new URL(url);
      if (!/cdn\.sanity\.io$/i.test(u.hostname)) return null;
      const widths = [360, 480, 640, 768, 960, 1200, 1600, 2000];
      const parts: string[] = [];
      for (const w of widths) {
        const uw = new URL(u.toString());
        uw.searchParams.set("w", String(w));
        if (!uw.searchParams.has("auto")) uw.searchParams.set("auto", "format");
        parts.push(`${uw.toString()} ${w}w`);
      }
      return parts.join(", ");
    } catch {
      return null;
    }
  }

  const components = {
    ...ptComponents,
    types: {
      ...ptComponents.types,
      imageExternal: ({ value }: any) => {
        const url: string = value?.url || "";
        const alt: string = value?.alt || "Immagine";
        const eager = !firstImageUsed;
        firstImageUsed = true;

        // Infer local image dimensions (prevents CLS); mirrors ptComponents logic
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
        const srcSet = buildSanitySrcSet(url);
        const style = dims ? ({ aspectRatio: `${dims.width} / ${dims.height}` } as React.CSSProperties) : undefined;

        return (
          <div className="my-6 flex justify-center">
            <img
              src={url}
              alt={alt}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? ("high" as const) : undefined}
              decoding="async"
              srcSet={srcSet ?? undefined}
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

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <PortableText value={value} components={components} />
    </div>
  );
}
