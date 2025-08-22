"use client";

import { useEffect, useRef } from "react";

/**
 * Senja reviews embed (lazy):
 * - Carica lo script solo quando il widget entra in viewport (IntersectionObserver).
 * - Evita doppi caricamenti se si rientra nella pagina.
 * - Richiama window.Senja?.reload() dopo il load per idratare.
 */
export default function SenjaEmbed({
  id,
  mode, // es: "wall", "carousel", "grid" (opzionale)
  className,
}: {
  id: string;
  mode?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let loaded = !!document.querySelector(
      `script[src^="https://widget.senja.io/widget/${id}/platform.js"]`
    );

    const load = () => {
      if (loaded) {
        (window as any).Senja?.reload?.();
        return;
      }
      const s = document.createElement("script");
      s.src = `https://widget.senja.io/widget/${id}/platform.js`;
      s.async = true;
      s.defer = true;
      s.onload = () => (window as any).Senja?.reload?.();
      document.body.appendChild(s);
      loaded = true;
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            load();
            io.disconnect();
          }
        },
        { rootMargin: "200px 0px" }
      );
      io.observe(el);
      return () => io.disconnect();
    } else {
      load();
    }
  }, [id]);

  return (
    <div
      ref={ref}
      className={["senja-embed", className].filter(Boolean).join(" ")}
      data-id={id}
      {...(mode ? ({ "data-mode": mode } as any) : {})}
    />
  );
}
