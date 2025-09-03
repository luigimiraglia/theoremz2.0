import { NextResponse } from "next/server";
import { sanity } from "@/lib/sanity";

export const revalidate = 600; // 10 min

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classe = searchParams.get("classe");
  if (!classe) {
    return NextResponse.json({ error: "missing_classe" }, { status: 400 });
  }

  const query = `*[_type=="lesson" && $classe in classe]{
    title,
    "slug": slug.current,
    categoria
  } | order(title asc)`;

  try {
    const items = await sanity.fetch(query, { classe });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "sanity_error" }, { status: 500 });
  }
}

