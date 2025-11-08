import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const ALLOWED = new Set(
  (process.env.ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((s) => s.split("#")[0]?.trim())
    .filter(Boolean)
);

async function send(chat_id: number | string, text: string) {
  await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
}

type CmdCtx = {
  db: ReturnType<typeof supabaseServer>;
  chatId: number;
  text: string;
};

async function resolveStudentId(db: any, query: string) {
  const { data, error } = await db.rpc("search_black_student", { q: query });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    return { err: `❌ Nessuno studente trovato per: *${query}*` };
  if (data.length > 1) {
    const list = data
      .slice(0, 6)
      .map((r: any) => `• ${r.student_name}`)
      .join("\n");
    return { err: `⚠️ Più risultati:\n${list}\n\nRaffina la ricerca.` };
  }
  return { id: data[0].student_id, name: data[0].student_name };
}

/** /s <nome> → invia scheda (brief) */
async function cmdS({ db, chatId, text }: CmdCtx) {
  const q = text.replace(/^\/s(@\w+)?\s*/i, "").trim();
  if (!q) return send(chatId, "Uso: `/s cognome`");
  const r = await resolveStudentId(db, q);
  if ((r as any).err) return send(chatId, (r as any).err);
  const { id, name } = r as any;

  // prova a leggere il brief, se non esiste rigenera
  let { data: brief } = await db
    .from("black_student_brief")
    .select("brief_md")
    .eq("student_id", id)
    .maybeSingle();
  if (!brief?.brief_md) {
    await db.rpc("refresh_black_brief", { _student: id });
    ({ data: brief } = await db
      .from("black_student_brief")
      .select("brief_md")
      .eq("student_id", id)
      .maybeSingle());
  }
  await send(
    chatId,
    `*Scheda — ${name}*\n\n${brief?.brief_md || "_Nessun brief._"}`
  );
}

/** /n <nome> <testo...> → aggiungi nota + refresh */
async function cmdN({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/n(?:@\w+)?\s+(\S+)(?:\s+([\s\S]+))?$/i);
  if (!m) return send(chatId, "Uso: `/n cognome testo_della_nota`");
  const [, q, body] = m;
  if (!body)
    return send(
      chatId,
      "Scrivi anche la nota, es: `/n rossi ripasso lenti entro ven`"
    );

  const r = await resolveStudentId(db, q);
  if ((r as any).err) return send(chatId, (r as any).err);
  const { id, name } = r as any;

  const { error } = await db.rpc("add_note_and_refresh", {
    _student: id,
    _body: body,
    _source: "telegram",
    _author_id: null,
    _ai_desc: null,
  });
  if (error) return send(chatId, `❌ Errore: ${error.message}`);
  await send(chatId, `✅ Nota aggiunta a *${name}* e scheda aggiornata.`);
}

/** /v <nome> <materia> <voto>/<max> [data=YYYY-MM-DD] */
async function cmdV({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/v(?:@\w+)?\s+(\S+)\s+(\S+)\s+(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?:\s+(\d{4}-\d{2}-\d{2}))?$/i
  );
  if (!m)
    return send(
      chatId,
      "Uso: `/v cognome materia 7.5/10 2025-11-12` (data opzionale)"
    );
  const [, q, subject, score, max, when] = m;

  const r = await resolveStudentId(db, q);
  if ((r as any).err) return send(chatId, (r as any).err);
  const { id, name } = r as any;

  const { error: e1 } = await db.from("black_grades").insert({
    student_id: id,
    subject,
    score: Number(score),
    max_score: Number(max),
    when_at: when || new Date().toISOString().slice(0, 10),
  });
  if (e1) return send(chatId, `❌ Errore voto: ${e1.message}`);

  await db.rpc("refresh_black_brief", { _student: id });
  await send(
    chatId,
    `✅ Voto registrato per *${name}*: ${score}/${max}${when ? " (" + when + ")" : ""}`
  );
}

/** /ass <nome> <data YYYY-MM-DD> <materia> [topics...] */
async function cmdASS({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/ass(?:@\w+)?\s+(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\S+)(?:\s+([\s\S]+))?$/i
  );
  if (!m) return send(chatId, "Uso: `/ass cognome 2025-11-19 fisica [topics]`");
  const [, q, when, subject, topics] = m;

  const r = await resolveStudentId(db, q);
  if ((r as any).err) return send(chatId, (r as any).err);
  const { id, name } = r as any;

  const { error: e1 } = await db.from("black_assessments").insert({
    student_id: id,
    subject,
    topics: topics || null,
    when_at: when,
  });
  if (e1) return send(chatId, `❌ Errore verifica: ${e1.message}`);

  // aggiorna cache prossima verifica rigenerando brief
  await db.rpc("refresh_black_brief", { _student: id });
  await send(
    chatId,
    `✅ Verifica creata per *${name}*: ${subject} — ${when}${topics ? " — " + topics : ""}`
  );
}

/** /oggi → digest rapido: rossi/yellow/green + verifiche entro 7 giorni */
async function cmdOGGI({ db, chatId }: CmdCtx) {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: cards } = await db.from("black_student_card").select("*");

  if (!cards?.length) return send(chatId, "Nessuno studente.");

  const reds = cards.filter((c: any) => c.risk_level === "red");
  const yell = cards.filter((c: any) => c.risk_level === "yellow");
  const greens = cards.filter((c: any) => c.risk_level === "green");
  const upcoming = cards.filter(
    (c: any) => c.next_assessment_date && c.next_assessment_date <= in7
  );

  const line = (c: any) =>
    `• ${c.student_name} ${c.readiness ?? "—"}/100` +
    (c.next_assessment_date
      ? ` (${c.next_assessment_subject ?? "verifica"} ${c.next_assessment_date})`
      : "");

  const txt = [
    "*📊 Digest oggi*",
    reds.length
      ? `\n🔴 *Rossi* (${reds.length})\n${reds.map(line).join("\n")}`
      : "",
    yell.length
      ? `\n🟡 *Gialli* (${yell.length})\n${yell.map(line).join("\n")}`
      : "",
    greens.length
      ? `\n✅ *Verdi* (${greens.length})\n${greens.map(line).join("\n")}`
      : "",
    upcoming.length
      ? `\n🗓️ *Verifiche ≤7g* (${upcoming.length})\n${upcoming.map(line).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  await send(chatId, txt || "Nessun dato.");
}

export async function POST(req: Request) {
  const update = await req.json().catch(() => null);
  // base sanity
  const msg = update?.message || update?.edited_message;
  const chatId = msg?.chat?.id;
  const text: string | undefined = msg?.text;

  if (!chatId || !text) return NextResponse.json({ ok: true });

  // whitelisting chat
  if (ALLOWED.size && !ALLOWED.has(String(chatId))) {
    await send(chatId, "Non autorizzato.");
    return NextResponse.json({ ok: true });
  }

  const db = supabaseServer();
  const ctx = { db, chatId, text: text.trim() };

  try {
    if (/^\/start/i.test(text)) {
      await send(
        chatId,
        [
          "*Theoremz Black bot*",
          "Comandi:",
          "`/oggi` — digest rapido",
          "`/s cognome` — scheda",
          "`/n cognome testo...` — aggiungi nota",
          "`/v cognome materia 7.5/10 [YYYY-MM-DD]` — aggiungi voto",
          "`/ass cognome YYYY-MM-DD materia [topics]` — nuova verifica",
        ].join("\n")
      );
    } else if (/^\/oggi/i.test(text)) {
      await cmdOGGI(ctx);
    } else if (/^\/s(\s|@)/i.test(text)) {
      await cmdS(ctx);
    } else if (/^\/n(\s|@)/i.test(text)) {
      await cmdN(ctx);
    } else if (/^\/v(\s|@)/i.test(text)) {
      await cmdV(ctx);
    } else if (/^\/ass(\s|@)/i.test(text)) {
      await cmdASS(ctx);
    } else {
      await send(chatId, "Comando non riconosciuto. Scrivi `/start`.");
    }
  } catch (e: any) {
    await send(chatId, `❌ Errore: ${e.message}`);
  }
  return NextResponse.json({ ok: true });
}
