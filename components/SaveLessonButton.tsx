"use client";
import { useState, useMemo, type ComponentType } from "react";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/lib/AuthContext";
import type { User as FirebaseUser } from "firebase/auth";

type AuthReturn = {
  user: (FirebaseUser & { uid: string }) | null;
  savedLessons: string[];
  refreshSavedLessons: () => Promise<void>;
};

type LessonMeta = {
  id: string;
  slug: string;
  title: string;
  thumb?: string | null;
};

export default function SaveLessonButton({
  lesson,
  className = "",
}: {
  lesson: LessonMeta;
  className?: string;
}) {
  const { user, savedLessons, refreshSavedLessons, isSubscribed } =
    useAuth() as AuthReturn & { isSubscribed?: boolean | null };
  const [busy, setBusy] = useState(false);
  const [Popup, setPopup] = useState<ComponentType | null>(null);
  const [state, setState] = useState<"idle" | "popup">("idle");

  const slug = useMemo(
    () => (typeof lesson?.slug === "string" ? lesson.slug.trim() : ""),
    [lesson?.slug]
  );
  const lessonId = lesson?.id || slug;
  const title = lesson?.title?.trim() || slug;
  const thumb = lesson?.thumb ?? null;
  const isValid = slug.length > 0;

  const isSaved =
    Boolean(lessonId) &&
    savedLessons &&
    Array.isArray(savedLessons) &&
    savedLessons.includes(slug);

  const toggle = async () => {
    // Gating: serve utente loggato e abbonamento
    if (!user || !isSubscribed) {
      if (!Popup) {
        const mod = await import("@/components/BlackPopup");
        setPopup(() => mod.default ?? (mod as any));
      }
      setState("popup");
      return;
    }

    if (!isValid || busy) return;
    setBusy(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) {
        throw new Error("missing_token");
      }

      if (isSaved) {
        await fetch(`/api/me/saved-lessons/${encodeURIComponent(lessonId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`/api/me/saved-lessons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lessonId,
            slug,
            title,
            thumb,
          }),
        });
      }

      await refreshSavedLessons?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={toggle}
        disabled={!isValid || busy}
        className={`inline-flex shadow-md items-center font-semibold gap-1 px-2 py-1 text-sm rounded-lg transition-all duration-300 border 
        ${
          isSaved
            ? "bg-yellow-400 border-yellow-500 text-black hover:bg-yellow-300"
            : "bg-blue-600 border-blue-700 text-white hover:bg-blue-500"
        }
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={
          !isValid
            ? "Slug non valido"
            : isSaved
              ? "Rimuovi dai salvati"
              : "Salva lezione"
        }
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-[18px] w-[18px] transition-colors duration-300 ${isSaved ? "fill-yellow-700" : "fill-white"}`}
        >
          <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
        </svg>
        {isSaved ? "Salvata" : "Salva lezione"}
      </button>

      {state === "popup" && (
        <div
          onClick={() => setState("idle")}
          className="fixed inset-0 z-50 backdrop-blur-md flex justify-center items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-6 rounded-xl max-w-md w-full"
          >
            {Popup ? <Popup /> : null}
          </div>
        </div>
      )}
    </>
  );
}
