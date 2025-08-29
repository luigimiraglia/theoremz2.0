"use client";

import dynamic from "next/dynamic";
import FormularioSection from "@/components/FormularioSection";
import LessonNotes from "@/components/LessonNotes";
import type { PortableTextBlock } from "sanity";

// 🔸 lazy-load TUTTO ciò che può toccare il DOM
const SaveLessonButton = dynamic(
  () => import("@/components/SaveLessonButton"),
  { ssr: false }
);
const LessonIndex = dynamic(() => import("@/components/LessonIndex"), {
  ssr: false,
});
const VideoSection = dynamic(() => import("@/components/VideoSection"), {
  ssr: false,
});
const WhatsappButton = dynamic(() => import("@/components/WhatsappButton"), {
  ssr: false,
});
const TheoremzAIAssistant = dynamic(
  () => import("@/components/TheoremzAiAssistant"),
  { ssr: false }
);
const LessonExercises = dynamic(() => import("@/components/LessonExercises"), {
  ssr: false,
});
const EserciziSmallButton = dynamic(
  () => import("@/components/EserciziSmallButton"),
  {
    ssr: false,
  }
);
// PortableText + ptComponents spostati in un renderer separato, lazy
const PortableRenderer = dynamic(() => import("./PortableRenderer"), {
  ssr: false,
});

type LessonClientProps = {
  lezione: string;
  lesson: {
    id: string;
    title: string;
    subtitle: string | null;
    slug: string;
    thumbnailUrl: string | null;
    resources: {
      formulario?: string | null;
      appunti?: string | null;
      videolezione?: string | null;
    };
    content: PortableTextBlock[];
  };
  sectionItems: { _type: "section"; heading: string; shortTitle: string }[];
};

export default function LessonClient({
  lezione,
  lesson,
  sectionItems,
}: LessonClientProps) {
  return (
    <article className="mx-auto max-w-6xl px-6 pb-12 prose prose-slate dark:prose-invert">
      {/* Header */}
      <header className="rounded-2xl [.dark_&]:bg-slate-800/80 space-y-2 bg-gray-50 text-center pt-3 pb-4">
        <div className="flex justify-between mr-3">
          <EserciziSmallButton />
          <SaveLessonButton lessonSlug={lezione} />
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
          <FormularioSection url={lesson.resources?.formulario ?? ""} />
          <LessonNotes lessonTitle={lesson.title} lessonSlug={lesson.slug} />
        </div>
      </header>

      {/* Indice sezioni */}
      {!!sectionItems.length && <LessonIndex sections={sectionItems} />}

      <hr className="border-t-2 [.dark_&]:border-white border-blue-950 rounded-full mx-1" />

      {/* Videolezione */}
      {lesson.resources?.videolezione && (
        <VideoSection url={lesson.resources.videolezione} />
      )}

      {/* Contenuto principale */}
      <PortableRenderer value={lesson.content} />

      {/* Azioni/Widget vari */}
      <WhatsappButton />
      <TheoremzAIAssistant lessonId={lesson.id} lessonTitle={lesson.title} />

      {/* ESERCIZI ALLA FINE */}
      <LessonExercises
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        lessonSlug={lesson.slug}
      />
    </article>
  );
}
