import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QA = { question: string; answer: string };

export async function POST(req: Request) {
  if (!openai) {
    return NextResponse.json({ error: "missing_openai_api_key" }, { status: 500 });
  }

  let body: { topic?: string; history?: QA[]; done?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const topic = (body.topic || "").slice(0, 160).trim();
  const history: QA[] = Array.isArray(body.history)
    ? body.history
        .map((qa) => ({
          question: typeof qa?.question === "string" ? qa.question.slice(0, 400) : "",
          answer: typeof qa?.answer === "string" ? qa.answer.slice(0, 800) : "",
        }))
        .filter((qa) => qa.question && qa.answer)
    : [];

  if (!topic) {
    return NextResponse.json({ error: "missing_topic" }, { status: 400 });
  }

  const done = Boolean(body.done);

  const userTextParts = [
    `Argomento: ${topic}`,
    `Modalità: interrogazione orale simulata`,
    history.length
      ? `Cronologia QA:\n${history
          .map(
            (qa, i) =>
              `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer || "N/A"}`
          )
          .join("\n\n")}`
      : "Nessuna risposta ancora.",
    done
      ? "Richiedo solo la valutazione finale e un voto in decimi, senza nuove domande."
      : "Fornisci una nuova domanda breve e valuta l'ultima risposta in modo sintetico.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages = [
    {
      role: "system",
      content:
        "Sei un docente di matematica/fisica realistico ma incoraggiante. Valuti con flessibilità: premi chiarezza e ragionamento, non solo formalismo. Rispondi solo con JSON valido: { nextQuestion?: string, feedback?: { lastAnswer?: string, scoreComment?: string }, final?: { grade: number, summary: string, strengths: string[], weaknesses: string[] } }. nextQuestion solo se richiesto; grade 0-10. Tono costruttivo.",
    } as const,
    { role: "user", content: userTextParts } as const,
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "empty_completion" }, { status: 502 });
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid_response", raw }, { status: 502 });
    }

    const clean = {
      nextQuestion: parsed?.nextQuestion?.slice(0, 400) || null,
      feedback: parsed?.feedback
        ? {
            lastAnswer: parsed.feedback.lastAnswer?.slice(0, 600) || null,
            scoreComment: parsed.feedback.scoreComment?.slice(0, 400) || null,
          }
        : null,
      final: parsed?.final
        ? {
            grade:
              typeof parsed.final.grade === "number"
                ? Math.max(0, Math.min(10, Math.round(parsed.final.grade * 10) / 10))
                : null,
            summary: parsed.final.summary?.slice(0, 600) || null,
            strengths: Array.isArray(parsed.final.strengths)
              ? parsed.final.strengths.map((s: unknown) => String(s).slice(0, 240)).filter(Boolean)
              : [],
            weaknesses: Array.isArray(parsed.final.weaknesses)
              ? parsed.final.weaknesses.map((s: unknown) => String(s).slice(0, 240)).filter(Boolean)
              : [],
          }
        : null,
    };

    return NextResponse.json(clean);
  } catch (error) {
    console.error("[interrogazione] unexpected", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
