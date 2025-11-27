import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewExercise = {
  title: string;
  score: number | null;
  correct: string[];
  issues: string[];
  improvements: string[];
};

type ReviewPayload = {
  exercises: ReviewExercise[];
  overall?: string | null;
};

export async function POST(req: Request) {
  if (!openai) {
    return NextResponse.json({ error: "missing_openai_api_key" }, { status: 500 });
  }

  let body: { images?: string[]; notes?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images.filter(Boolean).slice(0, 5) : [];
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 800) : "";

  if (!images.length) {
    return NextResponse.json({ error: "missing_images" }, { status: 400 });
  }

  const userContent: Array<{ type: string; text?: string; image_url?: any }> = [];
  userContent.push({
    type: "text",
    text: `Compiti svolti inviati dallo studente. Note aggiuntive: ${notes || "nessuna"}.\n\nRestituisci SOLO JSON valido con schema: {\n  "exercises": [\n    {\n      "title": "Esercizio 1 (o testo riconosciuto)",\n      "score": 0-10,\n      "correct": ["punti corretti"],\n      "issues": ["errori o punti mancanti"],\n      "improvements": ["consigli specifici"]\n    }\n  ],\n  "overall": "feedback generale opzionale"\n}\nRegole: individua e separa gli esercizi; se non riconosci il numero, crea un titolo descrittivo breve. Punteggio stile verifica (0-10) per ogni esercizio. Linguaggio chiaro e sintetico.`,
  });

  for (const img of images) {
    if (typeof img === "string") {
      userContent.push({
        type: "image_url",
        image_url: { url: img },
      });
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Sei Theoremz AI Tutor: valuta i compiti, trova errori e suggerisci miglioramenti. Rispondi solo con JSON valido: { exercises: [{ title, score, correct: string[], issues: string[], improvements: string[] }], overall?: string }.",
        },
        { role: "user", content: userContent as any },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "empty_completion" }, { status: 502 });
    }

    let parsed: ReviewPayload | null = null;
    try {
      parsed = JSON.parse(raw) as ReviewPayload;
    } catch {
      return NextResponse.json({ error: "invalid_response", raw }, { status: 502 });
    }

    if (!parsed?.exercises?.length) {
      return NextResponse.json({ error: "missing_exercises", raw }, { status: 502 });
    }

    const clean: ReviewPayload = {
      exercises: parsed.exercises
        .map((ex) => ({
          title: typeof ex.title === "string" ? ex.title.slice(0, 160) : "Esercizio",
          score: typeof ex.score === "number" ? Math.max(0, Math.min(10, Math.round(ex.score * 10) / 10)) : null,
          correct: Array.isArray(ex.correct) ? ex.correct.map((c) => String(c).slice(0, 240)).filter(Boolean) : [],
          issues: Array.isArray(ex.issues) ? ex.issues.map((c) => String(c).slice(0, 240)).filter(Boolean) : [],
          improvements: Array.isArray(ex.improvements)
            ? ex.improvements.map((c) => String(c).slice(0, 260)).filter(Boolean)
            : [],
        }))
        .filter((ex) => ex.title),
      overall: parsed.overall ? String(parsed.overall).slice(0, 800) : null,
    };

    return NextResponse.json(clean);
  } catch (error) {
    console.error("[compiti] unexpected", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
