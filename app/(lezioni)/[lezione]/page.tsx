import type { Metadata } from "next";
import { groq } from "next-sanity";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/lib/sanityFetch";
import type { PortableTextBlock } from "sanity";
import LessonClient from "./LessonClient"; // client wrapper for interactive UI
import LessonContentServer from "./LessonContentServer"; // server-rendered content for better LCP
import SeoJsonLd from "./SeoJsonLd"; // <-- JSON-LD Article + Breadcrumbs

// Usa ISR per performance e SEO migliori; aggiorna periodicamente
export const revalidate = 1800; // 30 minuti

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
  // ⬇️ nuovi
  lezioniPropedeuticheObbligatorie?: LinkedLesson[];
  lezioniPropedeuticheOpzionali?: LinkedLesson[];
  lezioniFiglie?: LinkedLesson[];
  // reverse lookup: lezioni che referenziano questa (padre/i)
  parents?: LinkedLesson[];
};
type SectionBlock = PortableTextBlock & {
  _type: "section";
  heading?: string;
  shortTitle?: string;
};

/* -------------------- Query -------------------- */
const seoLessonQuery = groq`
  *[_type=="lesson" && slug.current==$slug][0]{
    _id, title, subtitle, slug, thumbnailUrl,
    content[0..2], _createdAt, _updatedAt, tags
  }
`;
const fullLessonQuery = groq`
  *[_type == "lesson" && slug.current == $slug][0]{
    _id, title, subtitle, materia, slug, thumbnailUrl, resources, content,
    _createdAt, _updatedAt, tags,
    categoria, classe,
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
  const plain = trimDesc(ptToPlain(lesson.content) || lesson.subtitle || "");
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
      googleBot:
        "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: "Theoremz",
      images: [{ url: ogImage }],
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
      "formule",
      "esempi",
      "esercizi",
      "appunti",
      "theoremz",
      "lezione",
    ],
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

  const sections: SectionBlock[] = (lesson.content ?? []).filter(
    (b): b is SectionBlock => (b as { _type?: string })._type === "section"
  );
  const sectionItems = sections
    .map((s) => {
      const heading = s.heading ?? s.shortTitle;
      if (!heading) return null;
      return {
        _type: "section" as const,
        heading,
        shortTitle: s.shortTitle ?? heading,
      };
    })
    .filter(
      (x): x is { _type: "section"; heading: string; shortTitle: string } =>
        x !== null
    );

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
        breadcrumbs={(function () {
          const SITE = "https://theoremz.com";
          const materia = (lesson as any).materia as string | null | undefined;
          const second = materia && /matematica|fisica/i.test(materia)
            ? {
                name: materia.charAt(0).toUpperCase() + materia.slice(1).toLowerCase(),
                item: `${SITE}/${materia.toLowerCase()}`,
              }
            : { name: "Lezioni", item: SITE };
          const crumbs = [
            { name: "Theoremz", item: `${SITE}/` },
            second,
          ];
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
        // SEO relations
        hasPart={(lesson.lezioniFiglie ?? []).map((c) => ({
          name: c.title,
          slug: c.slug.current,
        }))}
        isPartOf={(lesson.parents ?? []).map((p) => ({
          name: p.title,
          slug: p.slug.current,
        }))}
      />

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
        contentSlot={<LessonContentServer value={lesson.content} />}
      />
    </>
  );
}
