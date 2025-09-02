"use client";

import dynamic from "next/dynamic";
import FormularioSection from "@/components/FormularioSection";
import LessonNotesClient from "@/components/LessonNotesClient";
import PortableRenderer from "./PortableRenderer"; // critical content: no code-split to avoid flicker
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
  { ssr: false }
);
import ClientVisible from "@/components/ClientVisible";
import HydrationGate from "@/components/HydrationGate";
import LessonSkeleton from "@/components/LessonSkeleton";

/* ---------- Tipi ---------- */
type UnknownSlug = string | { current?: string | null } | null | undefined;
type LinkedLessonRaw =
  | { title?: string | null; slug?: UnknownSlug }
  | null
  | undefined;

type LessonClientProps = {
  lezione: string;
  lesson: {
    id: string;
    title: string;
    subtitle: string | null;
    slug: string; // slug della lezione corrente
    thumbnailUrl: string | null;
    resources: {
      formulario?: string | null;
      appunti?: string | null;
      videolezione?: string | null;
    };
    content: PortableTextBlock[];
    lezioniPropedeuticheObbligatorie?: LinkedLessonRaw[];
    lezioniPropedeuticheOpzionali?: LinkedLessonRaw[];
  };
  sectionItems: { _type: "section"; heading: string; shortTitle: string }[];
};

/* ---------- helpers robusti ---------- */
function getSlugValue(s: UnknownSlug): string | null {
  if (typeof s === "string") return s || null;
  if (s && typeof s === "object") return s.current ?? null;
  return null;
}

function sanitizeList(
  items: LinkedLessonRaw[] | undefined,
  currentSlug: string
): { title: string; slug?: string }[] {
  const out: { title: string; slug?: string }[] = [];
  const seen = new Set<string>();
  for (const it of items ?? []) {
    const title = (it as any)?.title?.toString().trim();
    if (!title) continue;
    const slug = getSlugValue((it as any)?.slug) || undefined;
    if (slug === currentSlug) continue; // niente self-link
    const key = slug ? `s:${slug}` : `t:${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(slug ? { title, slug } : { title });
  }
  return out;
}

/* ---------- Sub-component: lista con animazioni ---------- */
function PrereqList({
  title,
  items,
}: {
  title: string;
  items: { title: string; slug?: string }[];
}) {
  if (!items?.length) return null;
  return (
    <div className="mb-3">
      <h4 className="font-semibold mb-2 [.dark_&]:text-white">{title}</h4>
      <ul className="space-y-1">
        {items.map((l, i) => (
          <li
            key={(l.slug ?? l.title) + "-" + i}
            className="opacity-0 translate-y-1"
            style={{
              animation: "fadeSlide .36s ease-out forwards",
              animationDelay: `${80 * i}ms`,
            }}
          >
            <div className="flex items-start gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                className="mt-0.5 opacity-80 shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M8 5l8 7-8 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {l.slug ? (
                <a
                  href={`/${l.slug}`} // ⬅️ path coerente col resto del sito
                  className="text-blue-500 -ml-1.5 hover:text-blue-600 transition-all duration-300 font-semibold"
                >
                  {l.title}
                </a>
              ) : (
                <span className="text-blue-500 -ml-1.5 font-semibold opacity-80">
                  {l.title}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <style jsx>{`
        @keyframes fadeSlide {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- LessonClient ---------- */
export default function LessonClient({
  lezione,
  lesson,
  sectionItems,
}: LessonClientProps) {
  const obb = sanitizeList(
    lesson.lezioniPropedeuticheObbligatorie,
    lesson.slug
  );
  const opt = sanitizeList(lesson.lezioniPropedeuticheOpzionali, lesson.slug);
  const hasPrereq = obb.length > 0 || opt.length > 0;

  return (
    <HydrationGate
      minDelayMs={300}
      className="mx-auto max-w-6xl px-4 pb-12"
      skeleton={<LessonSkeleton variant="inline" />}
    >
      <article className="prose prose-slate dark:prose-invert">
      {/* Header */}
      <header className="rounded-2xl [.dark_&]:bg-slate-800/80 space-y-2 bg-gray-50 text-center pt-3 pb-3">
        <div className="flex justify-between mx-3">
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

        <div className="mt-5 ml-2 flex items-center justify-end gap-0.5">
          <FormularioSection url={lesson.resources?.formulario ?? ""} />
          <LessonNotesClient
            lessonTitle={lesson.title}
            lessonSlug={lesson.slug}
          />
        </div>
      </header>

      {/* Indice sezioni (defer visibile) */}
      {!!sectionItems.length && (
        <ClientVisible rootMargin="0px 0px 200px 0px" minHeight={48}>
          <LessonIndex sections={sectionItems} />
        </ClientVisible>
      )}

      <hr className="border-t-2 [.dark_&]:border-white border-blue-950 rounded-full mx-1" />

      {/* Videolezione */}
      {lesson.resources?.videolezione && (
        <ClientVisible rootMargin="100px" minHeight={56}>
          <VideoSection url={lesson.resources.videolezione} />
        </ClientVisible>
      )}

      {/* Prerequisiti con animazione */}
      {hasPrereq && (
        <details className="group mt-2 rounded-xl bg-gray-100 [.dark_&]:bg-slate-800/8">
          <summary className="flex cursor-pointer list-none items-center justify-between p-3">
            <span className="text-semibold font-semibold [.dark_&]:text-white [.dark_&]:bg-slate-800/80">
              Cosa devo già sapere?
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              className="transition-transform duration-300 ease-out group-open:rotate-90"
              aria-hidden="true"
            >
              <path
                d="M8 5l8 7-8 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </summary>

          <div className="px-3 pb-3">
            <div className="grid transition-all duration-300 ease-out [grid-template-rows:0fr] group-open:[grid-template-rows:1fr]">
              <div className="overflow-hidden">
                <div className="mt-2">
                  <PrereqList title="Da sapere assolutamente" items={obb} />
                  <PrereqList title="Opzionali" items={opt} />
                </div>
              </div>
            </div>
          </div>
        </details>
      )}

      {/* Contenuto principale */}
      <PortableRenderer value={lesson.content} />

      {/* Azioni/Widget vari */}
      <WhatsappButton />
      <TheoremzAIAssistant lessonId={lesson.id} lessonTitle={lesson.title} />

      {/* ESERCIZI ALLA FINE */}
      <ClientVisible rootMargin="400px" minHeight={200}>
        <LessonExercises
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          lessonSlug={lesson.slug}
        />
      </ClientVisible>
      </article>
    </HydrationGate>
  );
}
