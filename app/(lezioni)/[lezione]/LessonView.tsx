/* eslint-disable @next/next/no-img-element */
// app/(lezioni)/[lezione]/LessonView.tsx
import type { PortableTextBlock } from "sanity";
import { PortableText } from "@portabletext/react";
import { ptComponents } from "@/lib/ptComponents"; // tuo renderer server-safe

type SectionItem = { _type: "section"; heading: string; shortTitle: string };

export default function LessonView({
  lesson,
  sectionItems,
}: {
  lesson: {
    id: string;
    title: string;
    subtitle: string | null;
    slug: string;
    thumbnailUrl: string | null;
    resources: Record<string, unknown>;
    content: PortableTextBlock[];
  };
  sectionItems: SectionItem[];
}) {
  return (
    <article className="mx-auto max-w-6xl px-6 pb-12">
      {/* Header server-rendered (riserva spazio a dx per il pulsante client) */}
      <header className="relative rounded-2xl [.dark_&]:bg-slate-800/80 space-y-2 bg-gray-50 pt-3 pb-4 text-center pr-0 sm:pr-[140px]">
        <h1 className="text-[27px] px-3 sm:text-4xl font-bold opacity-95 leading-tight">
          {lesson.title}
        </h1>
        {lesson.subtitle && (
          <h2 className="font-semibold text-sm sm:text-[16px] px-3">
            {lesson.subtitle}
          </h2>
        )}
        {/* slot per i link statici (non sposta il layout) */}
        <div className="mt-3 ml-3 flex items-center justify-end gap-1">
          {/* se vuoi link server-side al formulario/appunti, mettili qui come <a> */}
        </div>
      </header>

      {/* Indice (statico) */}
      {sectionItems.length > 0 && (
        <nav className="my-4">
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {sectionItems.map((s) => (
              <li
                key={s.heading}
                className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2"
              >
                {s.shortTitle}
              </li>
            ))}
          </ul>
        </nav>
      )}

      <hr className="border-t-2 [.dark_&]:border-white border-blue-950 rounded-full mx-1" />

      {/* Thumbnail opzionale con spazio riservato (no CLS) */}
      {lesson.thumbnailUrl && (
        <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden my-6">
          <img
            src={lesson.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            width={1280}
            height={720}
            loading="eager"
            decoding="async"
          />
        </div>
      )}

      {/* CONTENUTO PRINCIPALE = LCP */}
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <PortableText value={lesson.content} components={ptComponents} />
      </div>
    </article>
  );
}
