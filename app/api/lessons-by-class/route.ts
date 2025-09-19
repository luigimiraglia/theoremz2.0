import { NextResponse } from "next/server";
import { sanity } from "@/lib/sanity";

export const revalidate = 600; // 10 min

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classe = searchParams.get("classe");
  const classesCsv = searchParams.get("classes");
  const list = (classesCsv
    ? classesCsv.split(",").map((s) => s.trim()).filter(Boolean)
    : classe
      ? [classe]
      : []);
  if (!list.length) {
    return NextResponse.json({ error: "missing_classe" }, { status: 400 });
  }

  const query = `*[_type=="lesson" && count((classe)[@ in $classes]) > 0]{
    title,
    "slug": slug.current,
    categoria
  } | order(title asc)`;

  try {
    const items = await sanity.fetch(query, { classes: list });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "sanity_error" }, { status: 500 });
  }
}
