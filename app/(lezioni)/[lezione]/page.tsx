// app/lezioni/[lezione]/page.tsx
import { PortableText } from "@portabletext/react";
import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch"; // wrapper su client.fetch
import { notFound } from "next/navigation";

/* ---------------------- GROQ --------------------- */
const lessonBySlugQuery = groq`
  *[_type == "lesson" && slug.current == $slug][0]{
    _id,
    title,
    content[]
  }
`;

const allLessonSlugsQuery = groq`
  *[_type == "lesson" && defined(slug.current)].slug.current
`;

/* -------------------- Tipi ----------------------- */
type PageProps = {
  params: { lezione: string };
};

/* ------------------ ISR / SSG -------------------- */
export const revalidate = 60; // rigenera max ogni 60 s

export async function generateStaticParams() {
  const slugs: string[] = await sanityFetch(allLessonSlugsQuery);
  return slugs.map((lezione) => ({ lezione })); // 👈🏻 usa il nuovo nome
}

/* ------------------ Pagina ----------------------- */
export default async function LessonPage({ params }: PageProps) {
  const lesson = await sanityFetch(lessonBySlugQuery, {
    slug: params.lezione, // 👈🏻 passiamo il param
  });

  if (!lesson) notFound();

  return (
    <main className="prose mx-auto px-4 py-8">
      <h1>{lesson.title}</h1>
      <PortableText value={lesson.content} />
    </main>
  );
}
