import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";

export async function GET() {
  const client = createClient({
    projectId: "0nqn5jl0",
    dataset: "production",
    apiVersion: "2025-07-23",
    token: process.env.SANITY_TOKEN, // <-- deve essere token Editor
    useCdn: true,
  });

  try {
    const count = await client.fetch(`count(*[_type == "exercise"])`);
    return NextResponse.json({ ok: true, exerciseCount: count });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
