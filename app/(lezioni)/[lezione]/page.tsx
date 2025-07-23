// app/(lezioni)/[lezione]/page.tsx
import { PortableText } from "@portabletext/react";
import { groq } from "next-sanity";
import { notFound } from "next/navigation";

import { sanityFetch } from "@/lib/sanityFetch"; // wrapper su createClient().fetch
import { ptComponents } from "@/lib/ptComponents"; // componenti custom (h2, LaTeX, ecc.)
import { PortableTextBlock } from "sanity";

/* --------------------  GROQ -------------------- */
const lessonBySlugQuery = groq`
  *[_type == "lesson" && slug.current == $slug][0]{
    _id,
    title,
    content   // portable‑text + object types
  }
`;

const allLessonSlugsQuery = groq`
  *[_type == "lesson" && defined(slug.current)].slug.current
`;

/* --------------------  STATIC PARAMS ------------- */
export async function generateStaticParams() {
  const slugs: string[] = await sanityFetch(allLessonSlugsQuery);

  /* Next aspetta un array con oggetti che abbiano la chiave del segmento */
  return slugs.map((slug) => ({ lezione: slug }));
}

/* --------------------  PAGE  -------------------- */
interface PageProps {
  params: { lezione: string };
}
interface Lesson {
  _id: string;
  title: string;
  content: PortableTextBlock[];
}

export default async function LessonPage({ params }: PageProps) {
  const lesson = await sanityFetch<Lesson>(lessonBySlugQuery, {
    slug: params.lezione,
  });

  if (!lesson) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose prose-slate dark:prose-invert">
      <h1 className="mb-8 text-4xl font-extrabold leading-tight">
        {lesson.title}
      </h1>

      {/* Render del contenuto con i componenti custom */}
      <PortableText value={lesson.content} components={ptComponents} />
    </article>
  );
}
