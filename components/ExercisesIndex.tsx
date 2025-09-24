// components/ExercisesIndex.tsx
"use client";

import React, { useMemo, useState } from "react";
import ExerciseCard from "@/components/ExerciseCard";
import { PortableTextBlock } from "sanity";

export interface ExerciseDoc {
  _id: string;
  titolo: string;
  testo?: PortableTextBlock[];
  soluzione?: PortableTextBlock[];
  passaggi?: PortableTextBlock[];
  lesson?: { title?: string; slug?: string } | null;
}

export default function ExercisesIndex({
  initialData,
}: {
  initialData: ExerciseDoc[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return initialData;
    return initialData.filter((ex) => {
      const t = (ex.titolo || "").toLowerCase();
      const l = (ex.lesson?.title || "").toLowerCase();
      return t.includes(term) || l.includes(term);
    });
  }, [q, initialData]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_600px_at_10%_-20%,rgba(59,130,246,.25),transparent)]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Esercizi
            </h1>
            <p className="text-zinc-400 mt-1">
              Cerca per lezione collegata o per titolo.
            </p>
          </div>
          <div className="w-full sm:w-[420px]">
            <div className="relative">
              <label htmlFor="exidx-search" className="sr-only">Cerca esercizi</label>
              <input
                id="exidx-search"
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca lezione o titolo…"
                className="w-full rounded-2xl border border-zinc-700/70 bg-zinc-900/60 backdrop-blur px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,.03)]"
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                ⌘K
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((ex) => (
            <ExerciseCard key={ex._id} ex={ex} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 rounded-2xl border border-zinc-700/60 bg-zinc-900/50 p-10 text-center">
            <p className="text-zinc-300">
              Nessun esercizio trovato. Prova a cambiare la ricerca.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
