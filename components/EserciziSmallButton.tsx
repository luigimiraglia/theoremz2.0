"use client";
import { useCallback, memo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { track, trackConversion } from "@/lib/analytics";
import Icon from "./Icon";
import AnimatedButtonWrapper from "./AnimatedButtonWrapper";
import BlackPopup from "./BlackPopup";

const EserciziSmallButton = memo(function EserciziSmallButton() {
  const { isSubscribed } = useAuth();
  const [showPopup, setShowPopup] = useState(false);

  const clickHandle = useCallback(async () => {
    try {
      track("exercise_cta_click", { where: "lesson_header" });
    } catch {}

    // Verifica se l'utente è autenticato e abbonato
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser || !isSubscribed) {
      // Traccia click popup per esercizi
      trackConversion("popup_click", "exercises_header", {
        popup_type: "exercises",
        location: "lesson_header",
        user_status: !currentUser ? "not_logged" : "not_subscribed",
      });

      // Se non è loggato o non è abbonato, mostra popup
      setShowPopup(true);
      return;
    }

    // Se è abbonato, continua con lo scroll normale
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

    // Safety: chiudi l'osservatore dopo 3s se non trova nulla
    setTimeout(() => mo.disconnect(), 3000);
  }, [isSubscribed]);

  const closePopup = () => setShowPopup(false);

  return (
    <>
      <AnimatedButtonWrapper delay={0}>
        <button
          onClick={clickHandle}
          className="min-w-0 flex-shrink py-1.5 px-2 sm:px-3 text-xs sm:text-sm font-semibold sm:font-bold shadow-md bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:brightness-110 hover:scale-105 transition-all duration-500 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
        >
          <Icon name="clipboard" size="sm" />
          <span className="truncate">Esercizi</span>
        </button>
      </AnimatedButtonWrapper>

      {showPopup && (
        <div
          onClick={closePopup}
          className="fixed inset-0 z-50 backdrop-blur-md flex justify-center items-center"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BlackPopup />
          </div>
        </div>
      )}
    </>
  );
});

export default EserciziSmallButton;
