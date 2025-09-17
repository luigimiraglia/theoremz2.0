import SaveLessonButton from "@/components/SaveLessonButton";
import Link from "next/link";
import FormularioSection from "@/components/FormularioSection";
import LessonNotesClient from "@/components/LessonNotesClient";
import type { ReactNode } from "react";
import PortableRenderer from "./PortableRenderer"; // fallback if no server slot provided
import type { PortableTextBlock } from "sanity";
import LazyOnVisible from "@/components/LazyOnVisible";
// Note: heavy widgets are loaded dynamically when visible to reduce JS
import WhatsappButton from "@/components/WhatsappButton";
import AiChatLauncher from "@/components/AiChatLauncher";
import EserciziSmallButton from "@/components/EserciziSmallButton";
import LessonAnalytics from "@/components/LessonAnalytics";
import LessonReview from "@/components/LessonReview";

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
    materia?: string | null;
    categoria?: string[];
    classe?: string[];
    lezioniPropedeuticheObbligatorie?: LinkedLessonRaw[];
    lezioniPropedeuticheOpzionali?: LinkedLessonRaw[];
  };
  sectionItems: { _type: "section"; heading: string; shortTitle: string }[];
  contentSlot?: ReactNode; // server-rendered content to improve LCP
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
    </div>
  );
}

/* ---------- LessonClient ---------- */
export default function LessonClient({
  lezione,
  lesson,
  sectionItems,
  contentSlot,
}: LessonClientProps) {
  const obb = sanitizeList(
    lesson.lezioniPropedeuticheObbligatorie,
    lesson.slug
  );
  const opt = sanitizeList(lesson.lezioniPropedeuticheOpzionali, lesson.slug);
  const hasPrereq = obb.length > 0 || opt.length > 0;

  function slugify(s: string) {
    return (s || "").toLowerCase().replace(/\s+/g, "-");
  }
  function classLink(label: string) {
    const mMedia = label.match(/^(\d+)º\s+Media$/i);
    if (mMedia) return `/scuola/media/${mMedia[1]}`;
    const m = label.match(/^(\d+)º\s+(.+)$/);
    if (m) return `/scuola/liceo/${slugify(m[2])}/${m[1]}`;
    return null;
  }

  return (
    <article className="mx-auto max-w-6xl px-4 pb-12 prose prose-slate dark:prose-invert">
      {/* Analytics for lesson view (client-only) */}
      <LessonAnalytics
        id={lesson.id}
        slug={lesson.slug}
        title={lesson.title}
        materia={lesson.materia || null}
        categoria={lesson.categoria || null}
      />
      {/* Header */}
      <header className="rounded-2xl [.dark_&]:bg-slate-800/80 space-y-2 bg-gray-50 text-center pt-3 pb-3">
        <div className="flex justify-between mx-3 items-center gap-2">
          <div className="flex items-center gap-2">
            <EserciziSmallButton />
            <Link
              href={`/esercizi/${lesson.slug}`}
              className="hidden sm:inline text-sm font-semibold text-blue-600 underline underline-offset-2"
            >
              Lista esercizi ↗
            </Link>
          </div>
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
        <LazyOnVisible
          component="LessonIndex"
          props={{ sections: sectionItems }}
          rootMargin="200px"
          minHeight={48}
        />
      )}

      <hr className="border-t-2 [.dark_&]:border-white border-blue-950 rounded-full mx-1" />

      {/* Videolezione */}
      {lesson.resources?.videolezione && (
        <LazyOnVisible
          component="VideoSection"
          props={{ url: lesson.resources.videolezione }}
          rootMargin="150px"
          minHeight={56}
        />
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
      {contentSlot ? (
        contentSlot
      ) : (
        <PortableRenderer value={lesson.content} />
      )}

      {/* Tag/percorsi in fondo alla lezione (non invasivi) */}
      {(!!(lesson.categoria && lesson.categoria.length) || !!(lesson.classe && lesson.classe.length)) && (
        <div className="mt-6">
          <hr className="my-3 border-t border-slate-200" />
          <div className="flex flex-wrap gap-2 text-sm">
            {(lesson.categoria || []).map((c) => (
              <a
                key={c}
                href={`/${lesson.materia === "fisica" ? "fisica" : "matematica"}/${slugify(c)}`}
                className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-200"
              >
                #{c}
              </a>
            ))}
            {(lesson.classe || [])
              .map((cl) => ({ cl, href: classLink(cl) }))
              .filter((x) => !!x.href)
              .map((x) => (
                <a
                  key={x.cl}
                  href={x.href!}
                  className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 hover:bg-blue-100"
                >
                  🎓 {x.cl}
                </a>
              ))}
          </div>
        </div>
      )}

      {/* Azioni/Widget vari */}
      <WhatsappButton />
      <AiChatLauncher lessonId={lesson.id} lessonTitle={lesson.title} />

      {/* ESERCIZI ALLA FINE */}
      {/* Anchor for the top button to scroll even before the widget mounts */}
      <div data-exercises-cta className="h-0" aria-hidden="true" />
      <LazyOnVisible
        component="LessonExercises"
        props={{
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonSlug: lesson.slug,
        }}
        rootMargin="400px"
        minHeight={200}
      />

      {/* Recensioni (ultima sezione) */}
      <LessonReview lessonSlug={lesson.slug} lessonTitle={lesson.title} />
    </article>
  );
}
