import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import OpenAI from "openai";
import { adminAuth } from "@/lib/firebaseAdmin";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parsePt(content: any[]): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((block: any) => {
      if (block?._type === "block")
        return block.children?.map((c: any) => c?.text).join(" ") || "";
      if (block?._type === "latex") return `Formula: ${block.code || ""}`;
      if (block?._type === "section") return `Sezione: ${block.heading || ""}`;
      return "";
    })
    .join("\n\n")
    .trim();
}

async function verifyAuth(req: Request) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req);
    if (!auth)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const lessonIds: string[] = (body?.lessonIds || []).filter(
      (x: any) => typeof x === "string"
    );
    const durationMin = Math.min(
      240,
      Math.max(10, Number(body?.durationMin || 60))
    );
    if (!lessonIds.length) {
      return NextResponse.json({ error: "missing_lessons" }, { status: 400 });
    }

    const LESSONS = await client.fetch(
      `*[_type=="lesson" && _id in $ids]{ _id, title, content }`,
      { ids: lessonIds }
    );

    const pieces: string[] = [];
    const titles: string[] = [];
    for (const l of LESSONS || []) {
      const title = l?.title || "Senza titolo";
      titles.push(title);
      pieces.push(`# ${title}\n\n${parsePt(l?.content || [])}`);
    }

    const syllabus = pieces.join("\n\n---\n\n");

    const system = `Sei un docente di matematica/fisica in Italia. Crea una verifica di classe, in italiano, basata SOLO sui contenuti forniti. Stile sobrio, scolastico e professionale.

Regole di impaginazione e contenuto (riempi almeno un foglio A4):
- Struttura: titolo, istruzioni brevi (1–2 righe), poi un elenco numerato di esercizi a difficoltà crescente.
- Ogni esercizio deve essere chiaro e ben separato; puoi usare sottopunti (a), b), c)) se serve. NIENTE soluzioni nel testo.
- NON indicare i punti dei singoli esercizi né il totale; NON fare riferimenti a nomi/argomenti di lezioni.
- Non inserire immagini. Se servono formule, usa LaTeX: inline tra $...$ oppure blocchi tra $$...$$.
- La verifica deve occupare almeno un foglio A4 intero; se il tempo e il programma lo richiedono, può estendersi su più pagine.

Adatta difficoltà e ampiezza al tempo a disposizione:
- Se la durata è 60 minuti genera 5–6 esercizi compatti e ben centrati sugli obiettivi.
- Se la durata è 120 minuti genera 6–8 esercizi, anche con sottopunti, più articolati. Va bene se la verifica supera una pagina.

Output in JSON con due campi Markdown: exam_md (solo testo della verifica, SENZA soluzioni) e solutions_md (soluzioni sintetiche per il docente). Nient'altro.`;

    const userMsg = `Durata prova (minuti): ${durationMin}.\n\nProgramma su cui basare la verifica (estratto dalle lezioni selezionate):\n\n${syllabus}\n\nGenera una verifica coerente con questo programma e adatta al tempo indicato.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
    });

    const raw = (completion.choices[0]?.message?.content || "").trim();
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // very defensive: try to extract fenced JSON
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {}
      }
    }

    let examMd = String(parsed.exam_md || parsed.examMd || "").trim();
    let solutionsMd = String(
      parsed.solutions_md || parsed.solutionsMd || ""
    ).trim();

    // Fallback: if model ignored JSON, treat entire content as exam
    if (!examMd && raw) {
      // try split by a "Soluzioni" heading
      const idx = raw.toLowerCase().indexOf("soluzioni");
      if (idx > 0) {
        examMd = raw.slice(0, idx).trim();
        solutionsMd = raw
          .slice(idx)
          .replace(/^soluzioni[:\s-]*/i, "")
          .trim();
      } else {
        examMd = raw;
      }
    }

    if (!examMd) {
      return NextResponse.json({ error: "empty_generation" }, { status: 502 });
    }

    const title =
      titles.length === 1
        ? `Verifica: ${titles[0]}`
        : `Verifica: ${titles.slice(0, 3).join(", ")}${titles.length > 3 ? "…" : ""}`;

    return NextResponse.json({
      title,
      examMd,
      solutionsMd,
    });
  } catch (e) {
    console.error("mock-exam generate error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
