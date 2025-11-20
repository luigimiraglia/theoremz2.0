import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(req: Request) {
  try {
    if (!openai) {
      return NextResponse.json(
        { error: "missing_openai_api_key" },
        { status: 500 }
      );
    }

    const { prompt, image } = await req.json();
    if (!image && (!prompt || typeof prompt !== "string" || !prompt.trim())) {
      return NextResponse.json({ error: "missing_prompt" }, { status: 400 });
    }

    const userContent: Array<{ type: string; text?: string; image_url?: any }> = [];
    const safePrompt =
      typeof prompt === "string" && prompt.trim().length
        ? prompt.trim()
        : "L'esercizio è presente nell'immagine allegata";

    userContent.push({
      type: "text",
      text: `Esercizio inviato dallo studente:\n${safePrompt}\n\nRispondi SOLO con JSON valido. Schema: {\n  "steps": [\n    { "title": "Dati da estrarre", "body": "Elenco puntato dei dati e delle incognite" },\n    { "title": "Strategia", "body": "Spiega in modo semplice il piano di risoluzione" },\n    { "title": "Passaggio k", "body": "Descrivi ogni passaggio con frasi brevi, latex per le formule e commenti per studenti non esperti" },\n    { "title": "Risultato", "body": "Riassumi il risultato e verifica tutte le richieste" }\n  ]\n}.\nScrivi con tono didattico, evita salti logici, usa esempi quando utili e Latex tra $$ $$ o $ $.`,
    });

    if (image && typeof image === "string") {
      userContent.push({
        type: "image_url",
        image_url: {
          url: image,
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Sei Theoremz AI Tutor. Rispondi solo con JSON valido: { steps: [{ title: string, body: markdown }] }. Usa Latex racchiuso tra $$ $$ o $ $.",
        },
        {
          role: "user",
          content: userContent as any,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json(
        { error: "empty_completion" },
        { status: 502 }
      );
    }

    let payload: { steps?: Array<{ title: string; body: string }> } | null = null;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      console.error("[risolutore] JSON parse failed", raw, err);
      return NextResponse.json(
        { error: "invalid_response", raw },
        { status: 502 }
      );
    }

    if (!payload?.steps?.length) {
      return NextResponse.json(
        { error: "missing_steps", raw },
        { status: 502 }
      );
    }

    return NextResponse.json({ steps: payload.steps });
  } catch (error) {
    console.error("[risolutore] unexpected", error);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
