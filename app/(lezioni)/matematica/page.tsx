// app/matematica/page.tsx
import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";
import MatematicaClient from "./MatematicaClient";

export const revalidate = 120;
export const dynamic = "force-static";

// Import diretto per evitare flicker tra SSR e hydration

// Tipi minimi
type Lesson = {
  _id: string;
  title: string;
  nomeAbbreviato?: string;
  materia?: string;
  categoria: string[];
  classe: string[];
  slug: { current: string };
  thumbnailUrl?: string;
  sections?: string[];
  h2s?: { t: string[] }[];
};

const Q = groq`*[_type=="lesson"]{
  _id, title, nomeAbbreviato, materia, categoria, classe, slug, thumbnailUrl,
  "sections": content[_type=="section"].heading,
  "h2s": content[_type=="block" && style=="h2"]{ "t": children[].text }
} | order(title asc)`;

/* ================== SEO (solo server, zero UI) ================== */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/matematica`;

export async function generateMetadata() {
  const title =
    "Matematica — lezioni, esercizi svolti, formulari e videolezioni";
  const description =
    "Ripassa matematica con spiegazioni chiare, formulari ed esercizi svolti. Dalle medie al liceo, tutto in un unico posto.";
  return {
    title,
    description,
    alternates: { canonical: "/matematica" },
    robots: {
      index: true,
      follow: true,
      googleBot:
        "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    },
    openGraph: {
      title,
      description,
      url: CANONICAL,
      siteName: "Theoremz",
      type: "website",
      images: [{ url: "/metadata.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/metadata.png"],
      site: "@theoremz_",
    },
  };
}

function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function Page() {
  const lessons = await sanityFetch<Lesson[]>(Q, {
    cache: "force-cache",
    next: { revalidate },
    stega: false,
  });
  // Costruisci indice sezioni (solo per ricerca)
  const sectionIndex = (lessons || []).flatMap((l) => {
    const h2 = (l.h2s || []).map((b) => (b && Array.isArray(b.t) ? b.t.join("") : "")).filter(Boolean);
    const all = [...(l.sections || []), ...h2];
    return all.map((heading) => ({
      lessonId: l._id,
      lessonTitle: l.title,
      lessonSlug: l.slug.current,
      lessonThumb: l.thumbnailUrl || null,
      materia: l.materia || null,
      heading,
      classe: l.classe,
    }));
  });

  // JSON-LD invisibile (Breadcrumb + elenco lezioni + FAQ)
  const TOP_N = 12;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Matematica", item: CANONICAL },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Lezioni di matematica",
    numberOfItems: (lessons ?? []).length,
    itemListOrder: "http://schema.org/ItemListOrderAscending",
    itemListElement: (lessons ?? []).slice(0, TOP_N).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/${l.slug.current}`,
      name: l.title,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Posso trovare esercizi svolti e formulari?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sì, ogni argomento include esercizi svolti, formulari e spesso una videolezione.",
        },
      },
      {
        "@type": "Question",
        name: "È adatto per medie e superiori?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sì: puoi filtrare per classe e trovare il materiale più adatto.",
        },
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={faqJsonLd} />
      {/* Client con indice sezioni per la ricerca */}
      <MatematicaClient initialLessons={lessons ?? []} initialSections={sectionIndex} />
    </>
  );
}
