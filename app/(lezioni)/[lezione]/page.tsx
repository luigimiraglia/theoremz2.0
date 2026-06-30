import type { Metadata } from "next";
import { groq } from "next-sanity";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/lib/sanityFetch";
import type { PortableTextBlock } from "sanity";
import LessonClient from "./LessonClient"; // client wrapper for interactive UI
import LessonContentServer from "./LessonContentServer"; // server-rendered content for better LCP
import SeoJsonLd from "./SeoJsonLd"; // <-- JSON-LD Article + Breadcrumbs
import LessonPrefetch from "@/components/LessonPrefetch"; // Prefetch intelligente

// Usa ISR per performance e SEO migliori; aggiorna periodicamente
export const revalidate = 7200; // 2 ore - ridotto il consumo di ISR

// Prefetch delle risorse critiche per performance ottimale
export const runtime = 'nodejs'; // Assicura runtime ottimizzato
export const dynamic = 'force-static'; // Forza generazione statica quando possibile

/* -------------------- Tipi -------------------- */
type LessonResources = {
  formulario?: string | null;
  appunti?: string | null;
  videolezione?: string | null;
};
type LinkedLesson = { title: string; slug: { current: string } };

type LessonDoc = {
  _id: string;
  title: string;
  subtitle?: string | null;
  materia?: string | null;
  slug: { current: string };
  thumbnailUrl?: string | null;
  resources?: LessonResources;
  content: PortableTextBlock[];
  _createdAt?: string;
  _updatedAt?: string;
  tags?: string[];
  seoDefinizione?: string | null;
  categoria?: string[];
  classe?: string[];
  formule?: {
    title?: string;
    formula: string;
    explanation: string;
    difficulty: number;
  }[];
  // ⬇️ nuovi
  lezioniPropedeuticheObbligatorie?: LinkedLesson[];
  lezioniPropedeuticheOpzionali?: LinkedLesson[];
  lezioniFiglie?: LinkedLesson[];
  // reverse lookup: lezioni che referenziano questa (padre/i)
  parents?: LinkedLesson[];
};
type IndexItem = { heading: string; shortTitle: string };

/* -------------------- Query -------------------- */
const seoLessonQuery = groq`
  *[_type=="lesson" && slug.current==$slug][0]{
    _id, title, subtitle, materia, slug, thumbnailUrl,
    content[0..2], _createdAt, _updatedAt, tags,
    categoria, classe,
    "seoDefinizione": content[_type=="riepilogoBlock"][0].definizione,
    formule[]{
      formula,
      explanation,
      difficulty
    }
  }
`;
const fullLessonQuery = groq`
  *[_type == "lesson" && slug.current == $slug][0]{
    _id, title, subtitle, materia, slug, thumbnailUrl, resources, content,
    _createdAt, _updatedAt, tags,
    categoria, classe,
    formule[]{ title, formula, explanation, difficulty },
    lezioniPropedeuticheObbligatorie[]->{ title, "slug": slug },
    lezioniPropedeuticheOpzionali[]->{ title, "slug": slug },
    lezioniFiglie[]->{ title, "slug": slug, thumbnailUrl },
    "parents": *[_type == "lesson" && references(^._id)][0..2]{ title, "slug": slug }
  }
`;

const allLessonSlugsQuery = groq`
  *[_type == "lesson" && defined(slug.current)].slug.current
`;

export async function generateStaticParams(): Promise<{ lezione: string }[]> {
  const slugs = await sanityFetch<string[]>(allLessonSlugsQuery);
  return (slugs ?? []).map((slug) => ({ lezione: slug }));
}

/* -------------------- Helpers SEO -------------------- */
function limitForSerp(s: string, max = 62) {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1).trimEnd();
  return /[.,:;–-]$/.test(cut) ? cut + "…" : cut + "…";
}
function buildSeoTitle(raw: string): string {
  const t = (raw ?? "").trim();

  const rules: Array<{ test: RegExp; suffix: string }> = [
    { test: /apotema|poligoni?/i, suffix: "Definizione, Formule e Tabella" },
    {
      test: /cerchio|circonferenza|archi|corde/i,
      suffix: "Formule, Esempi e Disegni",
    },
    {
      test: /derivat|studio.*funzion/i,
      suffix: "Regole, Trucchi ed Esercizi Svolti",
    },
    { test: /integral/i, suffix: "Metodi, Tabelle ed Esempi" },
    {
      test: /vettor|moto|cinematic|dinamic/i,
      suffix: "Spiegazione Semplice + Esempi",
    },
    {
      test: /probabil|combinatori/i,
      suffix: "Formule, Esempi ed Errori Tipici",
    },
  ];

  // ✅ FIX: usa la RegExp dentro all’oggetto
  const match = rules.find((r) => r.test.test(t));

  const base =
    t.length <= 30
      ? `${t} – Guida Completa, Esempi e Formulari`
      : match
        ? `${t} – ${match.suffix}`
        : `${t} – Spiegazione, Formule ed Esempi`;

  // Non aggiungere il brand qui: il layout ha già title.template "%s | Theoremz"
  return limitForSerp(base);
}
function extractFaqForJsonLd(content: PortableTextBlock[]): { question: string; answer: string }[] {
  const result: { question: string; answer: string }[] = [];
  for (const block of content ?? []) {
    const b = block as any;
    if (b._type !== "faqBlock") continue;
    for (const item of b.items ?? []) {
      const q = String(item.question ?? "").trim();
      if (!q) continue;
      const a = (item.answer ?? [])
        .filter((ab: any) => ab._type === "block")
        .map((ab: any) => (ab.children ?? []).map((c: any) => String(c.text ?? "")).join(""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (a) result.push({ question: q, answer: a.slice(0, 500) });
    }
  }
  return result;
}

function toAnchorId(s: string): string {
  const t = String(s || "").toLowerCase();
  return t
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
function ptToPlain(blocks: PortableTextBlock[] | undefined): string {
  if (!blocks) return "";
  const out: string[] = [];
  for (const b of blocks) {
    if (b._type === "block" && Array.isArray(b.children)) {
      out.push(b.children.map((c: any) => c.text ?? "").join(""));
    }
    if (out.join(" ").length > 400) break;
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}
function trimDesc(s: string, max = 160) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

/* -------------------- generateMetadata -------------------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lezione: string }>;
}): Promise<Metadata> {
  const { lezione } = await params;
  const lesson = await sanityFetch<LessonDoc>(seoLessonQuery, {
    slug: lezione,
  });
  if (!lesson) {
    return {
      title: "Lezione non trovata | Theoremz",
      robots: { index: false, follow: false },
    };
  }

  const title = buildSeoTitle(lesson.title);
  const plain = trimDesc(
    lesson.seoDefinizione ||
    ptToPlain(lesson.content) ||
    lesson.subtitle ||
    ""
  );
  const description =
    plain || "Lezione completa con spiegazione, formule ed esempi su Theoremz.";

  const baseUrl = "https://theoremz.com";
  const canonical = `${baseUrl}/${lesson.slug.current}`;
  const ogImage = lesson.thumbnailUrl ?? "/metadata.png";

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
      googleBot:
        "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: "Theoremz",
      images: [{ 
        url: ogImage,
        width: 1200,
        height: 630,
        alt: title
      }],
      locale: "it_IT",
      publishedTime: lesson._createdAt,
      modifiedTime: lesson._updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      site: "@theoremz_",
    },
    keywords: [
      lesson.title,
      ...(lesson.tags ?? []),
      ...(lesson.categoria ?? []),
      "formule",
      "esempi",
      "esercizi svolti",
      "spiegazione",
      "theoremz",
      lesson.materia ?? "matematica",
      "studio",
      "scuola superiore",
    ],
    other: {
      // SEO avanzato per ranking
      "article:author": "Theoremz",
      "article:section": lesson.materia || "Matematica e Fisica",
      "article:tag": lesson.tags?.join(", ") || "",
      // Performance hints
      "format-detection": "telephone=no",
      "theme-color": "#3b82f6",
    },
  };
}

/* -------------------- Page UI (INVARIATA) -------------------- */
export default async function Page({
  params,
}: {
  params: Promise<{ lezione: string }>;
}) {
  const { lezione } = await params;

  const lesson = await sanityFetch<LessonDoc>(fullLessonQuery, {
    slug: lezione,
  });
  if (!lesson) notFound();

  const sectionItems: IndexItem[] = [];
  for (const block of lesson.content ?? []) {
    const b = block as any;
    switch (b._type) {
      case "riepilogoBlock":
        sectionItems.push({ heading: "concetto-chiave", shortTitle: "Concetto chiave" });
        break;
      case "schemaRapidoBlock":
        if (b.caption) {
          const id = b.caption.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
          sectionItems.push({ heading: id, shortTitle: (b.caption as string).slice(0, 35) });
        } else {
          sectionItems.push({ heading: "schema-rapido", shortTitle: "Schema rapido" });
        }
        break;
      case "section": {
        const heading = b.heading ?? b.shortTitle;
        if (heading) sectionItems.push({ heading, shortTitle: b.shortTitle ?? heading });
        break;
      }
      case "erroriComuniBlock":
        if (b.heading) sectionItems.push({ heading: b.heading, shortTitle: (b.heading as string).slice(0, 35) });
        break;
      case "faqBlock":
        if (b.heading) sectionItems.push({ heading: b.heading, shortTitle: (b.heading as string).slice(0, 35) });
        break;
    }
  }

  // JSON-LD: aggiungi anche le sezioni come hasPart con ancore (#)
  const sectionHasPart = sectionItems.map((s) => ({
    name: s.shortTitle,
    slug: `${lesson.slug.current}#${toAnchorId(s.heading)}`,
  }));

  // Estrai domande FAQ per FAQPage schema (rich results)
  const faqItems = extractFaqForJsonLd(lesson.content);

  // Estrai definizione dal riepilogoBlock per abstract JSON-LD
  const seoAbstract = (lesson.content ?? []).find((b: any) => b._type === "riepilogoBlock") as any;
  const abstract = seoAbstract?.definizione as string | undefined;

  return (
    <>
      {/* JSON-LD strutturato (Article + Breadcrumbs) */}
      <SeoJsonLd
        title={lesson.title}
        subtitle={lesson.subtitle ?? undefined}
        slug={lesson.slug.current}
        thumbnailUrl={lesson.thumbnailUrl ?? undefined}
        videoUrl={lesson.resources?.videolezione ?? undefined}
        createdAt={lesson._createdAt}
        updatedAt={lesson._updatedAt}
        abstract={abstract}
        faqItems={faqItems.length ? faqItems : undefined}
        formule={(lesson.formule ?? []).filter((f) => f.title && f.explanation) as { title: string; explanation: string }[]}
        categoria={(lesson as any).categoria ?? []}
        classe={(lesson as any).classe ?? []}
        breadcrumbs={(function () {
          const SITE = "https://theoremz.com";
          const materia = (lesson as any).materia as string | null | undefined;
          const second =
            materia && /matematica|fisica/i.test(materia)
              ? {
                  name:
                    materia.charAt(0).toUpperCase() +
                    materia.slice(1).toLowerCase(),
                  item: `${SITE}/${materia.toLowerCase()}`,
                }
              : { name: "Lezioni", item: SITE };
          const crumbs = [{ name: "Theoremz", item: `${SITE}/` }, second];
          const parent = (lesson.parents ?? [])[0];
          if (parent?.slug?.current && parent?.title) {
            crumbs.push({
              name: parent.title,
              item: `${SITE}/${parent.slug.current}`,
            });
          }
          crumbs.push({
            name: lesson.title,
            item: `${SITE}/${lesson.slug.current}`,
          });
          return crumbs;
        })()}
        // SEO relations: sotto-lezioni + sezioni con ancore
        hasPart={[
          ...(lesson.lezioniFiglie ?? []).map((c) => ({
            name: c.title,
            slug: c.slug.current,
          })),
          ...sectionHasPart,
        ]}
        isPartOf={(lesson.parents ?? []).map((p) => ({
          name: p.title,
          slug: p.slug.current,
        }))}
      />

      {/* H1 server-rendered per garantire che i bot vedano il titolo nell'HTML iniziale */}
      <h1 className="sr-only">{lesson.title}</h1>

      {/* UI: render content server-side and pass it into client wrapper to reduce hydration cost */}
      <LessonClient
        lezione={lezione}
        lesson={{
          id: lesson._id,
          title: lesson.title,
          subtitle: lesson.subtitle ?? null,
          slug: lesson.slug.current,
          thumbnailUrl: lesson.thumbnailUrl ?? null,
          resources: lesson.resources ?? {},
          content: lesson.content,
          materia: (lesson as any).materia ?? null,
          categoria: (lesson as any).categoria ?? [],
          classe: (lesson as any).classe ?? [],
          // ⬇️ passa i prerequisiti
          lezioniPropedeuticheObbligatorie:
            lesson.lezioniPropedeuticheObbligatorie ?? [],
          lezioniPropedeuticheOpzionali:
            lesson.lezioniPropedeuticheOpzionali ?? [],
          // ⬇️ passa le sotto-lezioni
          lezioniFiglie: lesson.lezioniFiglie ?? [],
        }}
        sectionItems={sectionItems}
        contentSlot={<LessonContentServer value={lesson.content} lessonTitle={lesson.title} />}
      />
      
      {/* Prefetch intelligente per risorse correlate */}
      <LessonPrefetch
        currentLessonId={lesson._id}
        relatedLessons={[
          ...(lesson.lezioniFiglie ?? []).map(l => ({
            slug: l.slug?.current || '',
            title: l.title
          })),
          ...(lesson.lezioniPropedeuticheObbligatorie ?? []).map(l => ({
            slug: l.slug?.current || '',
            title: l.title
          }))
        ].filter(l => l.slug)}
        formularioUrl={lesson.resources?.formulario || undefined}
        videolezioneUrl={lesson.resources?.videolezione || undefined}
      />
    </>
  );
}
