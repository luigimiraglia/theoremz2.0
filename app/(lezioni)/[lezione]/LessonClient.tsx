"use client";

import SaveLessonButton from "@/components/SaveLessonButton";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { useEffect } from "react";
import PortableRenderer from "./PortableRenderer"; // fallback if no server slot provided
import type { PortableTextBlock } from "sanity";
import LazyOnVisible from "@/components/LazyOnVisible";
// Note: heavy widgets are loaded dynamically when visible to reduce JS
import WhatsappButton from "@/components/WhatsappButton";
import AiChatLauncher from "@/components/AiChatLauncher";
import LessonAnalytics from "@/components/LessonAnalytics";
import LessonReview from "@/components/LessonReview";

// Lazy load dei componenti dell'header per performance
const FormularioSection = dynamic(
  () => import("@/components/FormularioSection"),
  {
    ssr: false,
    loading: () => (
      <button
        className="min-w-0 flex-shrink font-semibold sm:font-bold px-2 sm:px-3 py-1.5 text-xs sm:text-sm shadow-md rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
        disabled
      >
        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/30 rounded animate-pulse flex-shrink-0" />
        <span className="truncate">Formulario</span>
      </button>
    ),
  }
);

const LessonNotesClient = dynamic(
  () => import("@/components/LessonNotesClient"),
  {
    ssr: false,
    loading: () => (
      <button
        className="min-w-0 flex-shrink font-semibold sm:font-bold shadow-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
        disabled
      >
        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/30 rounded animate-pulse flex-shrink-0" />
        <span className="truncate">Appunti</span>
      </button>
    ),
  }
);

const EserciziSmallButton = dynamic(
  () => import("@/components/EserciziSmallButton"),
  {
    ssr: false,
    loading: () => (
      <button
        className="min-w-0 flex-shrink py-1.5 px-2 sm:px-3 text-xs sm:text-sm font-semibold sm:font-bold shadow-md bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
        disabled
      >
        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/30 rounded animate-pulse flex-shrink-0" />
        <span className="truncate">Esercizi</span>
      </button>
    ),
  }
);

const FlashcardsSmallButton = dynamic(
  () => import("@/components/FlashcardsSmallButton"),
  {
    ssr: false,
    loading: () => (
      <button
        className="min-w-0 flex-shrink py-1.5 px-2 sm:px-3 text-xs sm:text-sm font-semibold sm:font-bold shadow-md bg-gradient-to-r from-emerald-500 to-teal-400 text-white rounded-lg whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
        disabled
      >
        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/30 rounded animate-pulse flex-shrink-0" />
        <span className="truncate">Flashcards</span>
      </button>
    ),
  }
);
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
    formule?: {
      formula: string;
      explanation: string;
      difficulty: number;
    }[];
    lezioniPropedeuticheObbligatorie?: LinkedLessonRaw[];
    lezioniPropedeuticheOpzionali?: LinkedLessonRaw[];
    lezioniFiglie?: LinkedLessonRaw[];
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
                <Link
                  href={`/${l.slug}`}
                  className="text-blue-500 -ml-1.5 hover:text-blue-600 transition-all duration-300 font-semibold"
                >
                  {l.title}
                </Link>
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
  // Performance: preconnect a risorse critiche
  useEffect(() => {
    const preconnectResources = () => {
      const links = ["https://fonts.gstatic.com", "https://cdn.sanity.io"];

      links.forEach((href) => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (!existing) {
          const link = document.createElement("link");
          link.rel = "preconnect";
          link.href = href;
          link.crossOrigin = "anonymous";
          document.head.appendChild(link);
        }
      });
    };

    // Esegui al prossimo frame per non bloccare il rendering
    requestAnimationFrame(preconnectResources);
  }, []);

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

  // Scroll a ancora (#id) al mount e su hashchange
  useEffect(() => {
    const doScroll = () => {
      try {
        const raw = window.location.hash || "";
        if (!raw) return;
        const id = decodeURIComponent(raw.replace(/^#/, ""));
        if (!id) return;
        const el = document.getElementById(id);
        if (!el) return;
        // scroll-mt-* è già applicato sugli H2; usa smooth scroll globale
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // Migliora accessibilità: porta focus (se possibile)
        try {
          (el as any).focus?.();
        } catch {}
      } catch {}
    };
    // Esegui al primo paint e dopo
    const t = setTimeout(() => requestAnimationFrame(doScroll), 0);
    window.addEventListener("hashchange", doScroll);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", doScroll);
    };
  }, []);

  return (
    <article className="mx-auto max-w-6xl px-4 pb-12 prose prose-slate dark:prose-invert overflow-x-hidden">
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
            <ThemeToggle position="relative" />
          </div>
          <SaveLessonButton
            lesson={{
              id: lesson.id || lezione,
              slug: lesson.slug || lezione,
              title: lesson.title,
              thumb: lesson.thumbnailUrl ?? undefined,
            }}
          />
        </div>
        <h1 className="text-[27px] px-3 sm:text-4xl font-bold opacity-95 leading-tight">
          {lesson.title}
        </h1>
        {lesson.subtitle && (
          <h2 className="font-semibold text-sm sm:text-[16px] px-3">
            {lesson.subtitle}
          </h2>
        )}

        <div className="mt-4 flex flex-col items-center gap-2 px-2 pb-1">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto overflow-y-hidden min-w-max scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <FlashcardsSmallButton />
            <EserciziSmallButton />
            <LessonNotesClient
              lessonTitle={lesson.title}
              lessonSlug={lesson.slug}
            />
            <FormularioSection url={lesson.resources?.formulario ?? ""} />
          </div>
          <details className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm [.dark_&]:border-slate-700 [.dark_&]:bg-slate-800/80">
            <summary className="cursor-pointer select-none text-center font-semibold text-slate-700 [.dark_&]:text-slate-100">
              Altre opzioni
            </summary>
            <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link
                href={`/interrogazione?topic=${encodeURIComponent(lesson.title)}`}
                className="min-w-0 flex-shrink px-3 py-2 text-xs sm:text-sm font-semibold sm:font-bold shadow-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:brightness-110 hover:scale-105 transition-all duration-500 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
              >
                Simula interrogazione
              </Link>
              <Link
                href="/risolutore"
                className="min-w-0 flex-shrink px-3 py-2 text-xs sm:text-sm font-semibold sm:font-bold shadow-md bg-gradient-to-r from-[#2b7fff] to-[#55d4ff] text-white rounded-lg hover:brightness-110 hover:scale-105 transition-all duration-500 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
              >
                Risolutore esercizi
              </Link>
              <Link
                href="/compiti"
                className="min-w-0 flex-shrink px-3 py-2 text-xs sm:text-sm font-semibold sm:font-bold shadow-md bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:brightness-110 hover:scale-105 transition-all duration-500 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1"
              >
                Correggi compiti
              </Link>
            </div>
          </details>
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

      {/* Niente lista di sotto-lezioni: usata solo per SEO/breadcrumbs */}

      {/* Contenuto principale */}
      {contentSlot ? contentSlot : <PortableRenderer value={lesson.content} />}

      {/* Tag/percorsi in fondo alla lezione (non invasivi) */}
      {(!!(lesson.categoria && lesson.categoria.length) ||
        !!(lesson.classe && lesson.classe.length)) && (
        <div className="mt-6">
          <hr className="my-3 border-t border-slate-200" />
          <div className="flex flex-wrap gap-2 text-sm">
            {(lesson.categoria || []).map((c) => (
              <Link
                key={c}
                href={`/${lesson.materia === "fisica" ? "fisica" : "matematica"}/${slugify(c)}`}
                className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-200"
              >
                #{c}
              </Link>
            ))}
            {(lesson.classe || [])
              .map((cl) => ({ cl, href: classLink(cl) }))
              .filter((x) => !!x.href)
              .map((x) => (
                <Link
                  key={x.cl}
                  href={x.href!}
                  className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 hover:bg-blue-100"
                >
                  🎓 {x.cl}
                </Link>
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

      {/* FLASHCARDS - Anchor invisibile per il scroll del pulsante header */}
      <div data-flashcards-cta className="h-0" aria-hidden="true" />

      {/* Pulsante: Simula verifica spostato accanto al CTA esercizi dentro LessonExercises */}

      {/* Recensioni (ultima sezione) */}
      <LessonReview lessonSlug={lesson.slug} lessonTitle={lesson.title} />
    </article>
  );
}
