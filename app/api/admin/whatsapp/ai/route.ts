import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase";

const ALLOWED_EMAIL = "luigi.miraglia006@gmail.com";
const VISION_MODEL = "gpt-4o-mini";

function isAdminEmail(email?: string | null) {
  return Boolean(email && email.toLowerCase() === ALLOWED_EMAIL);
}

async function getAdminAuth() {
  try {
    const mod = await import("@/lib/firebaseAdmin");
    return mod.adminAuth;
  } catch (err) {
    console.error("[admin/whatsapp/ai] firebase admin unavailable", err);
    return null;
  }
}

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  const adminAuth = await getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: "admin_auth_unavailable" }, { status: 503 });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("[admin/whatsapp/ai] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const phoneTail = typeof body.phoneTail === "string" ? body.phoneTail.trim() : "";
  const targetMessage = typeof body.message === "string" ? body.message.trim() : "";

  if (!phoneTail || !targetMessage) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || "";
  if (!openaiApiKey) {
    return NextResponse.json({ error: "missing_openai_key" }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const db = supabaseServer();

  const convoPromise = db
    .from("black_whatsapp_conversations")
    .select(
      [
        "id",
        "phone_tail",
        "phone_e164",
        "student_id",
        "status",
        "type",
        "bot",
        "black_students(id, student_name, student_email, parent_email, year_class, track, goal, difficulty_focus, readiness, ai_description, next_assessment_subject, next_assessment_date)",
      ].join(",")
    )
    .eq("phone_tail", phoneTail)
    .maybeSingle();

  const messagesPromise = db
    .from("black_whatsapp_messages")
    .select("role, content, created_at")
    .or(`phone_tail.eq.${phoneTail}`)
    .order("created_at", { ascending: true })
    .limit(40);

  const [convoRes, messagesRes] = await Promise.all([convoPromise, messagesPromise]);
  if (convoRes.error) {
    console.error("[admin/whatsapp/ai] convo fetch error", convoRes.error);
    return NextResponse.json({ error: "convo_fetch_error" }, { status: 500 });
  }
  const convo = convoRes.data;

  const history = (messagesRes.data || []).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: sanitizeContent(m.content),
  }));

  const student = (convo as any)?.black_students;
  const studentContext = buildStudentContext(student);

  const prompt = `
Sei un tutor Theoremz che assiste via WhatsApp. Genera una risposta breve e chiara per l'ultimo messaggio indicato, in italiano, testo semplice (niente markdown, niente latex). 
- Tono: umano, empatico, operativo.
- Usa il contesto studente solo se serve; non parlare di piani/prezzi.
- Se mancano dettagli, chiedi 1 chiarimento specifico.
- Non promettere escalation a tutor umano (sei tu il tutor).
`;

  try {
    const completion = await openai.chat.completions.create({
      model: VISION_MODEL,
      temperature: 0.5,
      max_tokens: 260,
      messages: [
        { role: "system", content: prompt },
        studentContext ? { role: "system", content: `Scheda studente:\n${studentContext}` } : null,
        history.length
          ? { role: "system", content: `Cronologia sintetica:\n${history.map(formatMsg).join("\n")}` }
          : null,
        { role: "user", content: `Ultimo messaggio da cui ripartire:\n${targetMessage}` },
      ].filter(Boolean) as any,
    });
    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ error: "empty_reply" }, { status: 500 });
    }
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[admin/whatsapp/ai] openai error", err);
    return NextResponse.json({ error: "openai_error" }, { status: 500 });
  }
}

function sanitizeContent(content: any) {
  if (typeof content !== "string") return "";
  const withoutData = content.replace(/data:image[^ \n]+/gi, "[image]");
  const trimmed = withoutData.trim();
  return trimmed.slice(0, 800);
}

function formatMsg(entry: { role: string; content: string }) {
  const who = entry.role === "assistant" ? "AI" : "Utente";
  return `${who}: ${entry.content}`;
}

function buildStudentContext(student: any) {
  if (!student) return null;
  const parts: string[] = [];
  if (student.student_name) parts.push(`Nome: ${student.student_name}`);
  if (student.student_email) parts.push(`Email studente: ${student.student_email}`);
  if (student.parent_email) parts.push(`Email genitore: ${student.parent_email}`);
  if (student.year_class) parts.push(`Classe: ${student.year_class}`);
  if (student.track) parts.push(`Percorso: ${student.track}`);
  if (student.goal) parts.push(`Goal: ${student.goal}`);
  if (student.difficulty_focus) parts.push(`Difficoltà: ${student.difficulty_focus}`);
  if (typeof student.readiness === "number") parts.push(`Readiness: ${student.readiness}/100`);
  if (student.next_assessment_subject || student.next_assessment_date) {
    parts.push(
      `Prossima verifica: ${student.next_assessment_subject || "—"} ${student.next_assessment_date || ""}`.trim()
    );
  }
  if (student.ai_description) parts.push(`Nota tutor: ${student.ai_description}`);
  return parts.length ? parts.join("\n") : null;
}
