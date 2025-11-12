import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const userId = body?.userId;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "missing_user" }, { status: 400 });
    }

    const db = supabaseServer();
    const stamp = new Date().toISOString();
    const { error } = await db
      .from("black_students")
      .update({ last_active_at: stamp })
      .eq("user_id", userId);
    if (error) {
      console.error("[black-activity] update failed", error);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[black-activity] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
