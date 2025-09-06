"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import ExerciseCard from "@/components/ExerciseCard";
import BlackPopup from "@/components/BlackPopup";
import { PortableTextBlock } from "sanity";

type ExerciseDoc = {
  _id: string;
  titolo: string;
  testo?: PortableTextBlock[];
  soluzione?: PortableTextBlock[];
  passaggi?: PortableTextBlock[];
};

export default function LessonExercises({
  lessonId,
  lessonTitle,
  lessonSlug,
}: {
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
}) {
  const { isSubscribed } = useAuth();
  const [state, setState] = useState<"idle" | "popup">("idle");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ExerciseDoc[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    // IDENTICA LOGICA: se non abbonato → popup; altrimenti esegui l'azione
    if (!isSubscribed) {
      setState("popup");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/exercises?lessonId=${encodeURIComponent(lessonId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore Sanity");
      setItems(json.items || []);
      setLoadedOnce(true);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Errore sconosciuto");
      }
    } finally {
      setLoading(false);
    }
  };

  const closePopup = () => setState("idle");

  return (
    <section className="mt-12">
      <div className="flex justify-center">
        <button
          id="lesson-exercises-cta"
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl  bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] px-8 sm:px-10 py-3 text-xl sm:text-2xl font-bold text-white hover:from-[#1a5fd6] hover:to-[#3d85ff] disabled:opacity-60"
        >
          {loading
            ? "Carico gli esercizi…"
            : loadedOnce
              ? "Ricarica esercizi"
              : "Mostra esercizi"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-red-600">Errore: {error}</p>
      )}

      {!!items.length && (
        <>
          {/* JSON-LD PracticeProblem per i primi 3 esercizi */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": items.slice(0, 3).map((ex) => ({
                  "@type": "PracticeProblem",
                  name: ex.titolo,
                  isAccessibleForFree: true,
                  eduQuestionType: "Esercizio svolto",
                  isPartOf: {
                    "@type": "LearningResource",
                    name: lessonTitle,
                    url: `https://theoremz.com/${lessonSlug}`,
                  },
                  hasPart: {
                    "@type": "Question",
                    name: ex.titolo,
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: [ex.soluzione, ex.passaggi, ex.testo]
                        .filter(Boolean)
                        .map((arr) =>
                          Array.isArray(arr)
                            ? (arr as any[])
                                .map((b: any) =>
                                  b?._type === "block"
                                    ? (b.children || [])
                                        .map((c: any) => c.text || "")
                                        .join("")
                                    : ""
                                )
                                .join(" ")
                            : ""
                        )
                        .join(" ")
                        .replace(/\s+/g, " ")
                        .trim(),
                    },
                  },
                })),
              }),
            }}
          />

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
          {items.map((ex: ExerciseDoc) => (
            <div key={ex._id} className="w-full">
              <ExerciseCard
                ex={{
                  _id: ex._id,
                  titolo: ex.titolo,
                  testo: ex.testo,
                  soluzione: ex.soluzione,
                  passaggi: ex.passaggi,
                  lesson: { title: lessonTitle, slug: lessonSlug },
                }}
              />
            </div>
          ))}
          </div>
        </>
      )}

      {state === "popup" && (
        <div
          onClick={closePopup}
          className="fixed inset-0 z-50 backdrop-blur-md flex justify-center items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-6 rounded-xl max-w-md w-full"
          >
            <BlackPopup />
          </div>
        </div>
      )}
    </section>
  );
}
