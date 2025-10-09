"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import ExerciseCard from "@/components/ExerciseCard";
import BlackPopup from "@/components/BlackPopup";
import Link from "next/link";
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
  const router = useRouter();
  const [state, setState] = useState<"idle" | "popup">("idle");
  const [items, setItems] = useState<ExerciseDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      // Verifica direttamente se Firebase ha un utente autenticato
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        // Se non c'è utente Firebase, vai al login
        window.location.href = "/register";
        return;
      }

      // Se l'utente è loggato ma non abbonato, mostra popup
      if (!isSubscribed) {
        setState("popup");
        return;
      }

      // Se tutto ok, carica gli esercizi
      setError(null);
      const res = await fetch(
        `/api/exercises?lessonId=${encodeURIComponent(lessonId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore Sanity");
      setItems(json.items || []);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Errore sconosciuto");
      }
    }
  };

  const handleSimulaClick = async () => {
    try {
      // Verifica direttamente se Firebase ha un utente autenticato
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();

      // Aspetta che Firebase Auth si inizializzi completamente
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });

      const currentUser = auth.currentUser;

      console.log("Debug auth:", {
        currentUser: !!currentUser,
        isSubscribed,
        userEmail: currentUser?.email,
        authReady: true,
      });

      if (!currentUser) {
        console.log("No current user, redirecting to register");
        window.location.href = "/register";
        return;
      }

      // Se l'utente è loggato ma non abbonato, mostra popup
      if (!isSubscribed) {
        console.log("User logged but not subscribed, showing popup");
        setState("popup");
        return;
      }

      console.log("All checks passed, redirecting to simula-verifica");
      // Se tutto ok, vai alla simulazione usando Next.js router
      const url = `/simula-verifica?lessonId=${encodeURIComponent(lessonId)}&slug=${encodeURIComponent(lessonSlug)}&title=${encodeURIComponent(lessonTitle)}`;
      router.push(url);
    } catch (error) {
      console.error("Errore verifica auth:", error);
      // In caso di errore, vai al login per sicurezza
      window.location.href = "/register";
    }
  };

  const handleEserciziClick = async () => {
    await handleClick();
  };

  const closePopup = () => setState("idle");

  return (
    <section className="mt-12">
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={handleEserciziClick}
          className="w-full sm:w-auto flex-shrink min-w-0 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 sm:px-6 py-3 text-sm sm:text-base font-extrabold text-white hover:brightness-110"
        >
          <span className="truncate">Esercizi</span>
        </button>

        <button
          onClick={handleSimulaClick}
          className="w-full sm:w-auto flex-shrink min-w-0 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 sm:px-6 py-3 text-sm sm:text-base font-extrabold text-white hover:brightness-110"
        >
          <span className="truncate">Simula verifica</span>
        </button>

        <Link
          href={`/flashcards?lesson=${lessonId}`}
          className="w-full sm:w-auto flex-shrink min-w-0 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 sm:px-6 py-3 text-sm sm:text-base font-extrabold text-white hover:brightness-110"
        >
          <span className="truncate">Flashcards</span>
        </Link>
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
