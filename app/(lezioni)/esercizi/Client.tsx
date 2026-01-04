/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions, react-hooks/exhaustive-deps */
"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import ExerciseCard from "@/components/ExerciseCard";
import type { PortableTextBlock } from "sanity";

export type ExerciseDoc = {
  _id: string;
  titolo: string;
  testo?: PortableTextBlock[];
  soluzione?: PortableTextBlock[];
  passaggi?: PortableTextBlock[];
  lesson?: { title?: string; slug?: string } | null;
};

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

export default function EserciziClient({
  initialItems,
  initialTotal,
  initialLimit,
}: {
  initialItems: ExerciseDoc[];
  initialTotal: number;
  initialLimit: number;
}) {
  const [query, setQuery] = useState("");
  const dq = useDeferredValue(query);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState<ExerciseDoc[]>(() => initialItems);
  const [filtered, setFiltered] = useState<ExerciseDoc[]>(() => initialItems);
  const [visibleCount, setVisibleCount] = useState<number>(initialLimit);
  const [total, setTotal] = useState<number>(initialTotal);
  const [offset, setOffset] = useState<number>(initialItems.length);
  const LIMIT = initialLimit;
  const fuseRef = useRef<any | null>(null);
  const fuseLoadedRef = useRef(false);

  // ricerca client con import dinamico di Fuse
  useEffect(() => {
    const q = dq.trim();
    if (!q) {
      setFiltered(all);
      return;
    }
    (async () => {
      if (!fuseLoadedRef.current) {
        const mod = await import("fuse.js");
        const FuseCtor = mod.default as any;
        fuseRef.current = new FuseCtor(all, {
          keys: ["titolo", "lesson.title"],
          threshold: 0.34,
          ignoreLocation: true,
        });
        fuseLoadedRef.current = true;
      } else {
        fuseRef.current?.setCollection?.(all);
      }
      const results = fuseRef.current.search(q);
      setFiltered(results.map((r: any) => r.item));
    })();
  }, [dq, all]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMore = offset < total || filtered.length > visible.length;

  // Fetch full details (testo/soluzione/passaggi) for currently visible cards missing them
  const visibleNeeding = useMemo(
    () =>
      visible
        .filter((e) => !(e.testo && e.testo.length) && !(e.soluzione && e.soluzione.length) && !(e.passaggi && e.passaggi.length))
        .map((e) => e._id),
    [visible]
  );

  useEffect(() => {
    if (!visibleNeeding.length) return;
    let cancelled = false;
    (async () => {
      try {
        const qs = encodeURIComponent(visibleNeeding.join(","));
        const res = await fetch(`/api/exercises-batch?ids=${qs}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Errore");
        const byId: Record<string, any> = {};
        for (const it of json.items || []) byId[it._id] = it;
        if (cancelled) return;
        setAll((prev) => prev.map((e) => (byId[e._id] ? { ...e, ...byId[e._id] } : e)));
        setFiltered((prev) => prev.map((e) => (byId[e._id] ? { ...e, ...byId[e._id] } : e)));
      } catch (e) {
        // swallow errors silently to avoid UI flicker
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visibleNeeding.join(",")]);

  async function loadMore() {
    if (filtered.length > all.length && visible.length < all.length) {
      setVisibleCount((n) => n + LIMIT);
      return;
    }
    if (offset >= total) {
      setVisibleCount((n) => n + LIMIT);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/exercises-list?offset=${offset}&limit=${LIMIT}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Errore Sanity");
      const mapped: ExerciseDoc[] = (json.items || []).map((d: any) => ({
        _id: d._id,
        titolo: d.titolo,
        lesson: d.lessonSlug ? { title: d.lessonTitle, slug: d.lessonSlug } : null,
      }));
      setAll((prev) => prev.concat(mapped));
      setOffset((json.offset || offset) + (json.limit || LIMIT));
      setVisibleCount((n) => n + LIMIT);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function reshuffle() {
    const ids = new Set(filtered.map((e) => e._id));
    const shuffled = shuffle(filtered);
    setAll((prev) => prev.filter((e) => !ids.has(e._id)).concat(shuffled));
  }

  return (
    <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 mb-10">
      <div className="rounded-2xl bg-gray-100/60 [.dark_&]:bg-slate-800 py-4 px-4 sm:px-6 flex flex-col text-slate-800 [.dark_&]:text-white md:flex-row md:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Esercizi</h1>
        <div className="flex-1" />
        <label htmlFor="exercise-search" className="sr-only">Cerca esercizi</label>
        <input
          id="exercise-search"
          name="q"
          type="text"
          placeholder="🔍 Cerca per titolo o lezione…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(LIMIT);
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

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
        {error ? (
          <div className="col-span-full text-red-600 font-medium">{error}</div>
        ) : visible.length ? (
          visible.map((ex) => <ExerciseCard key={ex._id} ex={ex} />)
        ) : loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <div className="col-span-full text-slate-500">Nessun esercizio trovato.</div>
        )}
      </div>

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
"/* eslint-disable @typescript-eslint/no-unused-vars */\n"
"/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions, react-hooks/exhaustive-deps */\n"
