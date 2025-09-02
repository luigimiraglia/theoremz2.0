"use client";

import Image from "next/image";
import Link from "next/link";

type Lesson = {
  _id: string;
  title: string;
  nomeAbbreviato?: string;
  slug: { current: string };
  thumbnailUrl?: string;
};

export default function CategoryBlock({
  categoria,
  lezioni,
  firstVisibleSlug,
  expanded,
  onToggle,
}: {
  categoria: string;
  lezioni: Lesson[];
  firstVisibleSlug: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <hr className="border-slate-600 rounded-xl border-1 mb-2" />
      <h2 className="text-2xl font-semibold mb-2">{categoria}</h2>

      <div className="flex flex-col sm:flex-row sm:overflow-x-auto gap-4 pt-1 pb-1 sm:pl-1">
        {lezioni.map((lesson, idx) => {
          const lcp = lesson.slug.current === firstVisibleSlug;
          const mobileHidden = !expanded && idx > 0 ? "hidden sm:block" : "";
          return (
            <Link
              href={`/${lesson.slug.current}`}
              key={lesson._id}
              prefetch={false}
              className={mobileHidden}
            >
              <div className="rounded-2xl bg-gray-100/60 min-w-[320px] border-2 border-slate-800 hover:shadow-[-5px_6px_0_0_#2b7fff] hover:translate-x-1 hover:-translate-y-1 transition-all cursor-pointer">
                <div className="h-36 overflow-hidden rounded-t-2xl bg-white">
                  <Image
                    src={lesson.thumbnailUrl || "/images/thumb/in-arrivo.webp"}
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
      </div>

      {/* Bottone mobile per espandere/comprimere */}
      <div className="sm:hidden mt-2">
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          className={[
            "w-full rounded-2xl py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-[0.995]",
            expanded
              ? "bg-slate-200 text-slate-900"
              : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white",
          ].join(" ")}
        >
          {expanded ? "Nascondi" : "Mostra tutte"}
        </button>
      </div>
    </div>
  );
}

