import { NextResponse } from "next/server";
import { client as base } from "@/sanity/lib/client";
import { groq } from "next-sanity";

export const revalidate = 0;

const QUERY = groq`
  *[_type=="exercise"]{
    _id,
    titolo,
    "lessonTitle": lezioniCollegate[0]->title,
    "lessonSlug":  lezioniCollegate[0]->slug.current
  } | order(lessonTitle asc, titolo asc)[$offset...$end]
`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const offsetParam = url.searchParams.get("offset");
  const limitParam = url.searchParams.get("limit");

  // basic parsing + sane defaults
  let offset = Number.parseInt(offsetParam || "0", 10);
  let limit = Number.parseInt(limitParam || "12", 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (!Number.isFinite(limit) || limit <= 0 || limit > 100) limit = 12;

  const end = offset + limit;

  // use CDN for public, token-less reads
  const client = base.withConfig({ useCdn: true });

  try {
    const items = await client.fetch<any[]>(
      QUERY,
      { offset, end },
      { cache: "no-store" }
    );
    return NextResponse.json({ ok: true, items, offset, limit });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

