"use client";

import { useState, useEffect, useMemo, useRef, useDeferredValue } from "react";
import Image from "next/image";
import Link from "next/link";
import LazyOnVisible from "@/components/LazyOnVisible";
import CategoryBlock from "@/components/CategoryBlock";

type Lesson = {
  _id: string;
  title: string;
  nomeAbbreviato?: string;
  categoria: string[];
  classe: string[];
  slug: { current: string };
  thumbnailUrl?: string;
};

const CLASSI_SUPERIORI = [
  "1º Scientifico",
  "2º Scientifico",
  "3º Scientifico",
  "4º Scientifico",
  "5º Scientifico",
  "1º Classico",
  "2º Classico",
  "3º Classico",
  "4º Classico",
  "5º Classico",
  "1º Linguistico",
  "2º Linguistico",
  "3º Linguistico",
  "4º Linguistico",
  "5º Linguistico",
];
const CLASSI_MEDIE = ["1º Media", "2º Media", "3º Media"];

/* Skeleton card (leggero) */
function SkeletonCard() {
  return (
    <div className="rounded-2xl min-w-[320px] border-2 border-transparent">
      <div className="h-36 rounded-t-2xl bg-gray-200 [.dark_&]:bg-slate-700" />
      <div className="h-9 rounded-b-xl bg-gray-300 [.dark_&]:bg-slate-600 mt-[2px]" />
    </div>
  );
}

export default function MatematicaClient({
  initialLessons,
}: {
  initialLessons: Lesson[];
}) {
  const [query, setQuery] = useState("");
  const dq = useDeferredValue(query); // input più fluido senza jank
  const [interfaceMode, setInterfaceMode] = useState<"medie" | "superiori">(
    "superiori"
  );
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);

  const [lessons] = useState<Lesson[]>(() => initialLessons); // immutabile
  const [filteredLessons, setFilteredLessons] =
    useState<Lesson[]>(initialLessons);

  // Stato di espansione per categoria (solo mobile): set di nomi categoria
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set()
  );

  // Fuse on-demand (solo quando si digita)
  const fuseRef = useRef<any | null>(null);
  const fuseLoadedRef = useRef(false);

  useEffect(() => {
    const q = dq.trim();
    if (!q) {
      setFilteredLessons(lessons);
      return;
    }
    (async () => {
      if (!fuseLoadedRef.current) {
        const mod = await import("fuse.js");
        const FuseCtor = mod.default as any;
        fuseRef.current = new FuseCtor(lessons, {
          keys: ["title", "nomeAbbreviato"],
          threshold: 0.35,
          ignoreLocation: true,
        });
        fuseLoadedRef.current = true;
      } else {
        fuseRef.current?.setCollection?.(lessons);
      }
      const results = fuseRef.current.search(q);
      setFilteredLessons(results.map((r: any) => r.item));
    })();
  }, [dq, lessons]);

  const filteredByInterface = useMemo(() => {
    const validClassi =
      interfaceMode === "medie" ? CLASSI_MEDIE : CLASSI_SUPERIORI;
    return filteredLessons.filter((lesson) => {
      const inInterface = lesson.classe.some((c) => validClassi.includes(c));
      const inClasse = selectedClasse
        ? lesson.classe.includes(selectedClasse)
        : true;
      return inInterface && inClasse;
    });
  }, [filteredLessons, interfaceMode, selectedClasse]);

  const groupedByCategory = useMemo(() => {
    return filteredByInterface.reduce(
      (acc, lesson) => {
        for (const cat of lesson.categoria) {
          (acc[cat] ||= []).push(lesson);
        }
        return acc;
      },
      {} as Record<string, Lesson[]>
    );
  }, [filteredByInterface]);

  const visibleClassi =
    interfaceMode === "medie" ? CLASSI_MEDIE : CLASSI_SUPERIORI;

  // LCP: individua primo slug visibile per promuovere l’immagine
  const firstVisibleSlug = useMemo(() => {
    if (dq || selectedClasse)
      return filteredByInterface[0]?.slug.current ?? null;
    const firstGroup = Object.values(groupedByCategory)[0];
    return firstGroup?.[0]?.slug.current ?? null;
  }, [dq, selectedClasse, filteredByInterface, groupedByCategory]);

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="relative max-w-screen-xl xl:mx-auto mx-6 mb-6">
      {/* Switch superiori/medie + classe */}
      <div className="flex mb-2 gap-2 justify-center sm:justify-start">
        <div className="flex gap-2 h-fit">
          <div className="flex rounded-lg bg-[#eee] p-1 text-[14px] flex-wrap h-fit">
            {["superiori", "medie"].map((mode) => (
              <label key={mode} className="flex-1 text-center h-fit">
                <input
                  type="radio"
                  name="interface-mode"
                  className="hidden"
                  checked={interfaceMode === mode}
                  onChange={() => {
                    setInterfaceMode(mode as "medie" | "superiori");
                    setSelectedClasse(null);
                    setExpandedCats(new Set()); // reset espansioni cambiando vista
                  }}
                />
                <span
                  className={`flex cursor-pointer items-center justify-center rounded-md px-2 py-0.5 text-slate-700 transition-all duration-150 ease-in-out ${
                    interfaceMode === mode ? "bg-white font-semibold" : ""
                  }`}
                >
                  {mode === "superiori" ? "Superiori" : "Medie"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <select
          value={selectedClasse || ""}
          onChange={(e) => {
            setSelectedClasse(e.target.value || null);
            setExpandedCats(new Set());
          }}
          className="text-white font-semibold rounded-lg bg-blue-500 border border-blue-500 p-1 text-sm"
          aria-label="Filtra per classe"
        >
          <option value="">Tutte le classi</option>
          {visibleClassi.map((classe) => (
            <option key={classe} value={classe}>
              {classe}
            </option>
          ))}
        </select>
      </div>

      {/* Barra di ricerca */}
      <div className="[.dark_&]:bg-slate-800/80 bg-gray-50 rounded-2xl py-8 px-6 flex flex-col sm:flex-row justify-center items-center gap-4">
        <h1 className="text-2xl font-bold">Matematica</h1>
        <input
          type="text"
          placeholder="🔍 Cerca lezione..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setExpandedCats(new Set()); // reset espansioni quando si cerca
          }}
          className="w-full sm:w-65 px-4 py-2 rounded-xl border border-gray-300"
          aria-label="Cerca lezione"
        />
      </div>

      {/* Risultati */}
      <div className="mt-2 space-y-6">
        {dq || selectedClasse ? (
          // Vista ricerca/filtri: lasciamo tutto com'è (nessun gate mobile qui)
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {filteredByInterface.map((lesson) => {
              const lcp = lesson.slug.current === firstVisibleSlug;
              return (
                <Link href={`/${lesson.slug.current}`} key={lesson._id} prefetch={false}>
                  <div className="rounded-2xl bg-gray-100/60 min-w-[320px] border-2 border-slate-800 hover:shadow-[-5px_6px_0_0_#2b7fff] hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
                    <div className="h-36 overflow-hidden rounded-t-2xl bg-white">
                      <Image
                        src={
                          lesson.thumbnailUrl || "/images/thumb/in-arrivo.webp"
                        }
                        alt={lesson.title}
                        width={320}
                        height={180}
                        sizes="(max-width: 640px) 100vw, 320px"
                        className="object-cover px-8 mx-auto"
                        priority={lcp}
                        loading={lcp ? "eager" : "lazy"}
                        fetchPriority={lcp ? "high" : "auto"}
                      />
                    </div>
                    <div className="bg-slate-800 text-white text-center py-2 rounded-b-xl font-medium">
                      {lesson.nomeAbbreviato || lesson.title}
                    </div>
                  </div>
                </Link>
              );
            })}
            {filteredByInterface.length === 0 && (
              <div className="text-sm text-slate-500 mt-4">
                Nessun risultato.
              </div>
            )}
          </div>
        ) : (
          // Vista per categorie (mobile: mostra solo la prima voce fino a espansione)
          Object.entries(groupedByCategory).map(([categoria, lezioni], idx) => {
            const expanded = expandedCats.has(categoria);
            return idx < 2 ? (
              <CategoryBlock
                key={categoria}
                categoria={categoria}
                lezioni={lezioni}
                firstVisibleSlug={firstVisibleSlug}
                expanded={expanded}
                onToggle={() => toggleCategory(categoria)}
              />
            ) : (
              <LazyOnVisible
                key={categoria}
                component="CategoryBlock"
                props={{
                  categoria,
                  lezioni,
                  firstVisibleSlug,
                  expanded,
                  onToggle: () => toggleCategory(categoria),
                }}
                rootMargin="200px"
                minHeight={120}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
