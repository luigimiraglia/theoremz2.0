import { NextResponse } from "next/server";
import { client as base } from "@/sanity/lib/client";
import { groq } from "next-sanity";
import { requirePremium } from "@/lib/premium-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUERY = groq`
  *[_type == "lesson" && _id == $lessonId][0] {
    _id,
    title,
    slug,
    formule[] {
      title,
      formula,
      explanation,
      difficulty
    }
  }
`;

export async function GET(req: Request) {
  const auth = await requirePremium(req);
  if (!("user" in auth)) return auth;

  const lessonId = new URL(req.url).searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json(
      { ok: false, error: "missing_lesson_id" },
      { status: 400 }
    );
  }

  const client = base.withConfig({
    token: process.env.SANITY_TOKEN,
    apiVersion: "2025-07-23",
    useCdn: false,
  });

  try {
    const lesson = await client.fetch(QUERY, { lessonId });
    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: "lesson_not_found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: true, lesson },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
