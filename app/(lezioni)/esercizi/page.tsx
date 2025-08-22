"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import ExerciseCard from "@/components/ExerciseCard";
import type { PortableTextBlock } from "sanity";

/* ---------------- Types ---------------- */

export type ExerciseDoc = {
  _id: string;
  titolo: string;
  testo?: PortableTextBlock[];
  soluzione?: PortableTextBlock[];
  passaggi?: PortableTextBlock[];
  lesson?: { title?: string; slug?: string } | null;
};

type ApiExerciseItem = {
  _id: string;
  titolo: string;
  testo?: PortableTextBlock[];
  soluzione?: PortableTextBlock[];
  passaggi?: PortableTextBlock[];
  lessonSlug?: string;
  lessonTitle?: string;
};

type ApiResponse = {
  ok: boolean;
  items: ApiExerciseItem[];
  error?: string;
};

/* -------------- UI helpers -------------- */

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white [.dark_&]:bg-slate-800 shadow-sm min-w-[340px]">
      <div className="h-3 w-full rounded-t-2xl bg-gradient-to-r to-sky-500/40 from-blue-500/40" />
      <div className="p-4">
        <div className="h-5 w-2/3 bg-slate-200 [.dark_&]:bg-slate-700 rounded mb-3" />
        <div className="h-16 w-full bg-slate-100 [.dark_&]:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

// Fisher–Yates
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- Page ---------------- */

export default function EserciziPage() {
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState<ExerciseDoc[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(12);

  useEffect(() => {
    let on = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/exercises-all", { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;

        if (!json.ok) throw new Error(json.error || "Errore Sanity");

        const mapped: ExerciseDoc[] = (json.items || []).map((d) => ({
          _id: d._id,
          titolo: d.titolo,
          testo: d.testo,
          soluzione: d.soluzione,
          passaggi: d.passaggi,
          lesson: d.lessonSlug
            ? { title: d.lessonTitle, slug: d.lessonSlug }
            : null,
        }));

        if (!on) return;
        setAll(shuffle(mapped)); // randomizza ordine iniziale
      } catch (e: unknown) {
        if (on) setError(e instanceof Error ? e.message : "Errore sconosciuto");
      } finally {
        if (on) setLoading(false);
      }
    })();

    return () => {
      on = false;
    };
  }, []);

  // Ricerca: titolo + titolo lezione
  const filtered = useMemo<ExerciseDoc[]>(() => {
    const q = query.trim();
    if (!q) return all;
    const fuse = new Fuse<ExerciseDoc>(all, {
      threshold: 0.34,
      ignoreLocation: true,
      keys: [
        { name: "titolo", weight: 0.7 },
        { name: "lesson.title", weight: 0.3 },
      ],
    });
    return fuse.search(q).map((r) => r.item);
  }, [query, all]);

  // Lista visibile (supporta load more)
  const visible = filtered.slice(0, visibleCount);
  const canLoadMore = filtered.length > visible.length;

  function loadMore() {
    setVisibleCount((n) => n + 12);
  }

  function reshuffle() {
    const ids = new Set(filtered.map((e) => e._id));
    const shuffled = shuffle(filtered);
    setAll((prev) => prev.filter((e) => !ids.has(e._id)).concat(shuffled));
  }

  return (
    <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 mb-10">
      {/* Barra di ricerca / hero */}
      <div className="rounded-2xl bg-gray-100/60 [.dark_&]:bg-slate-800 py-4 px-4 sm:px-6 flex flex-col text-slate-800 [.dark_&]:text-white md:flex-row md:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Esercizi
        </h1>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="🔍 Cerca per titolo o lezione…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(12);
          }}
          className="w-full md:w-[520px] rounded-xl border-2 border-[#2b7fff] bg-white [.dark_&]:bg-slate-800 px-4 py-2 text-[15px] shadow-sm focus:outline-none"
        />
        <button
          onClick={reshuffle}
          className="rounded-xl border-2 border-[#2b7fff] [.dark_&]:text-white bg-gradient-to-r from-[#2b7fff]/15 to-[#559dff]/25 px-3 py-2 text-sm font-semibold text-[#1a5fd6] hover:from-[#2b7fff]/25 hover:to-[#559dff]/35"
          title="Mescola casualmente"
        >
          Mescola
        </button>
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : error ? (
          <div className="col-span-full text-red-600 font-medium">{error}</div>
        ) : visible.length ? (
          visible.map((ex) => <ExerciseCard key={ex._id} ex={ex} />)
        ) : (
          <div className="col-span-full text-slate-500">
            Nessun esercizio trovato.
          </div>
        )}
      </div>

      {/* Load more */}
      {canLoadMore && !loading && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            className="rounded-xl border-4 border-[#2b7fff] bg-gradient-to-r from-[#2b7fff]/15 to-[#559dff]/25 px-5 py-2.5 text-sm font-extrabold text-[#1a5fd6] hover:from-[#2b7fff]/25 hover:to-[#559dff]/35"
          >
            Carica altri
          </button>
        </div>
      )}
    </div>
  );
}
