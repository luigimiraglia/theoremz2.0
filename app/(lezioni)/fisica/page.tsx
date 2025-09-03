// app/fisica/page.tsx
import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";
import FisicaClient from "./FisicaClient";

export const revalidate = 120;
export const dynamic = "force-static";

// Import diretto per evitare flicker tra SSR e hydration

// Tipi minimi
type Lesson = {
  _id: string;
  title: string;
  nomeAbbreviato?: string;
  categoria: string[];
  classe: string[];
  slug: { current: string };
  thumbnailUrl?: string;
};

const Q = groq`*[_type=="lesson" && materia=="fisica"]{
  _id, title, nomeAbbreviato, categoria, classe, slug, thumbnailUrl
} | order(title asc)`;

/* ================== SEO (solo server, zero UI) ================== */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theoremz.com";
const CANONICAL = `${SITE}/fisica`;

export async function generateMetadata() {
  const title = "Fisica — lezioni, esercizi svolti, formulari e videolezioni";
  const description =
    "Ripassa fisica con spiegazioni chiare, schemi, esercizi svolti e videolezioni: cinematica, dinamica, elettromagnetismo e altro. Dalle medie al liceo.";
  return {
    title,
    description,
    alternates: { canonical: "/fisica" },
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

  // JSON-LD invisibile (Breadcrumb + elenco lezioni + FAQ)
  const TOP_N = 12;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Fisica", item: CANONICAL },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Lezioni di fisica",
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
        name: "Posso trovare esercizi svolti e formulari di fisica?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sì, per i principali argomenti trovi esercizi svolti passo passo, formulari e spesso una videolezione.",
        },
      },
      {
        "@type": "Question",
        name: "Coprite anche cinematica, dinamica ed elettromagnetismo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sì, sono inclusi i capitoli fondamentali di fisica per medie e superiori, con materiale filtrabile per classe.",
        },
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={faqJsonLd} />
      {/* UI INVARIATA: solo il tuo client */}
      <FisicaClient initialLessons={lessons ?? []} />
    </>
  );
}
