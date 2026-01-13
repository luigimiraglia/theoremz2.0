"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import ExerciseCard from "@/components/ExerciseCard";
import type { PortableTextBlock } from "sanity";

const BlackPopup = dynamic(() => import("@/components/BlackPopup"), { ssr: false });

type ExerciseRow = {
  _id: string;
  titolo: string;
  testo?: PortableTextBlock[];
  soluzione?: PortableTextBlock[];
  passaggi?: PortableTextBlock[];
};

type Props = {
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
};

export default function ExercisesLessonClient({
  lessonId,
  lessonTitle,
  lessonSlug,
}: Props) {
  const { isSubscribed } = useAuth();
  const [items, setItems] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    if (isSubscribed === false) return;
    if (isSubscribed === null) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { getAuth } = await import("firebase/auth");
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) {
          setShowPopup(true);
          return;
        }
        const res = await fetch(
          `/api/exercises?lessonId=${encodeURIComponent(lessonId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.ok) {
          if (res.status === 401 || res.status === 403) {
            setShowPopup(true);
            return;
          }
          throw new Error(payload?.error || "Errore caricamento");
        }
        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        setItems(nextItems);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Errore caricamento";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [lessonId, isSubscribed]);

  if (isSubscribed === false) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Accesso riservato</h2>
        <p className="mt-2 text-sm text-slate-600">
          Le soluzioni e i passaggi sono disponibili solo per gli abbonati Black.
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setShowPopup(true)}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            Scopri Theoremz Black
          </button>
          <Link
            href="/account"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
          >
            Vai al tuo account
          </Link>
        </div>
        {showPopup && (
          <div
            onClick={() => setShowPopup(false)}
            className="fixed inset-0 z-50 backdrop-blur-md flex justify-center items-center"
          >
            <div onClick={(e) => e.stopPropagation()}>
              <BlackPopup />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isSubscribed === null || loading) {
    return (
      <div className="mt-6 flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-slate-600">
        Caricamento esercizi...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className="mt-6 text-slate-500">Nessun esercizio disponibile per questa lezione.</p>
    );
  }

  return (
    <>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((ex) => (
          <ExerciseCard
            key={ex._id}
            ex={{
              _id: ex._id,
              titolo: ex.titolo,
              testo: ex.testo,
              soluzione: ex.soluzione,
              passaggi: ex.passaggi,
              lesson: { title: lessonTitle, slug: lessonSlug },
            }}
          />
        ))}
      </div>

      {showPopup && (
        <div
          onClick={() => setShowPopup(false)}
          className="fixed inset-0 z-50 backdrop-blur-md flex justify-center items-center"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <BlackPopup />
          </div>
        </div>
      )}
    </>
  );
}
