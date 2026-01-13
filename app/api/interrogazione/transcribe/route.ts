import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePremium } from "@/lib/premium-access";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePremium(req);
  if (!("user" in auth)) return auth;

  if (!openai) {
    return NextResponse.json({ error: "missing_openai_api_key" }, { status: 500 });
  }

  let body: { audio?: string; mime?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const audio = typeof body.audio === "string" ? body.audio : "";
  if (!audio) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }

  try {
    // Support data URL or base64 string
    let base64 = audio;
    if (audio.startsWith("data:")) {
      const parts = audio.split(",");
      base64 = parts[1] || "";
    }
    const buffer = Buffer.from(base64, "base64");
    const mime = typeof body.mime === "string" && body.mime.includes("/") ? body.mime : "audio/webm";

    const file = new File([buffer], "answer.webm", { type: mime });
    const transcript = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "json",
    });

    const text = (transcript as any)?.text || "";
    if (!text) {
      return NextResponse.json({ error: "empty_transcription" }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[interrogazione/transcribe] unexpected", error);
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }
}
