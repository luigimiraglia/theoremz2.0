// app/matematica/page.tsx
import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";
import dynamicImport from "next/dynamic";

export const revalidate = 120;
export const dynamic = "force-static";

const MatematicaClient = dynamicImport(() => import("./MatematicaClient"), {
  loading: () => (
    <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-gray-500">
      Caricamento…
    </div>
  ),
});

// Tipi minimi per i dati
type Lesson = {
  _id: string;
  title: string;
  nomeAbbreviato?: string;
  categoria: string[];
  classe: string[];
  slug: { current: string };
  thumbnailUrl?: string;
};

const Q = groq`*[_type=="lesson" && materia=="matematica"]{
  _id, title, nomeAbbreviato, categoria, classe, slug, thumbnailUrl
} | order(title asc)`;

export default async function Page() {
  const lessons = await sanityFetch<Lesson[]>(Q, {
    cache: "force-cache",
    next: { revalidate },
    stega: false, // payload più pulito
    // (assicurati che sanity client usi useCdn: true)
  });

  return <MatematicaClient initialLessons={lessons ?? []} />;
}
