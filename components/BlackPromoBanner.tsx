"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const LS_KEY = "black-sticky-banner:closed:v1";
const HEADER_SELECTOR = "#site-header";
const GAP_PX = 8; // ⬅️ gap ridotto a 4px

export default function BlackStickyPromo() {
  const { isSubscribed } = useAuth();
  const pathname = usePathname();

  const [closed, setClosed] = useState(true);
  const [topOffset, setTopOffset] = useState<number | null>(null);

  const shouldShow = useMemo(() => {
    const p = (pathname || "").toLowerCase();
    // Do not show on sales pages and lead form page
    if (
      p.startsWith("/black") ||
      p.startsWith("/mentor") ||
      p.startsWith("/contatto-rapido")
    )
      return false;
    return isSubscribed !== true;
  }, [pathname, isSubscribed]);

  useEffect(() => {
    const header = document.querySelector(
      HEADER_SELECTOR
    ) as HTMLElement | null;
    const computeTop = () => {
      if (!header) {
        setTopOffset(8 + GAP_PX);
        return;
      }
      const css = getComputedStyle(header);
      const stickyTop = parseFloat(css.top || "0") || 0;
      const h = header.offsetHeight || 0;
      setTopOffset(Math.max(0, Math.round(stickyTop + h + GAP_PX)));
    };

    computeTop();

    let ro: ResizeObserver | null = null;
    if (header && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => requestAnimationFrame(computeTop));
      ro.observe(header);
    }

    const onResize = () => requestAnimationFrame(computeTop);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      const wasClosed = v === "1";
      setClosed(!shouldShow || wasClosed);
    } catch {
      setClosed(!shouldShow);
    }
  }, [shouldShow]);

  if (closed || topOffset == null) return null;

  return (
    <div
      role="region"
      aria-label="Promozione Theoremz Black"
      className={[
        "sticky z-40 mx-2 xl:mx-auto",
        "w-[min(95vw,56rem)]",
        "transition-transform motion-safe:duration-200",
      ].join(" ")}
      style={{ top: topOffset }}
    >
      <div
        className={[
          "rounded-2xl border border-white/20",
          "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white",
          "shadow-lg shadow-blue-900/15",
          "backdrop-blur supports-[backdrop-filter]:backdrop-blur-md",
        ].join(" ")}
      >
        <div className="px-4 py-2 sm:py-2 flex items-center gap-3">
          {/* MOBILE: solo “Scopri Theoremz Black” */}
          <span className="sm:hidden text-sm font-semibold">
            Scopri{" "}
            <span className="underline decoration-white/60 underline-offset-2">
              Theoremz Black!
            </span>
          </span>

          {/* DESKTOP: testo completo */}
          <span className="hidden sm:inline text-[15px] font-semibold">
            Scopri{" "}
            <span className="underline decoration-white/60 underline-offset-2">
              Theoremz Black
            </span>
            : aiuto compiti, videolezioni, esercizi avanzati e molto altro.
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/black"
              className="inline-flex items-center justify-center rounded-lg bg-white/95 text-blue-700 font-semibold text-sm px-3 py-1.5 hover:bg-white transition"
            >
              Scopri
            </Link>

            <button
              aria-label="Chiudi"
              onClick={() => {
                try {
                  localStorage.setItem(LS_KEY, "1");
                } catch {}
                setClosed(true);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M6.225 4.811L4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
