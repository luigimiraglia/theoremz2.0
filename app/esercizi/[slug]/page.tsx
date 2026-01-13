import { groq } from "next-sanity";
import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanityFetch";
import Link from "next/link";
import ExercisesLessonClient from "./ExercisesLessonClient";

export const revalidate = 1800; // 30 min

type LessonRow = { _id: string; title: string; slug: { current: string } };
const LESSON_BY_SLUG = groq`*[_type=="lesson" && slug.current==$slug][0]{ _id, title, slug }`;

export async function generateStaticParams() {
  // raccogli i lesson slug che compaiono in almeno un esercizio
  const rows = await sanityFetch<{ slugs?: (string | null)[] }[]>(
    `*[_type=="exercise" && defined(lezioniCollegate)]{ "slugs": lezioniCollegate[]->slug.current }`
  );
  const set = new Set<string>();
  for (const r of rows || []) {
    for (const s of r.slugs || []) {
      if (s) set.add(s);
    }
  }
  return Array.from(set).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await sanityFetch<LessonRow | null>(LESSON_BY_SLUG, { slug });
  if (!lesson) {
    return {
      title: "Esercizi — lezione non trovata",
      robots: { index: false, follow: false },
    };
  }
  const title = `Esercizi su ${lesson.title} — con soluzioni e passaggi`;
  const canonical = `/esercizi/${lesson.slug.current}`;
  const description = `Allenati con esercizi su ${lesson.title}: tracce chiare, soluzioni e passaggi spiegati.`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot:
        "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    },
    openGraph: {
      title,
      description,
      url: `https://theoremz.com${canonical}`,
      siteName: "Theoremz",
      type: "website",
      images: [{ url: "/metadata.png" }],
      locale: "it_IT",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/metadata.png"],
      site: "@theoremz_",
    },
  };
}

export default async function EserciziPerLezione({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = await sanityFetch<LessonRow | null>(LESSON_BY_SLUG, { slug });
  if (!lesson) {
    return (
      <main className="max-w-6xl mx-auto px-4 pt-2 sm:pt-4 pb-10">
        <h1 className="text-2xl font-bold">Lezione non trovata</h1>
        <p className="mt-2">
          La pagina potrebbe essere stata spostata o rimossa.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 pt-2 sm:pt-4 pb-10">
      <nav aria-label="breadcrumb" className="text-sm text-slate-600 mb-2">
        <Link href="/">Home</Link> ·{" "}
        <a href={`/${lesson.slug.current}`}>{lesson.title}</a> ·
        <span className="font-semibold"> Esercizi</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
        Esercizi su {lesson.title}
      </h1>
      <p className="mt-1 text-slate-700">
        Selezione di esercizi con passaggi e soluzioni. Per la teoria, vedi la
        lezione:{" "}
        <Link href={`/${lesson.slug.current}`} className="text-blue-600 underline">
          {lesson.title}
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href="/risolutore"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
        >
          Risolvi un esercizio con AI →
        </Link>
      </div>

      <ExercisesLessonClient
        lessonId={lesson._id}
        lessonTitle={lesson.title}
        lessonSlug={lesson.slug.current}
      />

      {/* Canonical gestito da generateMetadata */}
    </main>
  );
}
