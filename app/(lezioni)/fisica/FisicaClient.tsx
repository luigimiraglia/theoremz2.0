/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */
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
  materia?: string;
  categoria: string[];
  classe: string[];
  slug: { current: string };
  thumbnailUrl?: string;
};

type SectionHit = {
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  lessonThumb: string | null;
  heading: string;
  materia: string | null;
  classe: string[];
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

export default function FisicaClient({
  initialLessons,
  initialSections,
}: {
  initialLessons: Lesson[];
  initialSections: SectionHit[];
}) {
  const [query, setQuery] = useState("");
  const dq = useDeferredValue(query); // input più fluido senza jank
  const [interfaceMode, setInterfaceMode] = useState<
    "medie" | "superiori" | null
  >(null);
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);

  const [lessons] = useState<Lesson[]>(() => initialLessons); // immutabile
  const [filteredLessons, setFilteredLessons] =
    useState<Lesson[]>(initialLessons);
  const [sections] = useState<SectionHit[]>(() => initialSections);
  const [sectionResults, setSectionResults] = useState<SectionHit[]>([]);

  // Stato di espansione per categoria (solo mobile): set di nomi categoria
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set()
  );

  // Fuse on-demand (solo quando si digita)
  const fuseRef = useRef<any | null>(null);
  const fuseLoadedRef = useRef(false);
  const sectionFuseRef = useRef<any | null>(null);
  const sectionFuseLoadedRef = useRef(false);

  // Seed initial query from ?q= and keep URL in sync (for SearchAction)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) setQuery(q);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (query) params.set("q", query);
      else params.delete("q");
      const qs = params.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState({}, "", url);
    } catch {}
  }, [query]);

  useEffect(() => {
    const q = dq.trim();
    if (!q) {
      setFilteredLessons(lessons);
      setSectionResults([]);
      return;
    }
    (async () => {
      if (!fuseLoadedRef.current) {
        const mod = await import("fuse.js");
        const FuseCtor = mod.default as any;
        fuseRef.current = new FuseCtor(lessons, {
          keys: [
            "title",
            "nomeAbbreviato",
            "materia",
            "categoria",
            "classe",
            "slug.current",
          ],
          threshold: 0.35,
          ignoreLocation: true,
        });
        fuseLoadedRef.current = true;
      } else {
        fuseRef.current?.setCollection?.(lessons);
      }
      const results = fuseRef.current.search(q);
      setFilteredLessons(results.map((r: any) => r.item));

      // Sezioni
      if (!sectionFuseLoadedRef.current) {
        const mod = await import("fuse.js");
        const FuseCtor = mod.default as any;
        sectionFuseRef.current = new FuseCtor(sections, {
          keys: ["heading", "lessonTitle", "materia", "classe"],
          threshold: 0.3,
          ignoreLocation: true,
        });
        sectionFuseLoadedRef.current = true;
      } else {
        sectionFuseRef.current?.setCollection?.(sections);
      }
      const sResults = sectionFuseRef.current.search(q).map((r: any) => r.item);
      setSectionResults(sResults);
    })();
  }, [dq, lessons, sections]);

  const filteredByInterface = useMemo(() => {
    const q = dq.trim();
    // In ricerca: mostra tutte le materie (fisica + matematica)
    if (q) return filteredLessons;
    // Fuori dalla ricerca: mostra solo Fisica in questa pagina
    const onlyFisica = filteredLessons.filter(
      (l) => (l.materia || "").toLowerCase() === "fisica"
    );
    if (!interfaceMode && !selectedClasse) return onlyFisica;
    const validClassi =
      interfaceMode === "medie" ? CLASSI_MEDIE : CLASSI_SUPERIORI;
    return onlyFisica.filter((lesson) => {
      const inInterface = interfaceMode
        ? lesson.classe.some((c) => validClassi.includes(c))
        : true;
      const inClasse = selectedClasse
        ? lesson.classe.includes(selectedClasse)
        : true;
      return inInterface && inClasse;
    });
  }, [filteredLessons, dq, interfaceMode, selectedClasse]);

  const filteredSectionResults = useMemo(() => {
    if (dq.trim()) return sectionResults;
    return [] as SectionHit[];
  }, [sectionResults, dq]);

  const toAnchorId = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

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

  const visibleClassi = interfaceMode
    ? interfaceMode === "medie"
      ? CLASSI_MEDIE
      : CLASSI_SUPERIORI
    : [...CLASSI_MEDIE, ...CLASSI_SUPERIORI];

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
      {/* Selettori compatti: Ciclo + Classe (opzionale) */}
      <div className="flex items-center flex-wrap gap-2 justify-center sm:justify-start">
        <label className="text-[13px] font-semibold text-slate-600">
          <span className="sr-only">Selettore ciclo</span>
          <select
            value={interfaceMode ?? ""}
            onChange={(e) => {
              const v = e.target.value as "medie" | "superiori" | "";
              setInterfaceMode(v ? (v as any) : null);
              setSelectedClasse(null);
              setExpandedCats(new Set());
            }}
            className="rounded-xl border border-r-6 border-white mb-1 bg-white px-2 py-1 text-[13px]"
            aria-label="Selettore ciclo"
          >
            <option value="">Tutti i cicli</option>
            <option value="medie">Medie</option>
            <option value="superiori">Superiori</option>
          </select>
        </label>

        <label className="text-[13px] font-semibold text-slate-600">
          <span className="sr-only">Filtra per classe</span>
          <select
            value={selectedClasse || ""}
            onChange={(e) => {
              setSelectedClasse(e.target.value || null);
              setExpandedCats(new Set());
            }}
            disabled={!interfaceMode}
            className={[
              "rounded-xl border border-white mb-1 border-r-6 bg-white px-2 py-1 text-[13px]",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
            aria-label="Filtra per classe"
          >
            <option value="">
              {interfaceMode ? "Tutte le classi" : "Classe (opzionale)"}
            </option>
            {visibleClassi.map((classe) => (
              <option key={classe} value={classe}>
                {classe}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Barra di ricerca */}
      <div className="[.dark_&]:bg-slate-800/80 bg-gray-50 rounded-2xl py-8 px-6 flex flex-col sm:flex-row justify-center items-center gap-4">
        <h1 className="text-2xl font-bold">Fisica</h1>
        <input
          id="fisica-search"
          name="q"
          type="text"
          placeholder="🔍 Cerca lezione di fisica..."
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
          // Vista ricerca/filtri: tutte visibili
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {filteredByInterface.map((lesson) => {
              const lcp = lesson.slug.current === firstVisibleSlug;
              return (
                <Link
                  href={`/${lesson.slug.current}`}
                  key={lesson._id}
                  prefetch={false}
                >
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

            {/* Sezioni corrispondenti (solo in ricerca) */}
            {filteredSectionResults.length > 0 && (
              <div className="basis-full mt-4">
                <h3 className="text-base font-bold mb-2">Sezioni correlate</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredSectionResults.slice(0, 18).map((s) => {
                    const anchor = toAnchorId(s.heading);
                    return (
                      <li
                        key={`${s.lessonId}-${anchor}`}
                        className="group rounded-xl bg-white ring-1 ring-slate-200 hover:ring-blue-400/70 hover:shadow-[0_8px_20px_-10px_rgba(30,58,138,0.35)] transition overflow-hidden"
                      >
                        <Link
                          href={`/${s.lessonSlug}#${anchor}`}
                          prefetch={false}
                          className="flex items-stretch gap-0"
                        >
                          <div className="w-28 h-20 bg-slate-50 flex items-center justify-center shrink-0">
                            <Image
                              src={
                                s.lessonThumb || "/images/thumb/in-arrivo.webp"
                              }
                              alt={s.lessonTitle}
                              width={160}
                              height={90}
                              sizes="160px"
                              className="object-cover px-3"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-3 flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-slate-900 line-clamp-2">
                              {s.heading}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-600 truncate">
                              in{" "}
                              <span className="text-[#1a5fd6] group-hover:underline">
                                {s.lessonTitle}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
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
"/* eslint-disable @typescript-eslint/no-unused-vars */\n"
"/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unused-expressions */\n"
