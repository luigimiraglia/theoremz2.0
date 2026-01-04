import { NextResponse } from "next/server";
import { client as base } from "@/sanity/lib/client";
import { groq } from "next-sanity";

export const revalidate = 600; // Cache per 10 min per ridurre CPU

const QUERY = groq`
*[_type=="exercise" && references($lessonId)]{
  _id, titolo, testo, soluzione, passaggi,
  "lessonTitle": lezioniCollegate[0]->title,
  "lessonSlug":  lezioniCollegate[0]->slug.current
} | order(titolo asc)
`;

export async function GET(req: Request) {
  const lessonId = new URL(req.url).searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json(
      { ok: false, error: "Missing lessonId" },
      { status: 400 }
    );
  }

  const client = base.withConfig({
    token: process.env.SANITY_TOKEN,
    apiVersion: "2025-07-23",
    useCdn: false,
  });

  try {
    const items = await client.fetch(
      QUERY,
      { lessonId },
      { cache: "no-store" }
    );
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    let errorMessage: string;

    if (e instanceof Error) {
      errorMessage = e.message;
    } else {
      errorMessage = String(e);
    }

    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
