import { NextResponse } from "next/server";
import { client as base } from "@/sanity/lib/client";
import { groq } from "next-sanity";
import { requirePremium } from "@/lib/premium-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUERY = groq`
  *[_type=="exercise"]{
    _id,
    titolo,
    "lessonTitle": lezioniCollegate[0]->title,
    "lessonSlug":  lezioniCollegate[0]->slug.current
  } | order(lessonTitle asc, titolo asc)[$offset...$end]
`;

export async function GET(req: Request) {
  const auth = await requirePremium(req);
  if (!("user" in auth)) return auth;

  const url = new URL(req.url);
  const offsetParam = url.searchParams.get("offset");
  const limitParam = url.searchParams.get("limit");

  // basic parsing + sane defaults
  let offset = Number.parseInt(offsetParam || "0", 10);
  let limit = Number.parseInt(limitParam || "12", 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (!Number.isFinite(limit) || limit <= 0 || limit > 100) limit = 12;

  const end = offset + limit;

  const client = base.withConfig({
    token: process.env.SANITY_TOKEN,
    apiVersion: "2025-07-23",
    useCdn: false,
  });

  try {
    const items = await client.fetch<any[]>(QUERY, { offset, end });
    return NextResponse.json(
      { ok: true, items, offset, limit },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
