import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

// Revalidate the sitemap periodically to keep it fresh
export const revalidate = 14400; // 4 ore - ridotto il consumo di ISR

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://theoremz.com";

  // Static key pages
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/matematica`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/fisica`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/esercizi`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/black`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/chisiamo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/mentor`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/risoluzione-esercizi`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/contatto-rapido`, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dynamic lesson pages from Sanity
  type Row = { slug?: string | null; _updatedAt?: string };
  const rows = await client.fetch<Row[]>(
    `*[_type == "lesson" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`
  );

  const lessonEntries: MetadataRoute.Sitemap = rows
    .filter((r) => !!r.slug)
    .map((r) => ({
      url: `${baseUrl}/${r.slug}`,
      lastModified: r._updatedAt ? new Date(r._updatedAt) : undefined,
      changeFrequency: "monthly",
      priority: 0.8,
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
  const exerciseEntries: MetadataRoute.Sitemap = Array.from(exSet).map((slug) => ({
    url: `${baseUrl}/esercizi/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Category pages for matematica
  type CatRow = { categoria?: string[] };
  const catDocs = await client.fetch<CatRow[]>(`*[_type=="lesson" && materia=="matematica"]{ categoria }`);
  const catSet = new Set<string>();
  for (const d of catDocs || []) for (const c of d.categoria || []) catSet.add(c);
  const catEntries: MetadataRoute.Sitemap = Array.from(catSet).map((c) => ({
    url: `${baseUrl}/matematica/${c.toLowerCase().replace(/\s+/g, "-")}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  // Category pages for fisica
  const fisCatDocs = await client.fetch<CatRow[]>(`*[_type=="lesson" && materia=="fisica"]{ categoria }`);
  const fisSet = new Set<string>();
  for (const d of fisCatDocs || []) for (const c of d.categoria || []) fisSet.add(c);
  const fisCatEntries: MetadataRoute.Sitemap = Array.from(fisSet).map((c) => ({
    url: `${baseUrl}/fisica/${c.toLowerCase().replace(/\s+/g, "-")}`,
    changeFrequency: "weekly",
    priority: 0.6,
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
  const mediaEntries: MetadataRoute.Sitemap = uniq(media, (x) => x.anno).map((x) => ({
    url: `${baseUrl}/scuola/media/${x.anno}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  const liceoEntries: MetadataRoute.Sitemap = uniq(liceo, (x) => `${x.indirizzo}-${x.anno}`).map((x) => ({
    url: `${baseUrl}/scuola/liceo/${x.indirizzo}/${x.anno}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...lessonEntries, ...catEntries, ...fisCatEntries, ...mediaEntries, ...liceoEntries, ...exerciseEntries];
}
