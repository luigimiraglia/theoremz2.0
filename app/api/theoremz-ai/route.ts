// /app/api/theoremz-ai/route.ts
import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Funzione per trasformare Portable Text in stringa semplice
function parsePortableText(content: any[]): string {
  if (!Array.isArray(content)) return "";

  return content
    .map((block: any) => {
      if (block._type === "block") {
        return block.children?.map((child: any) => child.text).join(" ") || "";
      }
      if (block._type === "latex") {
        return `Formula: ${block.code || ""}`;
      }
      if (block._type === "section") {
        return `Sezione: ${block.heading}`;
      }
      return "";
    })
    .join("\n\n")
    .trim();
}

export async function POST(req: Request) {
  try {
    const { messages, lessonId, userId, isSubscribed } = await req.json();

    // Controllo abbonamento (soft check dal client)
    if (!isSubscribed) {
      return NextResponse.json({
        reply:
          "🔒 Per usare Theoremz AI devi abbonarti. [Abbonati qui](https://theoremz.com/black)",
      });
    }

    // Recupero lezione da Sanity
    let lessonTitle = "Sconosciuto";
    let lessonContent = "";

    if (lessonId) {
      const lesson = await client.fetch(`*[_id == $id][0]{ title, content }`, {
        id: lessonId,
      });
      if (lesson) {
        lessonTitle = lesson.title || "Senza titolo";
        lessonContent = parsePortableText(lesson.content);
      }
    }

    // Prompt di sistema con contesto lezione
    const systemPrompt = `Sei Theoremz AI Tutor.
La lezione su cui stai lavorando è: "${lessonTitle}".
Contenuto della lezione:
${lessonContent || "(Nessun testo disponibile)"}.
Rispondi sempre in relazione a questa lezione e mantieni uno stile chiaro, ordinato e didattico.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // o "gpt-5-mini" quando disponibile
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });

    return NextResponse.json({
      reply: completion.choices[0]?.message?.content || "",
    });
  } catch (err) {
    console.error("Errore API Theoremz AI:", err);
    return NextResponse.json(
      {
        reply:
          "⚠️ C'è stato un problema a contattare l'AI. Riprova tra un attimo.",
      },
      { status: 500 }
    );
  }
}
