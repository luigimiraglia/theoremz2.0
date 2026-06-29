import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

// Revalidate the sitemap periodically to keep it fresh
export const revalidate = 14400; // 4 ore - ridotto il consumo di ISR

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://theoremz.com";

  // ── Pagine statiche ────────────────────────────────────────────────────────
  const staticEntries: MetadataRoute.Sitemap = [
    // Hub principali — massima priorità
    { url: `${baseUrl}/`,           changeFrequency: "daily",  priority: 1.0 },
    { url: `${baseUrl}/matematica`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/fisica`,     changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/lezioni`,    changeFrequency: "weekly", priority: 0.9  }, // indice completo
    { url: `${baseUrl}/glossario`,  changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/esercizi`,   changeFrequency: "weekly", priority: 0.8  },

    // Calcolatori — valore transazionale alto (query "X online")
    { url: `${baseUrl}/calcolatori`,                              changeFrequency: "weekly",  priority: 0.85 },
    { url: `${baseUrl}/calcolatori/calcolo-percentuale`,          changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/mcd-online`,                   changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/mcm-online`,                   changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/scomposizione-fattori-primi`,  changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/numero-primo`,                 changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/equivalenze`,                  changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/calcolatrice-frazioni`,        changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/proporzioni-online`,           changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/potenze-online`,               changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/derivate-online`,              changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/integrali-online`,             changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/espressioni-online`,           changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/equazioni`,                    changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/equazioni-secondo-grado`,      changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/calcolatori/sistemi-equazioni`,            changeFrequency: "monthly", priority: 0.75 },

    // Pagine brand/info — crawl budget ridotto, non SEO primario
    { url: `${baseUrl}/risoluzione-esercizi`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/chisiamo`,             changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/ilmetodotheoremz`,     changeFrequency: "monthly", priority: 0.4 },
    // Escluse intenzionalmente: /black, /contatto-rapido, /prenota, /diagnosi-gratuita
    // (pagine di conversione — non target SEO organico, meglio non indicizzarle via sitemap)
  ];

  // Dynamic lesson pages from Sanity
  type Row = { slug?: string | null; _updatedAt?: string };
  const rows = await client.fetch<Row[]>(
    `*[_type == "lesson" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`
  );

  // Lezioni — sono le money pages: priorità alta, weekly perché si aggiornano
  const lessonEntries: MetadataRoute.Sitemap = rows
    .filter((r) => !!r.slug)
    .map((r) => ({
      url: `${baseUrl}/${r.slug}`,
      lastModified: r._updatedAt ? new Date(r._updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.9,
    }));

  // Exercise index pages per lesson (if any)
  type ExRow = { slugs?: (string | null)[] };
  const exRows = await client.fetch<ExRow[]>(
    `*[_type=="exercise" && defined(lezioniCollegate)]{ "slugs": lezioniCollegate[]->slug.current }`
  );
  const exSet = new Set<string>();
  for (const r of exRows || []) {
    for (const s of r.slugs || []) if (s) exSet.add(s);
  }
  // Pagine esercizi per lezione — buon valore SEO per long-tail "esercizi svolti X"
  const exerciseEntries: MetadataRoute.Sitemap = Array.from(exSet).map((slug) => ({
    url: `${baseUrl}/esercizi/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Category pages for matematica
  type CatRow = { categoria?: string[] };
  const catDocs = await client.fetch<CatRow[]>(`*[_type=="lesson" && materia=="matematica"]{ categoria }`);
  const catSet = new Set<string>();
  for (const d of catDocs || []) for (const c of d.categoria || []) catSet.add(c);
  // Pagine categoria — aggregano lezioni per argomento
  const catEntries: MetadataRoute.Sitemap = Array.from(catSet).map((c) => ({
    url: `${baseUrl}/matematica/${c.toLowerCase().replace(/\s+/g, "-")}`,
    changeFrequency: "weekly",
    priority: 0.65,
  }));
  // Category pages for fisica
  const fisCatDocs = await client.fetch<CatRow[]>(`*[_type=="lesson" && materia=="fisica"]{ categoria }`);
  const fisSet = new Set<string>();
  for (const d of fisCatDocs || []) for (const c of d.categoria || []) fisSet.add(c);
  const fisCatEntries: MetadataRoute.Sitemap = Array.from(fisSet).map((c) => ({
    url: `${baseUrl}/fisica/${c.toLowerCase().replace(/\s+/g, "-")}`,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  // Scuola pages (media + liceo)
  type ClRow = { classe?: string[] };
  const clDocs = await client.fetch<ClRow[]>(`*[_type=="lesson"]{ classe }`);
  const media: Array<{ anno: string }> = [];
  const liceo: Array<{ indirizzo: string; anno: string }> = [];
  for (const d of clDocs || []) {
    for (const c of d.classe || []) {
      const mMedia = c.match(/^(\d+)º\s+Media$/i);
      if (mMedia) media.push({ anno: mMedia[1] });
      const m = c.match(/^(\d+)º\s+(.+)$/);
      if (m && !/Media/i.test(c)) liceo.push({ indirizzo: m[2].toLowerCase().replace(/\s+/g, "-"), anno: m[1] });
    }
  }
  const uniq = <T,>(arr: T[], key: (x: T) => string) => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const it of arr) { const k = key(it); if (!seen.has(k)) { seen.add(k); out.push(it); } }
    return out;
  };
  // Pagine scuola — navigazione per anno/indirizzo
  const mediaEntries: MetadataRoute.Sitemap = uniq(media, (x) => x.anno).map((x) => ({
    url: `${baseUrl}/scuola/media/${x.anno}`,
    changeFrequency: "weekly",
    priority: 0.65,
  }));
  const liceoEntries: MetadataRoute.Sitemap = uniq(liceo, (x) => `${x.indirizzo}-${x.anno}`).map((x) => ({
    url: `${baseUrl}/scuola/liceo/${x.indirizzo}/${x.anno}`,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  return [
    ...staticEntries,   // hub + calcolatori + brand
    ...lessonEntries,   // lezioni (0.9) — money pages
    ...exerciseEntries, // esercizi per lezione (0.7)
    ...catEntries,      // categorie matematica (0.65)
    ...fisCatEntries,   // categorie fisica (0.65)
    ...mediaEntries,    // scuola media (0.65)
    ...liceoEntries,    // scuola liceo (0.65)
  ];
}
