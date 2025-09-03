import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";

// Revalidate the sitemap periodically to keep it fresh
export const revalidate = 3600; // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://theoremz.com";

  // Static key pages
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/matematica`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/fisica`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/esercizi`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/black`, changeFrequency: "monthly", priority: 0.7 },
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

  return [...staticEntries, ...lessonEntries, ...exerciseEntries];
}
