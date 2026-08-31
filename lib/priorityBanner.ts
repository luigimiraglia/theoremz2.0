"use client";

import { useEffect, useState } from "react";

/**
 * Canale condiviso tra i banner fixed sotto l'header (promo Black, PDF
 * esercizi gratuiti, ...) per evitare che due si sovrappongano: chi ha
 * priorità dichiara "active" e gli altri si nascondono finché non torna false.
 */
export const PRIORITY_BANNER_EVENT = "theoremz:priority-banner";

export function setPriorityBannerActive(source: string, active: boolean) {
  try {
    window.dispatchEvent(
      new CustomEvent(PRIORITY_BANNER_EVENT, { detail: { source, active } })
    );
  } catch {}
}

export function usePriorityBannerActive() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      setActive(detail?.active === true);
    };
    window.addEventListener(PRIORITY_BANNER_EVENT, onEvent);
    return () => window.removeEventListener(PRIORITY_BANNER_EVENT, onEvent);
  }, []);

  return active;
}
