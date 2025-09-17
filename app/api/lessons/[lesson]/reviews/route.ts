import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ lesson: string }> }
) {
  try {
    const { lesson } = await ctx.params;
    if (!lesson || typeof lesson !== "string") {
      return NextResponse.json({ ok: false, error: "invalid_lesson" }, { status: 400 });
    }

    const { name, email, rating, comment } = await req.json();

    const nm = (name ?? "").toString().trim();
    const cm = (comment ?? "").toString().trim();
    const em = (email ?? "").toString().trim() || null;
    const rt = Number(rating);

    if (!nm || !cm || !rt || rt < 1 || rt > 5) {
      return NextResponse.json({ ok: false, error: "missing_or_invalid_fields" }, { status: 400 });
    }

    const headers = new Headers(req.headers);
    const ua = headers.get("user-agent") || null;
    const referer = headers.get("referer") || null;
    const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const doc = {
      lesson: lesson.toString().slice(0, 160),
      name: nm.slice(0, 120),
      email: em ? em.slice(0, 160) : null,
      rating: Math.round(rt),
      comment: cm.slice(0, 2000),
      ts: Date.now(),
      ua,
      referer,
      ip,
    } as const;

    await adminDb.collection("lesson_reviews").add(doc);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "server_error" }, { status: 500 });
  }
}

