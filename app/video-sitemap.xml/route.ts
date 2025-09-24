import { NextResponse } from "next/server";
import { groq } from "next-sanity";
import { sanityFetch } from "@/lib/sanityFetch";

export const revalidate = 1800; // 30 min

type Row = {
  slug?: string | null;
  title?: string | null;
  thumbnailUrl?: string | null;
  video?: string | null;
  _updatedAt?: string | null;
};

const Q = groq`*[_type=="lesson" && defined(resources.videolezione)]{
  "slug": slug.current,
  "title": title,
  "thumbnailUrl": thumbnailUrl,
  "video": resources.videolezione,
  _updatedAt
}`;

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toYouTubeEmbed(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (url.pathname.includes("/embed/")) return url.toString();
    }
  } catch {}
  return null;
}

export async function GET() {
  const base = "https://theoremz.com";
  const rows = await sanityFetch<Row[]>(Q);
  const items = (rows || []).filter((r) => r.slug && r.video);

  const xmlParts: string[] = [];
  xmlParts.push(
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'
  );

  for (const r of items) {
    const loc = `${base}/${r.slug}`;
    const thumb = r.thumbnailUrl ? `${r.thumbnailUrl}` : `${base}/opengraph-image`;
    const title = escapeXml(r.title || (r.slug as string));
    const desc = escapeXml(`Videolezione su ${r.title || r.slug}`);
    const embed = r.video ? toYouTubeEmbed(r.video) : null;
    const pub = r._updatedAt || undefined;

    xmlParts.push("<url>");
    xmlParts.push(`<loc>${loc}</loc>`);
    xmlParts.push("<video:video>");
    xmlParts.push(`<video:thumbnail_loc>${escapeXml(thumb)}</video:thumbnail_loc>`);
    xmlParts.push(`<video:title>${title}</video:title>`);
    xmlParts.push(`<video:description>${desc}</video:description>`);
    if (embed) {
      xmlParts.push(`<video:player_loc allow_embed="yes">${escapeXml(embed)}</video:player_loc>`);
    } else if (r.video) {
      xmlParts.push(`<video:content_loc>${escapeXml(r.video)}</video:content_loc>`);
    }
    if (pub) xmlParts.push(`<video:publication_date>${escapeXml(pub)}</video:publication_date>`);
    xmlParts.push("</video:video>");
    xmlParts.push("</url>");
  }

  xmlParts.push("</urlset>");
  const xml = xmlParts.join("");
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
