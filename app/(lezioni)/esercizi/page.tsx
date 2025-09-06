import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";
import EserciziClient, { type ExerciseDoc } from "./Client";

const LIST_QUERY = groq`
  *[_type=="exercise"]{
    _id,
    titolo,
    "lessonTitle": lezioniCollegate[0]->title,
    "lessonSlug":  lezioniCollegate[0]->slug.current
  } | order(lessonTitle asc, titolo asc)[0...$limit]
`;

const COUNT_QUERY = groq`count(*[_type=="exercise"])`;

export const revalidate = 300; // SSR primo blocco, aggiorna periodicamente

export default async function EserciziPage() {
  const LIMIT = 12;
  const [items, total] = await Promise.all([
    sanityFetch<any[]>(LIST_QUERY, { limit: LIMIT }),
    sanityFetch<number>(COUNT_QUERY),
  ]);

  const mapped: ExerciseDoc[] = (items || []).map((d: any) => ({
    _id: d._id,
    titolo: d.titolo,
    lesson: d.lessonSlug ? { title: d.lessonTitle, slug: d.lessonSlug } : null,
  }));

  const SITE = "https://theoremz.com";
  const canonical = `${SITE}/esercizi`;

  return (
    <>
      {/* Canonical esplicito per evitare discrepanze segnalate dai crawler */}
      <link rel="canonical" href={canonical} />
      <EserciziClient
        initialItems={mapped}
        initialTotal={total || mapped.length}
        initialLimit={LIMIT}
      />
    </>
  );
}
