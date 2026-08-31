"use client";

import { useEffect, useState } from "react";

const HEADER_SELECTOR = "#site-header";

/**
 * Calcola l'offset verticale subito sotto l'header sticky del sito, per
 * posizionare banner/overlay fixed senza sovrapporsi alla nav e senza causare
 * layout shift. Si aggiorna da solo se l'header cambia altezza (ResizeObserver)
 * o la finestra viene ridimensionata.
 */
export function useHeaderOffset(gapPx: number, fallback: number) {
  const [offset, setOffset] = useState<number | null>(null);

  useEffect(() => {
    const header = document.querySelector(HEADER_SELECTOR) as HTMLElement | null;

    const computeTop = () => {
      if (!header) {
        setOffset(fallback);
        return;
      }
      const css = getComputedStyle(header);
      const stickyTop = parseFloat(css.top || "0") || 0;
      const height = header.offsetHeight || 0;
      setOffset(Math.max(0, Math.round(stickyTop + height + gapPx)));
    };

    computeTop();

    let resizeObserver: ResizeObserver | null = null;
    if (header && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => requestAnimationFrame(computeTop));
      resizeObserver.observe(header);
    }

    const onResize = () => requestAnimationFrame(computeTop);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
    // gapPx/fallback sono costanti dal chiamante, non serve ricalcolare ad ogni render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return offset;
}
