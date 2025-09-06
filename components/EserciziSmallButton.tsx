"use client";
import { useCallback } from "react";
import { track } from "@/lib/analytics";

export default function EserciziSmallButton() {
  const clickHandle = useCallback(() => {
    try {
      track("exercise_cta_click", { where: "lesson_header" });
    } catch {}
    const SELECTOR = "#lesson-exercises-cta, [data-exercises-cta]";
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const smoothScrollTo = (el: HTMLElement) => {
      const behavior: ScrollBehavior = prefersReduced ? "auto" : "smooth";
      // rAF per evitare layout thrash
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior, block: "center", inline: "nearest" });
        (el as HTMLButtonElement).focus?.({ preventScroll: true });
      });
    };

    let el = document.querySelector(SELECTOR) as HTMLElement | null;
    if (el) return smoothScrollTo(el);

    // Se il target è lazy/caricato dopo, usa MutationObserver (no polling)
    const mo = new MutationObserver(() => {
      el = document.querySelector(SELECTOR) as HTMLElement | null;
      if (el) {
        mo.disconnect();
        smoothScrollTo(el);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety: chiudi l’osservatore dopo 3s se non trova nulla
    setTimeout(() => mo.disconnect(), 3000);
  }, []);

  return (
    <button
      onClick={clickHandle}
      className="py-1 px-2 text-sm sm:py-1.5 sm:px-3 font-semibold shadow-md bg-gradient-to-r from-blue-600 to-sky-400 text-white rounded-lg"
    >
      Esercizi 👈
    </button>
  );
}
