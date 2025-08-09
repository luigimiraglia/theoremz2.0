import { groq } from "next-sanity";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";

import { sanityFetch } from "@/lib/sanityFetch";
import { ptComponents } from "@/lib/ptComponents";
import type { PortableTextBlock } from "sanity";

// UI/components (alcuni sono client)
import VideoSection from "@/components/VideoSection";
import FormularioSection from "@/components/FormularioSection";
import LessonIndex from "@/components/LessonIndex";
import WhatsappButton from "@/components/WhatsappButton";
import TheoremzAIAssistant from "@/components/TheoremzAiAssistant";
import LessonNotes from "@/components/LessonNotes";
import SaveLessonButton from "@/components/SaveLessonButton";
import LessonExercises from "@/components/LessonExercises";

/* --------------------  GROQ -------------------- */

const lessonBySlugQuery = groq`
  *[_type == "lesson" && slug.current == $slug][0]{
    _id,
    title,
    subtitle,
    slug,
    thumbnailUrl,
    resources,
    content
  }
`;

const allLessonSlugsQuery = groq`
  *[_type == "lesson" && defined(slug.current)].slug.current
`;

/* --------------------  Types -------------------- */

type LessonResources = {
  formulario?: string | null;
  appunti?: string | null;
  videolezione?: string | null;
};

type LessonDoc = {
  _id: string;
  title: string;
  subtitle?: string | null;
  slug: { current: string };
  thumbnailUrl?: string | null;
  resources?: LessonResources;
  content: PortableTextBlock[];
};

type PageProps = {
  params: { lezione: string };
};

/* Tipo per i blocchi "section" nel PortableText */
type SectionBlock = PortableTextBlock & {
  _type: "section";
  heading?: string;
  shortTitle?: string;
};

/* --------------------  Static params -------------------- */

export async function generateStaticParams() {
  const slugs = await sanityFetch<string[]>(allLessonSlugsQuery);
  return slugs.map((slug) => ({ lezione: slug }));
}

/* --------------------  Page -------------------- */

export default async function LessonPage({ params }: PageProps) {
  const lesson = await sanityFetch<LessonDoc>(lessonBySlugQuery, {
    slug: params.lezione,
  });

  if (!lesson) notFound();

  // Type-guard per estrarre solo i blocchi "section" senza usare `any`
  const sections: SectionBlock[] = (lesson.content ?? []).filter(
    (b): b is SectionBlock => (b as { _type?: string })._type === "section"
  );

  // Metadati serializzabili per il bottone "salva lezione"
  const lessonMeta = {
    id: lesson._id,
    slug: lesson.slug.current,
    title: lesson.title,
    thumb: lesson.thumbnailUrl ?? null,
  };

  return (
    <article className="mx-auto max-w-6xl px-6 pb-12 prose prose-slate dark:prose-invert">
      {/* Header */}
      <header className="rounded-2xl [.dark_&]:bg-slate-800/80 space-y-2 bg-gray-50 text-center pt-3 pb-4">
        <div className="flex justify-end mr-3">
          <SaveLessonButton lessonSlug={params.lezione} />
        </div>
        <h1 className="text-[27px] px-3 sm:text-4xl font-bold opacity-95 leading-tight">
          {lesson.title}
        </h1>
        {lesson.subtitle && (
          <h2 className="font-semibold text-sm sm:text-[16px] px-3">
            {lesson.subtitle}
          </h2>
        )}

        <div className="mt-3 ml-3 flex items-center justify-end gap-1">
          {/* url può essere undefined: passo stringa vuota per evitare warning */}
          <FormularioSection url={lesson.resources?.formulario ?? ""} />

          <LessonNotes
            lessonTitle={lesson.title}
            lessonSlug={lesson.slug.current}
          />
        </div>
      </header>

      {/* Indice sezioni */}
      {!!sections.length && <LessonIndex sections={sections} />}

      <hr className="border-t-2 [.dark_&]:border-white border-blue-950 rounded-full mx-1" />

      {/* Videolezione */}
      {lesson.resources?.videolezione && (
        <VideoSection url={lesson.resources.videolezione} />
      )}

      {/* Contenuto principale */}
      <PortableText value={lesson.content} components={ptComponents} />

      {/* Azioni/Widget vari */}
      <WhatsappButton />
      <TheoremzAIAssistant lessonId={lesson._id} lessonTitle={lesson.title} />

      <LessonExercises
        lessonId={lesson._id}
        lessonTitle={lesson.title}
        lessonSlug={lesson.slug.current}
      />
    </article>
  );
}
