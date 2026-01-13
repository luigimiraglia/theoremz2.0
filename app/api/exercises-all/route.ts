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
  testo,
  soluzione,
  passaggi,
  "lessonTitle": lezioniCollegate[0]->title,
  "lessonSlug":  lezioniCollegate[0]->slug.current
} | order(lessonTitle asc, titolo asc)
`;

export async function GET(req: Request) {
  const auth = await requirePremium(req);
  if (!("user" in auth)) return auth;

  const client = base.withConfig({
    token: process.env.SANITY_TOKEN, // server-only
    apiVersion: "2025-07-23",
    useCdn: false,
  });

  try {
    const items = await client.fetch(QUERY, {});
    return NextResponse.json(
      { ok: true, items },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
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
