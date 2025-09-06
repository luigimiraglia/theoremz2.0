import { groq } from "next-sanity";
import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanityFetch";
import ExerciseCard from "@/components/ExerciseCard";
import type { PortableTextBlock } from "sanity";
import Link from "next/link";

export const revalidate = 1800; // 30 min

type LessonRow = { _id: string; title: string; slug: { current: string } };
type ExerciseRow = {
  _id: string;
  titolo: string;
  testo?: PortableTextBlock[];
  soluzione?: PortableTextBlock[];
  passaggi?: PortableTextBlock[];
};

const LESSON_BY_SLUG = groq`*[_type=="lesson" && slug.current==$slug][0]{ _id, title, slug }`;
const EX_BY_LESSON = groq`*[_type=="exercise" && references($lessonId)]{ _id, titolo, testo, soluzione, passaggi } | order(titolo asc)`;

export async function generateStaticParams() {
  // raccogli i lesson slug che compaiono in almeno un esercizio
  const rows = await sanityFetch<{ slugs?: (string | null)[] }[]>(
    `*[_type=="exercise" && defined(lezioniCollegate)]{ "slugs": lezioniCollegate[]->slug.current }`
  );
  const set = new Set<string>();
  for (const r of rows || []) {
    for (const s of r.slugs || []) {
      if (s) set.add(s);
    }
  }
  return Array.from(set).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await sanityFetch<LessonRow | null>(LESSON_BY_SLUG, { slug });
  if (!lesson) {
    return {
      title: "Esercizi — lezione non trovata",
      robots: { index: false, follow: false },
    };
  }
  const title = `Esercizi su ${lesson.title} — con soluzioni e passaggi`;
  const canonical = `/esercizi/${lesson.slug.current}`;
  const description = `Allenati con esercizi su ${lesson.title}: tracce chiare, soluzioni e passaggi spiegati.`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot:
        "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    },
    openGraph: {
      title,
      description,
      url: `https://theoremz.com${canonical}`,
      siteName: "Theoremz",
      type: "website",
      images: [{ url: "/metadata.png" }],
      locale: "it_IT",
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

// Convert a subset of PortableText blocks to plain text
function ptToPlain(blocks: PortableTextBlock[] | undefined, max = 800) {
  if (!blocks) return "";
  const out: string[] = [];
  for (const b of blocks) {
    if ((b as any)._type === "block" && Array.isArray((b as any).children)) {
      out.push(((b as any).children || []).map((c: any) => c.text || "").join(""));
    }
    if (out.join(" ").length > max) break;
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

export default async function EserciziPerLezione({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = await sanityFetch<LessonRow | null>(LESSON_BY_SLUG, { slug });
  if (!lesson) {
    return (
      <main className="max-w-6xl mx-auto px-4 pt-2 sm:pt-4 pb-10">
        <h1 className="text-2xl font-bold">Lezione non trovata</h1>
        <p className="mt-2">
          La pagina potrebbe essere stata spostata o rimossa.
        </p>
      </main>
    );
  }

  const items = await sanityFetch<ExerciseRow[]>(EX_BY_LESSON, {
    lessonId: lesson._id,
  });

  const SITE = "https://theoremz.com";
  const canonical = `${SITE}/esercizi/${lesson.slug.current}`;

  // JSON-LD PracticeProblem per i primi esercizi
  const practiceJsonLd = {
    "@context": "https://schema.org",
    "@graph": (items || []).slice(0, 3).map((ex) => ({
      "@type": "PracticeProblem",
      name: ex.titolo,
      isAccessibleForFree: true,
      eduQuestionType: "Esercizio svolto",
      isPartOf: {
        "@type": "LearningResource",
        name: lesson.title,
        url: `${SITE}/${lesson.slug.current}`,
      },
      hasPart: {
        "@type": "Question",
        name: ex.titolo,
        acceptedAnswer: {
          "@type": "Answer",
          text: ptToPlain(ex.soluzione || ex.passaggi || ex.testo, 800),
        },
      },
    })),
  };

  return (
    <main className="max-w-6xl mx-auto px-4 pt-2 sm:pt-4 pb-10">
      <JsonLd data={practiceJsonLd} />

      <nav aria-label="breadcrumb" className="text-sm text-slate-600 mb-2">
        <Link href="/">Home</Link> ·{" "}
        <a href={`/${lesson.slug.current}`}>{lesson.title}</a> ·
        <span className="font-semibold"> Esercizi</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
        Esercizi su {lesson.title}
      </h1>
      <p className="mt-1 text-slate-700">
        Selezione di esercizi con passaggi e soluzioni. Per la teoria, vedi la
        lezione:{" "}
        <a href={`/${lesson.slug.current}`} className="text-blue-600 underline">
          {lesson.title}
        </a>
        .
      </p>

      {!items?.length ? (
        <p className="mt-6 text-slate-500">
          Nessun esercizio disponibile per questa lezione.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((ex) => (
            <ExerciseCard
              key={ex._id}
              ex={{
                _id: ex._id,
                titolo: ex.titolo,
                testo: ex.testo,
                soluzione: ex.soluzione,
                passaggi: ex.passaggi,
                lesson: { title: lesson.title, slug: lesson.slug.current },
              }}
            />
          ))}
        </div>
      )}

      <link rel="canonical" href={canonical} />
    </main>
  );
}
