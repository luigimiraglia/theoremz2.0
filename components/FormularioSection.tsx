"use client";
import { useAuth } from "@/lib/AuthContext";
import { useState, memo } from "react";
import { trackConversion } from "@/lib/analytics";
import Icon from "./Icon";
import AnimatedButtonWrapper from "./AnimatedButtonWrapper";
import BlackPopup from "./BlackPopup";
import { useToast } from "@/components/Toast";

const FormularioSection = memo(function FormularioSection({
  url,
}: {
  url?: string | null;
}) {
  const { isSubscribed } = useAuth();
  const toast = useToast();
  const [showPopup, setShowPopup] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const resolveUrl = (raw?: string | null) => {
    const trimmed = raw?.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("/")) {
      return new URL(trimmed, window.location.origin).toString();
    }
    return `https://${trimmed}`;
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOpening) return;
    setIsOpening(true);

    try {
      // Verifica se l'utente è autenticato e abbonato
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });
      const currentUser = auth.currentUser;

      if (currentUser && isSubscribed) {
        const target = resolveUrl(url);
        if (!target) {
          toast.error("Formulario non disponibile", "Manca il link nelle risorse.");
          return;
        }
        const opened = window.open(target, "_blank", "noopener,noreferrer");
        if (!opened) {
          window.location.assign(target);
        }
        return;
      }

      // Traccia click popup per formulario
      trackConversion("popup_click", "formulario", {
        popup_type: "formulario",
        location: "lesson_header",
        user_status: !currentUser ? "not_logged" : "not_subscribed",
      });

      // Se non è loggato o non è abbonato, mostra popup
      setShowPopup(true);
    } finally {
      setIsOpening(false);
    }
  };

  const closePopup = () => setShowPopup(false);

  return (
    <>
      <AnimatedButtonWrapper delay={0}>
        <button
          type="button"
          onClick={handleClick}
          disabled={isOpening}
          className="min-w-0 flex-shrink font-semibold sm:font-bold px-2 sm:px-3 py-1.5 text-xs sm:text-sm shadow-md rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:brightness-110 hover:scale-105 transition-all duration-500 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
        >
          <Icon name="calculator" size="sm" />
          <span className="truncate">Formulario</span>
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

export default FormularioSection;
