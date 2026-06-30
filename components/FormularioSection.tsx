"use client";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, memo } from "react";
import { trackConversion } from "@/lib/analytics";
import Icon from "./Icon";
import AnimatedButtonWrapper from "./AnimatedButtonWrapper";
import BlackPopup from "./BlackPopup";
import { useToast } from "@/components/Toast";

const FormularioSection = memo(function FormularioSection({
  lessonId,
  lessonTitle,
  lessonSlug,
}: {
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
}) {
  const { isSubscribed } = useAuth();
  const toast = useToast();
  const [showPopup, setShowPopup] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
        const token = await currentUser.getIdToken();
        const response = await fetch(
          `/api/formulario-pdf?lessonId=${encodeURIComponent(lessonId)}&v=${Date.now()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          let message = "Non sono riuscito a generare il formulario.";
          try {
            const data = await response.json();
            if (typeof data?.error === "string") message = data.error;
          } catch {}
          toast.error("Formulario non disponibile", message);
          return;
        }

        const blob = await response.blob();
        const nextUrl = URL.createObjectURL(blob);
        const fileName = `${safeFileName(lessonTitle || lessonSlug)}-formulario-theoremz.pdf`;

        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextUrl;
        });
        setPreviewFileName(fileName);

        trackConversion("premium_resource_preview", "formulario_pdf", {
          popup_type: "formulario",
          location: "lesson_header",
          lesson_id: lessonId,
          lesson_slug: lessonSlug,
        });
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
  const closePreview = () => {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPreviewFileName("");
  };

  const downloadPreview = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = previewFileName || `${safeFileName(lessonTitle || lessonSlug)}-formulario-theoremz.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    trackConversion("premium_resource_download", "formulario_pdf", {
      popup_type: "formulario",
      location: "lesson_header_preview",
      lesson_id: lessonId,
      lesson_slug: lessonSlug,
    });
  };

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
          <span className="truncate">{isOpening ? "Carico..." : "Formulario"}</span>
        </button>
      </AnimatedButtonWrapper>
      {previewUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-5"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="Anteprima formulario"
        >
          <div
            className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-600">
                  Theoremz formulario
                </div>
                <h3 className="mt-1 truncate text-base font-black leading-tight text-slate-950 [.dark_&]:text-white sm:text-lg">
                  {lessonTitle}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={downloadPreview}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700 sm:text-sm"
                >
                  Scarica PDF
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800 [.dark_&]:text-slate-100 [.dark_&]:hover:bg-slate-700 sm:text-sm"
                  aria-label="Chiudi anteprima formulario"
                >
                  Chiudi
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-100 p-2 [.dark_&]:bg-slate-950 sm:p-3">
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                title={`Anteprima formulario ${lessonTitle}`}
                className="h-full w-full rounded-xl border border-slate-200 bg-white [.dark_&]:border-slate-700"
              />
            </div>
          </div>
        </div>
      )}
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

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "formulario";
}

export default FormularioSection;
