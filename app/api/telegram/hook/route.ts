import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const ALLOWED = new Set(
  (process.env.ALLOWED_CHAT_IDS || "")
    .split(",")
    .map((s) => s.split("#")[0]?.trim())
    .filter(Boolean)
);

async function send(chat_id: number | string, text: string, replyMarkup?: any) {
  await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
  });
}

type CmdCtx = {
  db: ReturnType<typeof supabaseServer>;
  chatId: number;
  text: string;
};

async function resolveStudentId(db: any, input: string) {
  const query = input.trim();
  if (!query) return { err: "❌ Specifica un nome o una email." };
  if (query.includes("@")) {
    return lookupStudentByEmail(db, query.toLowerCase());
  }
  return lookupStudentByName(db, query);
}

async function lookupStudentByName(db: any, query: string) {
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

async function lookupStudentByEmail(db: any, email: string) {
  const normalized = email.trim().toLowerCase();
  const selectFields =
    "id, user_id, student_email, parent_email, year_class, profiles:profiles!black_students_user_id_fkey(full_name)";

  const { data: directMatches, error: directError } = await db
    .from("black_students")
    .select(selectFields)
    .or(
      `student_email.ilike.${escapeOrValue(normalized)},parent_email.ilike.${escapeOrValue(
        normalized,
      )}`,
    )
    .limit(6);
  if (directError) throw new Error(directError.message);

  let matches = directMatches ?? [];

  if (!matches.length) {
    const { data: profiles, error: profileError } = await db
      .from("profiles")
      .select("id")
      .ilike("email", normalized)
      .limit(6);
    if (profileError) throw new Error(profileError.message);
    const userIds = (profiles ?? []).map((p: any) => p.id);
    if (userIds.length) {
      const { data: viaUid, error: viaUidError } = await db
        .from("black_student_card")
        .select(selectFields)
        .in("user_id", userIds)
        .limit(6);
      if (viaUidError) throw new Error(viaUidError.message);
      matches = viaUid ?? [];
    }
  }

  if (!matches.length)
    return { err: `❌ Nessuno studente trovato per: *${email}*` };
  if (matches.length > 1) {
    return {
      err: formatMatchList(matches, `⚠️ Più risultati per ${email}:\n`),
    };
  }

  const row = matches[0];
  return {
    id: row.id,
    name:
      row.profiles?.full_name ||
      row.student_email ||
      row.parent_email ||
      email,
  };
}

function escapeOrValue(value: string) {
  return value.replace(/,/g, "\\,").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function formatMatchList(matches: any[], prefix = "") {
  const list = matches
    .slice(0, 6)
    .map((match) => {
      const meta =
        [match.school_cycle, match.class_section, match.year_class]
          .filter(Boolean)
          .join(" ") || null;
      const name =
        (match.student_name as string) ||
        match?.profiles?.full_name ||
        match.student_email ||
        match.parent_email ||
        "Senza nome";
      return `• ${name}${meta ? ` (${meta})` : ""}`;
    })
    .join("\n");
  return `${prefix}${list}\n\nRaffina la ricerca.`;
}

const PLAN_LABELS: Record<string, string> = {
  price_1SQIy3HuThKalaHI4pli489T: "Black Standard",
  price_1SGtQvHuThKalaHIr1d9ua0D: "Black Standard",
  price_1Ptv7qHuThKalaHIO45IqjKL: "Black Essential",
  price_1SII2UHuThKalaHI1g3CgFSb: "Black Annuale",
};

function planLabelFromPriceId(priceId?: string | null, fallback?: string | null) {
  if (!priceId) return fallback || "Black";
  return PLAN_LABELS[priceId] || fallback || "Black";
}

function formatDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

/** /s <nome> → invia scheda (brief) */
async function cmdS({ db, chatId, text }: CmdCtx) {
  const q = text.replace(/^\/s(@\w+)?\s*/i, "").trim();
  if (!q) return send(chatId, "Uso: `/s cognome` oppure `/s email@example.com`");
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

/** /desc <nome/email> <testo...> → aggiorna overview manuale */
async function cmdDESC({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/desc(?:@\w+)?\s+(\S+)(?:\s+([\s\S]+))?$/i);
  if (!m) return send(chatId, "Uso: `/desc cognome testo_overview`");
  const [, q, body] = m;
  if (!body)
    return send(
      chatId,
      "Serve anche il testo, es: `/desc rossi seconda scientifico con difficoltà in trigonometria`",
    );

  const r = await resolveStudentId(db, q);
  if ((r as any).err) return send(chatId, (r as any).err);
  const { id, name } = r as any;

  const { error } = await db
    .from("black_students")
    .update({ ai_description: body, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return send(chatId, `❌ Errore overview: ${error.message}`);

  await db.rpc("refresh_black_brief", { _student: id });
  await send(chatId, `✅ Overview aggiornata per *${name}*.`);
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

async function cmdNUOVI({ db, chatId }: CmdCtx) {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, error } = await db
    .from("black_students")
    .select(
      "id, user_id, year_class, start_date, parent_email, parent_phone, parent_name, student_email, student_phone, status, profiles:profiles!black_students_user_id_fkey(full_name, stripe_price_id)",
    )
    .eq("status", "active")
    .gte("start_date", since)
    .order("start_date", { ascending: false })
    .limit(50);
  if (error) return send(chatId, `❌ Errore elenco: ${error.message}`);
  if (!data?.length) return send(chatId, "Nessun nuovo abbonato negli ultimi 30 giorni.");

  for (const row of data) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const name = profile?.full_name || row.parent_name || "Studente";
    const plan = planLabelFromPriceId(profile?.stripe_price_id);
    const when = formatDate(row.start_date);
    const email = row.student_email || row.parent_email || null;
    const phone = row.student_phone || row.parent_phone || "—";
    const lines = [
      `*${name}*`,
      `Classe: ${row.year_class || "—"}`,
      `Piano: ${plan}`,
      `Iscritto il: ${when}`,
      `Email: ${email || "—"}`,
      `Telefono: ${phone}`,
    ].join("\n");
    const replyMarkup =
      email && email !== "—"
        ? {
            inline_keyboard: [
              [
                {
                  text: "Apri scheda",
                  switch_inline_query_current_chat: `/s ${email}`,
                },
              ],
            ],
          }
        : undefined;
    await send(chatId, lines, replyMarkup);
  }
}

async function cmdCHECKED({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/checked(?:@\w+)?\s+(\S+)/i);
  if (!m) return send(chatId, "Uso: `/checked cognome` oppure `/checked email@example.com`");
  const [, q] = m;
  const r = await resolveStudentId(db, q);
  if ((r as any).err) return send(chatId, (r as any).err);
  const { id, name } = r as any;

  const { data, error } = await db
    .from("black_students")
    .select("readiness")
    .eq("id", id)
    .maybeSingle();
  if (error) return send(chatId, `❌ Errore update: ${error.message}`);
  const current = Number(data?.readiness ?? 0);
  const updated = Math.min(100, current + 5);
  const { error: updErr } = await db
    .from("black_students")
    .update({ readiness: updated, last_active_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) return send(chatId, `❌ Errore update: ${updErr.message}`);

  try {
    await db.rpc("refresh_black_brief", { _student: id });
  } catch {
    // best effort
  }
  await send(chatId, `✅ Contatto registrato per *${name}*. Readiness: ${updated}/100`);
}

async function cmdDaContattare({ db, chatId }: CmdCtx) {
  const { data, error } = await db
    .from("black_students")
    .select(
      "id, user_id, readiness, parent_email, parent_phone, student_email, student_phone, year_class, profiles:profiles!black_students_user_id_fkey(full_name)",
    )
    .eq("status", "active")
    .lt("readiness", 90)
    .order("readiness", { ascending: true })
    .limit(20);
  if (error) return send(chatId, `❌ Errore elenco: ${error.message}`);
  if (!data?.length) return send(chatId, "Tutti aggiornati ✅");
  for (const row of data) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const name = profile?.full_name || row.student_email || row.parent_email || "Studente";
    const readiness = row.readiness ?? 0;
    const email = row.student_email || row.parent_email || "—";
    const phone = row.student_phone || row.parent_phone || "—";
    const meta = row.year_class ? `Classe: ${row.year_class}\n` : "";
    const text = `*${name}*\n${meta}Readiness: ${readiness}/100\nEmail: ${email}\nTelefono: ${phone}`;
    const markup =
      email && email !== "—"
        ? {
            inline_keyboard: [
              [
                {
                  text: "Apri scheda",
                  switch_inline_query_current_chat: `/s ${email}`,
                },
                {
                  text: "Segna come contattato",
                  switch_inline_query_current_chat: `/checked ${email}`,
                },
              ],
            ],
          }
        : undefined;
    await send(chatId, text, markup);
  }
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
          "`/s email@example.com` — scheda via email",
          "`/n cognome testo...` — aggiungi nota",
          "`/v cognome materia 7.5/10 [YYYY-MM-DD]` — aggiungi voto",
          "`/ass cognome YYYY-MM-DD materia [topics]` — nuova verifica",
          "`/nuovi` — iscritti ultimi 30 giorni",
          "`/desc cognome testo...` — aggiorna overview studente",
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
    } else if (/^\/desc(\s|@)/i.test(text)) {
      await cmdDESC(ctx);
    } else if (/^\/nuovi/i.test(text)) {
      await cmdNUOVI(ctx);
    } else {
      await send(chatId, "Comando non riconosciuto. Scrivi `/start`.");
    }
  } catch (e: any) {
    await send(chatId, `❌ Errore: ${e.message}`);
  }
  return NextResponse.json({ ok: true });
}
