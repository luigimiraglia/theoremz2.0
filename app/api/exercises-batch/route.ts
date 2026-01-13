import { NextResponse } from "next/server";
import { client as base } from "@/sanity/lib/client";
import { groq } from "next-sanity";
import { requirePremium } from "@/lib/premium-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUERY = groq`
  *[_type=="exercise" && _id in $ids]{
    _id,
    titolo,
    testo,
    soluzione,
    passaggi,
    "lessonTitle": lezioniCollegate[0]->title,
    "lessonSlug":  lezioniCollegate[0]->slug.current
  }
`;

export async function GET(req: Request) {
  const auth = await requirePremium(req);
  if (!("user" in auth)) return auth;

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ ok: false, error: "Missing ids" }, { status: 400 });
  }
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.length) {
    return NextResponse.json({ ok: false, error: "Empty ids" }, { status: 400 });
  }

  const client = base.withConfig({
    token: process.env.SANITY_TOKEN,
    apiVersion: "2025-07-23",
    useCdn: false,
  });
  try {
    const items = await client.fetch<any[]>(QUERY, { ids });
    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
