"use client";
import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import { client } from "@/sanity/lib/client";
import Image from "next/image";
import Link from "next/link";

interface Lesson {
  _id: string;
  title: string;
  nomeAbbreviato?: string;
  categoria: string[];
  classe: string[];
  slug: { current: string };
  thumbnailUrl?: string;
}

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

/* Skeleton card */
function SkeletonCard() {
  return (
    <div className="rounded-2xl min-w-[320px] border-2 border-transparent">
      <div className="h-36 rounded-t-2xl bg-gray-200 [.dark_&]:bg-slate-700 animate-pulse" />
      <div className="h-9 rounded-b-xl bg-gray-300 [.dark_&]:bg-slate-600 animate-pulse mt-[2px]" />
    </div>
  );
}

export default function Matematica() {
  const [query, setQuery] = useState("");
  const [interfaceMode, setInterfaceMode] = useState<"medie" | "superiori">(
    "superiori"
  );
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filteredLessons, setFilteredLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data: Lesson[] =
          await client.fetch(`*[_type=="lesson" && materia=="matematica"]{
          _id, title, nomeAbbreviato, categoria, classe, slug, thumbnailUrl
        } | order(title asc)`);
        if (!active) return;
        setLessons(data);
        setFilteredLessons(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setFilteredLessons(lessons);
      return;
    }
    const fuse = new Fuse<Lesson>(lessons, { keys: ["title"], threshold: 0.4 });
    const results = fuse.search(query);
    setFilteredLessons(results.map((r) => r.item));
  }, [query, lessons]);

  const filteredByInterface = useMemo(() => {
    const isMedie = interfaceMode === "medie";
    const validClassi = isMedie ? CLASSI_MEDIE : CLASSI_SUPERIORI;
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
        lesson.categoria.forEach((cat) => {
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(lesson);
        });
        return acc;
      },
      {} as Record<string, Lesson[]>
    );
  }, [filteredByInterface]);

  const visibleClassi =
    interfaceMode === "medie" ? CLASSI_MEDIE : CLASSI_SUPERIORI;

  return (
    <div className="relative max-w-screen-xl xl:mx-auto mx-6 mb-6">
      {/* Switch superiori/medie e selector di classe */}
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
          onChange={(e) => setSelectedClasse(e.target.value || null)}
          className="text-white font-semibold rounded-lg bg-blue-500 border border-blue-500 shadow-[0_0_0px_1px_rgba(0,0,0,0.06)] p-1 text-sm"
        >
          <option value="">Tutte le classi</option>
          {visibleClassi.map((classe) => (
            <option key={classe} value={classe}>
              {classe}
            </option>
          ))}
        </select>
      </div>

      {/* barra di ricerca */}
      <div className="[.dark_&]:bg-slate-800/80 bg-gray-50 rounded-2xl py-8 px-6 flex flex-col sm:flex-row justify-center items-center gap-4">
        <h1 className="text-2xl font-bold">Matematica</h1>
        <input
          type="text"
          placeholder="🔍 Cerca lezione..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-65 px-4 py-2 rounded-xl border border-gray-300"
        />
      </div>

      {/* risultati */}
      <div className="mt-2 space-y-6">
        {loading ? (
          // SKELETONS: se stai filtrando, mostro una griglia; altrimenti 2 “sezioni” piene
          query || selectedClasse ? (
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <>
              <div>
                <hr className="border-slate-600 rounded-xl border-1 mb-2" />
                <div className="h-6 w-48 bg-gray-200 [.dark_&]:bg-slate-700 rounded-md animate-pulse mb-3" />
                <div className="flex flex-col sm:flex-row sm:overflow-x-auto gap-4 pt-1 pb-1 sm:pl-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={`a-${i}`} />
                  ))}
                </div>
              </div>
              <div>
                <hr className="border-slate-600 rounded-xl border-1 mb-2" />
                <div className="h-6 w-56 bg-gray-200 [.dark_&]:bg-slate-700 rounded-md animate-pulse mb-3" />
                <div className="flex flex-col sm:flex-row sm:overflow-x-auto gap-4 pt-1 pb-1 sm:pl-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={`b-${i}`} />
                  ))}
                </div>
              </div>
            </>
          )
        ) : query || selectedClasse ? (
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {filteredByInterface.map((lesson) => (
              <Link href={`/${lesson.slug.current}`} key={lesson._id}>
                <div className="rounded-2xl bg-gray-100/60 min-w-[320px] border-2 border-slate-800 hover:shadow-[-5px_6px_0_0_#2b7fff] hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
                  <div className="h-36 overflow-hidden rounded-t-2xl bg-white">
                    {lesson.thumbnailUrl ? (
                      <Image
                        src={lesson.thumbnailUrl}
                        alt={lesson.title}
                        width={320}
                        height={180}
                        className="object-cover px-8"
                      />
                    ) : (
                      <Image
                        src="https://theoremz.com/images/thumb/in-arrivo.webp"
                        alt={lesson.title}
                        width={320}
                        height={180}
                        className="object-cover px-8"
                      />
                    )}
                  </div>
                  <div className="bg-slate-800 text-white text-center py-2 rounded-b-xl font-medium">
                    {lesson.nomeAbbreviato || lesson.title}
                  </div>
                </div>
              </Link>
            ))}
            {filteredByInterface.length === 0 && (
              <div className="text-sm text-slate-500 mt-4">
                Nessun risultato.
              </div>
            )}
          </div>
        ) : (
          Object.entries(groupedByCategory).map(([categoria, lezioni]) => (
            <div key={categoria}>
              <hr className="border-slate-600 rounded-xl border-1 mb-2" />
              <h2 className="text-2xl font-semibold mb-2">{categoria}</h2>
              <div className="flex flex-col sm:flex-row sm:overflow-x-auto gap-4 pt-1 pb-1 sm:pl-1">
                {lezioni.map((lesson) => (
                  <Link href={`/${lesson.slug.current}`} key={lesson._id}>
                    <div className="rounded-2xl bg-gray-100/60 min-w-[320px] border-2 border-slate-800 hover:shadow-[-5px_6px_0_0_#2b7fff] hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
                      <div className="h-36 overflow-hidden rounded-t-2xl bg-white">
                        {lesson.thumbnailUrl ? (
                          <Image
                            src={lesson.thumbnailUrl}
                            alt={lesson.title}
                            width={320}
                            height={180}
                            className="object-cover px-8 mx-auto"
                          />
                        ) : (
                          <Image
                            src="https://theoremz.com/images/thumb/in-arrivo.webp"
                            alt={lesson.title}
                            width={320}
                            height={180}
                            className="object-cover px-8 mx-auto"
                          />
                        )}
                      </div>
                      <div className="bg-slate-800 text-white text-center py-2 rounded-b-xl font-medium">
                        {lesson.nomeAbbreviato || lesson.title}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
