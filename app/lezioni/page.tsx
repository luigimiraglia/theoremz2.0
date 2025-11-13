import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutte le lezioni — Theoremz",
  description: "Consulta l'indice completo di tutte le lezioni di matematica e fisica disponibili su Theoremz.",
  alternates: { canonical: "https://theoremz.com/lezioni" },
};

const LESSONS_QUERY = groq`
  *[_type=="lesson"]{ 
    title, 
    slug,
    materia,
    categoria,
    classe,
    subtitle
  } | order(title asc)
`;

interface Lesson {
  title: string;
  slug: { current: string };
  materia?: string;
  categoria?: string[];
  classe?: string[];
  subtitle?: string;
}

export default async function LessonIndexPage() {
  const lessons = await sanityFetch<Lesson[]>(LESSONS_QUERY);

  // Raggruppa per materia
  const groupedByMateria = (lessons || []).reduce(
    (acc, lesson) => {
      const materia = lesson.materia || "Altro";
      if (!acc[materia]) acc[materia] = [];
      acc[materia].push(lesson);
      return acc;
    },
    {} as Record<string, Lesson[]>
  );

  return (
    <main className="min-h-screen bg-white [.dark_&]:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Intestazione */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-900 [.dark_&]:text-white mb-3">
            Tutte le lezioni
          </h1>
          <p className="text-lg text-slate-600 [.dark_&]:text-slate-300">
            Accedi all&apos;indice completo di {lessons.length} lezioni di matematica e fisica.
          </p>
        </div>

        {/* Lezioni raggruppate per materia */}
        <div className="space-y-12">
          {Object.entries(groupedByMateria).map(([materia, materiaLessons]) => (
            <div key={materia}>
              <h2 className="text-2xl font-bold text-slate-900 [.dark_&]:text-white mb-4 pb-3 border-b border-slate-200 [.dark_&]:border-slate-800">
                {materia.charAt(0).toUpperCase() + materia.slice(1)}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {materiaLessons.map((lesson) => (
                  <Link
                    key={lesson.slug.current}
                    href={`/${lesson.slug.current}`}
                    className="group rounded-lg border border-slate-200 [.dark_&]:border-slate-800 bg-slate-50/50 [.dark_&]:bg-slate-900/30 p-4 hover:bg-slate-100 [.dark_&]:hover:bg-slate-800/50 transition-colors"
                  >
                    <h3 className="font-semibold text-slate-900 [.dark_&]:text-white group-hover:text-sky-600 [.dark_&]:group-hover:text-sky-400 transition-colors">
                      {lesson.title}
                    </h3>
                    {lesson.subtitle && (
                      <p className="mt-1 text-sm text-slate-600 [.dark_&]:text-slate-400 line-clamp-2">
                        {lesson.subtitle}
                      </p>
                    )}
                    {lesson.classe && lesson.classe.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {lesson.classe.slice(0, 2).map((cls) => (
                          <span
                            key={cls}
                            className="inline-flex text-xs font-medium rounded-full bg-sky-100 [.dark_&]:bg-sky-900/40 text-sky-700 [.dark_&]:text-sky-300 px-2 py-0.5"
                          >
                            {cls}
                          </span>
                        ))}
                        {lesson.classe.length > 2 && (
                          <span className="inline-flex text-xs font-medium text-slate-600 [.dark_&]:text-slate-400 px-2 py-0.5">
                            +{lesson.classe.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {lessons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 [.dark_&]:text-slate-400 mb-4">
              Nessuna lezione disponibile al momento.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
