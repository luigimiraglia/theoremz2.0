import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requirePremium } from "@/lib/premium-access";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(req: Request) {
  try {
    const auth = await requirePremium(req);
    if (!("user" in auth)) return auth;

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
      text: `Esercizio inviato dallo studente:\n${safePrompt}\n\nRispondi SOLO con JSON valido e minimale. Schema obbligatorio:\n{\n  "summary": "1-2 frasi che anticipano l'idea chiave",\n  "final_answer": "risultato finale in latex o testo",\n  "steps": [\n    { "title": "Titolo libero", "body": "Spiega il passaggio con molti dettagli, latex tra $$ $$ o $ $, commenti chiari per uno studente" },\n    { "title": "Titolo libero", "body": "Aggiungi tutti i passaggi necessari, nessun limite di lunghezza o numero" }\n  ],\n  "checks": ["controllo unità o coerenza 1", "controllo 2"]\n}\nRegole: tono didattico e molto dettagliato, nessun limite al numero di passaggi, includi ogni micro-passaggio utile. Niente testo fuori dallo schema JSON, nessuna prosa extra.`,
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
            "Sei Theoremz AI Tutor. Rispondi solo con JSON valido: { summary?: string, final_answer?: string, steps: [{ title: string, body: markdown }], checks?: string[] }. Usa Latex racchiuso tra $$ $$ o $ $. Scrivi passaggi lunghi e molto dettagliati, senza limite di numero. Non inserire altro testo.",
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

    let payload: {
      summary?: string;
      final_answer?: string;
      steps?: Array<{ title: string; body: string }>;
      checks?: string[];
    } | null = null;
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

    const sanitizeLatex = (text?: string | null) => normalizeLatexDelimiters(text || "");
    const normalizedSteps =
      payload.steps?.map((step) => ({
        title: step.title,
        body: sanitizeLatex(step.body),
      })) || [];

    return NextResponse.json({
      summary: payload.summary ?? null,
      finalAnswer: sanitizeLatex(payload.final_answer ?? null),
      checks: Array.isArray(payload.checks) ? payload.checks.filter(Boolean) : null,
      steps: normalizedSteps,
    });
  } catch (error) {
    console.error("[risolutore] unexpected", error);
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}

function normalizeLatexDelimiters(text: string) {
  if (!text) return text;
  return text
    .replace(/\\\\\[/g, "$$")
    .replace(/\\\\\]/g, "$$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\\\\\(/g, "$")
    .replace(/\\\\\)/g, "$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}
