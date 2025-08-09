import { NextResponse } from "next/server";
import { client as base } from "@/sanity/lib/client";
import { groq } from "next-sanity";

export const revalidate = 0;

const QUERY = groq`
*[_type=="exercise"]{
  _id,
  titolo,
  testo,
  soluzione,
  passaggi,
  "lessonTitle": lezioniCollegate[0]->title,
  "lessonSlug":  lezioniCollegate[0]->slug.current
} | order(lessonTitle asc, titolo asc)
`;

export async function GET() {
  const client = base.withConfig({
    token: process.env.SANITY_TOKEN, // server-only
    apiVersion: "2025-07-23",
    useCdn: false,
  });

  try {
    const items = await client.fetch(QUERY, {}, { cache: "no-store" });
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
