import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

export const revalidate = 3600; // Cache per 1 ora

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qRaw = (url.searchParams.get("q") || "").trim();

    // GROQ: simple title match and fallback to slug match
    const QUERY = qRaw
      ? `*[_type=="lesson" && (title match $q || slug.current match $q)]{
          _id, title, "slug": slug.current
        } | order(title asc)[0...20]`
      : `*[_type=="lesson"]{ _id, title, "slug": slug.current } | order(title asc)[0...20]`;

    const q = qRaw ? `${qRaw}*` : undefined;
    const items = await client.fetch(QUERY, q ? { q } : {});

    const rows = (items || []).filter((x: any) => x && x._id && x.slug);
    return NextResponse.json({
      items: rows.map((r: any) => ({ id: r._id, title: r.title, slug: r.slug })),
    });
  } catch (e) {
    console.error("lessons-search error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
