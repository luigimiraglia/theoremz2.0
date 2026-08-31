"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useHeaderOffset } from "@/lib/useHeaderOffset";
import { usePriorityBannerActive } from "@/lib/priorityBanner";

const LS_KEY = "black-sticky-banner:closed:v1";
const GAP_PX = 8;

// Pagine dove il banner non deve mai comparire: vendita Black e lead magnet.
const EXCLUDED_PREFIXES = [
  "/black",
  "/ilmetodotheoremz",
  "/metodo-theoremz-pdf",
  "/guida-metodo",
  "/contatto-rapido",
];

export default function BlackStickyPromo() {
  const { isSubscribed } = useAuth();
  const pathname = usePathname();

  const [closed, setClosed] = useState(true);
  const [entered, setEntered] = useState(false);
  const topOffset = useHeaderOffset(GAP_PX, 8 + GAP_PX);
  const hiddenByPriorityBanner = usePriorityBannerActive();

  const shouldShow = useMemo(() => {
    const p = (pathname || "").toLowerCase();
    if (EXCLUDED_PREFIXES.some((prefix) => p.startsWith(prefix))) return false;
    return isSubscribed === false;
  }, [pathname, isSubscribed]);

  useEffect(() => {
    try {
      const wasClosed = localStorage.getItem(LS_KEY) === "1";
      setClosed(!shouldShow || wasClosed);
    } catch {
      setClosed(!shouldShow);
    }
  }, [shouldShow]);

  useEffect(() => {
    if (closed) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [closed]);

  // Render nothing until we know the offset, to avoid a layout jump on mount.
  if (closed || topOffset == null) return null;

  const visible = entered && !hiddenByPriorityBanner;

  return (
    // Overlay fixed: nessun impatto sul layout (CLS) quando compare/scompare.
    <div
      role="region"
      aria-label="Promozione Theoremz Black"
      className={`fixed left-0 right-0 z-40 pointer-events-none transition-all duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0"
      }`}
      style={{ top: topOffset }}
      aria-hidden={!visible}
    >
      <div
        className={`mx-2 xl:mx-auto w-[min(95vw,56rem)] transition-transform duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
          visible ? "pointer-events-auto scale-100" : "pointer-events-none scale-[0.98]"
        }`}
      >
        <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-900/15 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
          {/* Sheen animata: pura decorazione, disattivata per chi preferisce meno movimento */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 motion-safe:animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-70"
          />

          <div className="relative flex items-center gap-3 px-4 py-2 sm:py-2">
            <span
              aria-hidden="true"
              className="relative hidden h-2 w-2 shrink-0 sm:block"
            >
              <span className="absolute inset-0 rounded-full bg-white motion-safe:animate-ping" />
              <span className="absolute inset-0 rounded-full bg-white" />
            </span>

            {/* MOBILE: solo "Scopri Theoremz Black" */}
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
                className="inline-flex items-center justify-center rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-blue-700 transition duration-200 hover:scale-[1.04] hover:bg-white active:scale-95"
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M6.225 4.811L4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
