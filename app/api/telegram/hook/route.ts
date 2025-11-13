import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import {
  syncActiveStripeSubscriptions,
  syncPendingStripeSignups,
  type StripeSignupSyncResult,
} from "@/lib/black/manualStripeSync";

const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
type AllowedEntry = { id: string; label: string | null };

const allowedEntries: AllowedEntry[] = (process.env.ALLOWED_CHAT_IDS || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [idRaw, labelRaw] = entry.split("#");
    const id = idRaw?.trim();
    const label = labelRaw?.trim();
    return id ? { id, label: label || null } : null;
  })
  .filter((entry): entry is AllowedEntry => Boolean(entry));

const ALLOWED = new Set(allowedEntries.map((entry) => entry.id));
const CHAT_LABELS = new Map(
  allowedEntries
    .filter((entry) => Boolean(entry.label))
    .map((entry) => [entry.id, entry.label as string])
);
const CONTACT_LOG_TABLE = "black_contact_logs";

async function send(
  chat_id: number | string,
  text: string,
  replyMarkup?: any,
  useMarkdown = true
) {
  const parseMode = useMarkdown ? "Markdown" : "HTML";
  const res = await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
  });
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // ignore non-JSON responses
  }
  if (!res.ok || (payload && payload.ok === false)) {
    console.error("[telegram-bot] send failed", {
      chat_id,
      status: res.status,
      body: payload,
    });
    throw new Error(
      payload?.description || `Telegram send failed (${res.status})`
    );
  }
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
        normalized
      )}`
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
        .from("black_students")
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
      row.profiles?.full_name || row.student_email || row.parent_email || email,
  };
}

function escapeOrValue(value: string) {
  return value.replace(/,/g, "\\,").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Escape text for Telegram HTML parse mode.
 * This is safer than Markdown for user input with special characters.
 */
function escapeMarkdown(value: string) {
  return value.replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1");
}

function bold(text: string) {
  return `*${escapeMarkdown(text)}*`;
}

function italic(text: string) {
  return `_${escapeMarkdown(text)}_`;
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

function planLabelFromPriceId(
  priceId?: string | null,
  fallback?: string | null
) {
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatCurrency(amountCents?: number | null, currency?: string | null) {
  if (!amountCents || !currency) return null;
  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** /s <nome> → invia scheda (brief) */
async function cmdS({ db, chatId, text }: CmdCtx) {
  const q = text.replace(/^\/s(@\w+)?\s*/i, "").trim();
  if (!q) return send(chatId, "Uso: /s cognome oppure /s email@example.com");
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
  const { data: studentMeta } = await db
    .from("black_students")
    .select(
      "last_contacted_at, last_active_at, readiness, year_class, track, next_assessment_subject, next_assessment_date, goal, difficulty_focus"
    )
    .eq("id", id)
    .maybeSingle();

  const lastContact = studentMeta?.last_contacted_at
    ? formatDateTime(studentMeta.last_contacted_at)
    : "—";
  const lastAccess = studentMeta?.last_active_at
    ? formatDateTime(studentMeta.last_active_at)
    : "—";
  const readiness = `${studentMeta?.readiness ?? "—"}/100`;
  const nextAssessment = studentMeta?.next_assessment_date
    ? `${studentMeta.next_assessment_subject || "verifica"} · ${formatDate(
        studentMeta.next_assessment_date
      )}`
    : "—";
  const infoCard = [
    "╭────────────────────────",
    `│ ${bold(name)}`,
    studentMeta?.year_class
      ? `│ ${italic("Classe")}: ${escapeMarkdown(studentMeta.year_class)}${
          studentMeta?.track
            ? ` · ${italic("Track")}: ${escapeMarkdown(studentMeta.track)}`
            : ""
        }`
      : studentMeta?.track
        ? `│ ${italic("Track")}: ${escapeMarkdown(studentMeta.track)}`
        : null,
    `│ ${italic("Ultimo contatto")}: ${escapeMarkdown(lastContact)}`,
    `│ ${italic("Ultimo accesso")}: ${escapeMarkdown(lastAccess)}`,
    `│ ${italic("Readiness")}: ${escapeMarkdown(readiness)}`,
    `│ ${italic("Prossima verifica")}: ${escapeMarkdown(nextAssessment)}`,
    studentMeta?.goal
      ? `│ ${italic("Goal")}: ${escapeMarkdown(studentMeta.goal)}`
      : null,
    studentMeta?.difficulty_focus
      ? `│ ${italic("Focus")}: ${escapeMarkdown(studentMeta.difficulty_focus)}`
      : null,
    "╰────────────────────────",
  ]
    .filter(Boolean)
    .join("\n");

  const body = brief?.brief_md || italic("Nessun brief.");

  await send(chatId, `${infoCard}\n\n${body}`);
}

/** /n <nome> <testo...> → aggiungi nota + refresh */
async function cmdN({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/n(?:@\w+)?\s+(\S+)(?:\s+([\s\S]+))?$/i);
  if (!m) return send(chatId, "Uso: `/n cognome testo_della_nota`");
  const [, q, body] = m;
  if (!body)
    return send(
      chatId,
      "Scrivi anche la nota, es: /n rossi ripasso lenti entro ven"
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
  await send(chatId, `✅ Nota aggiunta a ${bold(name)} e scheda aggiornata.`);
}

/** /desc <nome/email> <testo...> → aggiorna overview manuale */
async function cmdDESC({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/desc(?:@\w+)?\s+(\S+)(?:\s+([\s\S]+))?$/i);
  if (!m) return send(chatId, "Uso: `/desc cognome testo_overview`");
  const [, q, body] = m;
  if (!body)
    return send(
      chatId,
      "Serve anche il testo, es: /desc rossi seconda scientifico con difficoltà in trigonometria"
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
  await send(chatId, `✅ Overview aggiornata per ${bold(name)}.`);
}

/** /nome <email> <Nome Cognome> → aggiorna il full_name */
async function cmdNOME({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/nome(?:@\w+)?\s+(\S+)(?:\s+([\s\S]+))?$/i);
  if (!m)
    return send(
      chatId,
      "Uso: `/nome email@example.com Nuovo Nome Cognome` (serve sempre l'email)"
    );
  const [, email, rawName] = m;
  if (!email.includes("@")) {
    return send(
      chatId,
      "Per aggiornare il nome serve l'email dello studente/genitore, es: `/nome nome@example.com Nuovo Nome`"
    );
  }
  const nextName = rawName?.trim();
  if (!nextName) {
    return send(chatId, "Scrivi anche il nuovo nome completo dopo l'email.");
  }

  const lookup = await lookupStudentByEmail(db, email.toLowerCase());
  if ((lookup as any).err) return send(chatId, (lookup as any).err);
  const { id, name } = lookup as any;

  const { data: studentRow, error: studentFetchErr } = await db
    .from("black_students")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (studentFetchErr)
    return send(
      chatId,
      `❌ Errore lettura studente: ${studentFetchErr.message}`
    );

  if (!studentRow?.user_id)
    return send(
      chatId,
      "❌ Studente senza user_id: aggiorna prima il profilo."
    );

  const stamp = new Date().toISOString();
  const { error: profileErr } = await db
    .from("profiles")
    .update({ full_name: nextName, updated_at: stamp })
    .eq("id", studentRow.user_id);
  if (profileErr)
    return send(chatId, `❌ Errore update profilo: ${profileErr.message}`);

  try {
    await db.rpc("refresh_black_brief", { _student: id });
  } catch {
    // best effort
  }

  const lines = [
    `✅ Nome aggiornato per ${bold(name)}`,
    `Nuovo nome: ${bold(nextName)}`,
  ]
    .filter(Boolean)
    .join("\n");
  await send(chatId, lines);
}

/** /v <nome> <materia> <voto>/<max> [data=YYYY-MM-DD] */
async function cmdV({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/v(?:@\w+)?\s+(\S+)\s+(\S+)\s+(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?:\s+(\d{4}-\d{2}-\d{2}))?$/i
  );
  if (!m)
    return send(
      chatId,
      "Uso: /v cognome materia 7.5/10 2025-11-12 (data opzionale)"
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
    `✅ Voto registrato per ${bold(name)}: ${score}/${max}${when ? " (" + when + ")" : ""}`
  );
}

/** /ass <nome> <data YYYY-MM-DD> <materia> [topics...] */
async function cmdASS({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/ass(?:@\w+)?\s+(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\S+)(?:\s+([\s\S]+))?$/i
  );
  if (!m) return send(chatId, "Uso: /ass cognome 2025-11-19 fisica [topics]");
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
    `✅ Verifica creata per ${bold(name)}: ${subject} — ${when}${topics ? " — " + topics : ""}`
  );
}

/** /verifica <email> <data YYYY-MM-DD> <materia> [topics...] */
async function cmdVERIFICA({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/verifica(?:@\w+)?\s+(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\S+)(?:\s+([\s\S]+))?$/i
  );
  if (!m)
    return send(
      chatId,
      "Uso: /verifica email@example.com 2025-11-19 materia [topics] (serve l'email)"
    );
  const [, email, when, subject, topics] = m;
  if (!email.includes("@")) {
    return send(
      chatId,
      "Per importare una verifica serve l'email dello studente, es: `/verifica nome@example.com 2025-11-19 fisica [topics]`"
    );
  }

  const resolved = await lookupStudentByEmail(db, email.toLowerCase());
  if ((resolved as any).err) return send(chatId, (resolved as any).err);
  const { id, name } = resolved as any;

  const { error } = await db.from("black_assessments").insert({
    student_id: id,
    subject,
    topics: topics || null,
    when_at: when,
  });
  if (error) return send(chatId, `❌ Errore verifica: ${error.message}`);

  try {
    await db.rpc("refresh_black_brief", { _student: id });
  } catch {
    // best effort
  }

  await send(
    chatId,
    `✅ Verifica importata per ${bold(name)}: ${subject} — ${when}${topics ? " — " + topics : ""}`
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
  const upcoming = cards.filter(
    (c: any) => c.next_assessment_date && c.next_assessment_date <= in7
  );
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const staleContacts = cards.filter((c: any) => {
    if (!c.last_contacted_at) return true;
    return c.last_contacted_at < sevenDaysAgo;
  });

  const line = (c: any) =>
    `• ${c.student_name} ${c.readiness ?? "—"}/100` +
    (c.next_assessment_date
      ? ` (${c.next_assessment_subject ?? "verifica"} ${c.next_assessment_date})`
      : "");
  const staleLine = (c: any) =>
    `• ${c.student_name} — ultimo contatto: ${
      c.last_contacted_at ? formatDateTime(c.last_contacted_at) : "mai"
    }`;

  const txt = [
    "*📊 Digest oggi*",
    reds.length
      ? `\n🔴 *Rossi* (${reds.length})\n${reds.map(line).join("\n")}`
      : "",
    yell.length
      ? `\n🟡 *Gialli* (${yell.length})\n${yell.map(line).join("\n")}`
      : "",
    upcoming.length
      ? `\n🗓️ *Verifiche ≤7g* (${upcoming.length})\n${upcoming.map(line).join("\n")}`
      : "",
    staleContacts.length
      ? `\n📭 *Da ricontattare (≥7g)* (${staleContacts.length})\n${staleContacts
          .slice(0, 10)
          .map(staleLine)
          .join("\n")}${
          staleContacts.length > 10
            ? `\n…altri ${staleContacts.length - 10} senza contatto recente`
            : ""
        }`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  await send(chatId, txt || "Nessun dato.");
}

async function cmdNUOVI({ db, chatId }: CmdCtx) {
  const sinceDate = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const sinceDay = sinceDate.toISOString().slice(0, 10);
  const sinceTimestamp = sinceDate.toISOString();

  const [studentsRes, signupsRes] = await Promise.all([
    db
      .from("black_students")
      .select(
        "id, user_id, year_class, start_date, parent_email, parent_phone, parent_name, student_email, student_phone, status, profiles:profiles!black_students_user_id_fkey(full_name, stripe_price_id)"
      )
      .eq("status", "active")
      .gte("start_date", sinceDay)
      .order("start_date", { ascending: false })
      .limit(50),
    db
      .from("black_stripe_signups")
      .select(
        "session_id, subscription_id, plan_name, plan_label, amount_display, amount_currency, amount_total, customer_email, customer_phone, customer_name, status, created_at, event_created_at, whatsapp_link, student_id"
      )
      .gte("created_at", sinceTimestamp)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const { data: students, error: studentError } = studentsRes;
  if (studentError)
    return send(chatId, `❌ Errore elenco: ${studentError.message}`);
  const { data: signups, error: signupError } = signupsRes;
  if (signupError)
    return send(chatId, `❌ Errore Stripe: ${signupError.message}`);

  const pendingSignups =
    signups?.filter((row: any) => !row.student_id || row.status !== "synced") ??
    [];

  if (pendingSignups.length) {
    await send(
      chatId,
      `*🆕 Attivazioni Stripe da collegare (${pendingSignups.length})*`
    );
    for (const row of pendingSignups) {
      const plan = row.plan_label || row.plan_name || "Theoremz Black";
      const email = row.customer_email || "—";
      const phone = row.customer_phone || "—";
      const createdAt = formatDateTime(row.event_created_at || row.created_at);
      const amountDisplay =
        row.amount_display ||
        formatCurrency(
          typeof row.amount_total === "number" ? row.amount_total : null,
          row.amount_currency
        ) ||
        "—";
      const emoji = row.status === "synced" && row.student_id ? "✅" : "🆕";
      const lines = [
        `${emoji} *${plan}*`,
        `Creato: ${createdAt}`,
        row.customer_name ? `Cliente: ${row.customer_name}` : null,
        `Email: ${email}`,
        `Telefono: ${phone}`,
        amountDisplay ? `Importo: ${amountDisplay}` : null,
        row.whatsapp_link ? `WhatsApp: ${row.whatsapp_link}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      await send(chatId, lines);
    }
  } else {
    await send(
      chatId,
      "Nessuna nuova attivazione Stripe negli ultimi 30 giorni."
    );
  }

  if (!students?.length) {
    if (!pendingSignups.length) {
      await send(chatId, "Nessun nuovo abbonato negli ultimi 30 giorni.");
    }
    return;
  }

  for (const row of students) {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const name = profile?.full_name || row.parent_name || "Studente";
    const plan = planLabelFromPriceId(profile?.stripe_price_id);
    const when = formatDate(row.start_date);
    const email = row.student_email || row.parent_email || null;
    const phone = row.student_phone || row.parent_phone || "—";
    const lines = [
      bold(name),
      `${italic("Classe")}: ${escapeMarkdown(row.year_class || "—")}`,
      `${italic("Piano")}: ${escapeMarkdown(plan)}`,
      `${italic("Iscritto il")}: ${escapeMarkdown(when)}`,
      `${italic("Email")}: ${escapeMarkdown(email || "—")}`,
      `${italic("Telefono")}: ${escapeMarkdown(phone)}`,
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

async function cmdSYNCSTRIPE({ db, chatId, text }: CmdCtx) {
  const match = text.match(/^\/sync(?:stripe)?(?:@\w+)?(?:\s+(\d+))?/i);
  const limit = match?.[1] ? Number(match[1]) : undefined;
  await send(chatId, "⏳ Sync Stripe in corso...");
  try {
    const pendingResult = await syncPendingStripeSignups({ limit, db });
    const activeResult = await syncActiveStripeSubscriptions({ limit });
    const summary = formatSyncSummary(pendingResult.stats, activeResult.stats);
    const combinedDetails = [...pendingResult.details, ...activeResult.details];
    const detailLines = combinedDetails
      .slice(0, 10)
      .map(formatSyncDetail)
      .join("\n");
    const detailNote =
      combinedDetails.length > 10
        ? `…altri ${combinedDetails.length - 10}`
        : null;
    const message = [summary, detailLines || null, detailNote]
      .filter(Boolean)
      .join("\n\n");
    await send(chatId, message || summary);
  } catch (error: any) {
    await send(chatId, `❌ Sync Stripe fallita: ${error?.message || error}`);
  }
}

function formatSyncSummary(
  pending: StripeSignupSyncResult["stats"],
  active: StripeSignupSyncResult["stats"]
) {
  return [
    "*Sync Stripe completata*",
    `Inbox (pending) → Processati: ${pending.processed} · Synced: ${pending.synced} · Skipped: ${pending.skipped}` +
      (pending.errors ? ` · Errori: ${pending.errors}` : ""),
    `Abbonati attivi → Processati: ${active.processed} · Synced: ${active.synced} · Skipped: ${active.skipped}` +
      (active.errors ? ` · Errori: ${active.errors}` : ""),
  ]
    .filter(Boolean)
    .join("\n");
}

function formatSyncDetail(detail: StripeSignupSyncResult["details"][number]) {
  const label = detail.name || detail.email || detail.id;
  const plan = detail.plan ? ` (${detail.plan})` : "";
  const reason = detail.reason ? ` — ${detail.reason}` : "";
  const scope = detail.source === "active" ? "[attivo]" : "[pending]";
  switch (detail.status) {
    case "synced":
      return `✅ ${scope} ${label}${plan}`;
    case "skipped":
      return `⚠️ ${scope} ${label}${plan}${reason}`;
    case "error":
    default:
      return `❌ ${scope} ${label}${plan}${reason}`;
  }
}

async function cmdCHECKED({ db, chatId, text }: CmdCtx) {
  try {
    const m = text.match(/^\/checked(?:@\w+)?\s+(\S+)(?:\s+([\s\S]+))?/i);
    if (!m)
      return send(
        chatId,
        "Uso: /checked email@example.com [nota]\noppure /checked cognome [nota]"
      );
    const [, rawQuery, rawNote] = m;
    const query = rawQuery.trim();
    const note = rawNote?.trim();
    console.info("[telegram-bot] cmdCHECKED start", { chatId, query });

    let resolved;
    if (query.includes("@")) {
      resolved = await lookupStudentByEmail(db, query.toLowerCase());
    } else {
      resolved = await resolveStudentId(db, query);
    }
    if ((resolved as any).err) return send(chatId, (resolved as any).err);
    const { id, name } = resolved as any;

    const { data, error } = await db
      .from("black_students")
      .select("readiness")
      .eq("id", id)
      .maybeSingle();
    if (error) return send(chatId, `❌ Errore update: ${error.message}`);
    const current = Number(data?.readiness ?? 0);
    const updated = Math.min(100, current + 5);
    const contactAt = new Date().toISOString();
    const { error: updErr } = await db
      .from("black_students")
      .update({
        readiness: updated,
        last_contacted_at: contactAt,
      })
      .eq("id", id);
    if (updErr) return send(chatId, `❌ Errore update: ${updErr.message}`);
    console.info("[telegram-bot] cmdCHECKED readiness updated", {
      studentId: id,
      readiness: updated,
    });

    const authorLabel = CHAT_LABELS.get(String(chatId)) || null;
    let logWarning: string | null = null;
    try {
      const { error: logErr } = await db.from(CONTACT_LOG_TABLE).insert({
        student_id: id,
        contacted_at: contactAt,
        body: note || null,
        source: "telegram_bot",
        author_chat_id: String(chatId),
        author_label: authorLabel,
        readiness_snapshot: updated,
      });
      if (logErr) {
        throw new Error(logErr.message);
      }
      console.info("[telegram-bot] contact log inserted", { studentId: id });
    } catch (err: any) {
      console.error("[telegram-bot] log contatto fallito", {
        studentId: id,
        chatId,
        error: err,
      });
      logWarning = err?.message || "errore sconosciuto";
    }

    const safeName = bold(name);
    const safeNote = note ? escapeMarkdown(note) : null;
    const lines = [
      `✅ Contatto registrato per ${safeName}`,
      `Ultimo contatto: ${escapeMarkdown(formatDateTime(contactAt))}`,
      safeNote ? `📝 Nota: ${safeNote}` : null,
      `Readiness: ${updated}/100`,
      logWarning ? `⚠️ Log non salvato: ${escapeMarkdown(logWarning)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await send(chatId, lines);

    try {
      await db.rpc("refresh_black_brief", { _student: id });
    } catch (briefError) {
      console.warn("[telegram-bot] refresh_black_brief failed", briefError);
    }
    console.info("[telegram-bot] cmdCHECKED completed", { studentId: id });
  } catch (error: any) {
    console.error("[telegram-bot] cmdCHECKED failed", error);
    await send(
      chatId,
      `❌ Errore inatteso durante il check: ${error?.message || "sconosciuto"}`
    );
  }
}

async function cmdDaContattare({ db, chatId }: CmdCtx) {
  const { data, error } = await db
    .from("black_students")
    .select(
      "id, user_id, readiness, parent_email, parent_phone, student_email, student_phone, year_class, last_contacted_at, profiles:profiles!black_students_user_id_fkey(full_name)"
    )
    .eq("status", "active")
    .lt("readiness", 90)
    .order("readiness", { ascending: true })
    .limit(20);
  if (error) return send(chatId, `❌ Errore elenco: ${error.message}`);
  if (!data?.length) return send(chatId, "Tutti aggiornati ✅");
  for (const row of data) {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const name =
      profile?.full_name || row.student_email || row.parent_email || "Studente";
    const readiness = row.readiness ?? 0;
    const email = row.student_email || row.parent_email || "—";
    const phone = row.student_phone || row.parent_phone || "—";
    const lastContact = row.last_contacted_at
      ? formatDateTime(row.last_contacted_at)
      : "—";
    const meta = row.year_class
      ? `${italic("Classe")}: ${escapeMarkdown(row.year_class)}\n`
      : "";
    const text = [
      bold(name),
      meta,
      `${italic("Readiness")}: ${readiness}/100`,
      `${italic("Ultimo contatto")}: ${escapeMarkdown(lastContact)}`,
      `${italic("Email")}: ${escapeMarkdown(email)}`,
      `${italic("Telefono")}: ${escapeMarkdown(phone)}`,
    ]
      .filter(Boolean)
      .join("\n");
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
          "`/verifica email@example.com YYYY-MM-DD materia [topics]` — importa verifica via email",
          "`/nuovi` — iscritti ultimi 30 giorni",
          "`/sync [limite]` — forza il sync delle attivazioni Stripe",
          "`/desc cognome testo...` — aggiorna overview studente",
          "`/nome email@example.com Nuovo Nome` — aggiorna il nome in anagrafica",
          "`/checked cognome|email [nota]` — segna ultimo contatto + log",
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
    } else if (/^\/verifica(\s|@)/i.test(text)) {
      await cmdVERIFICA(ctx);
    } else if (/^\/desc(\s|@)/i.test(text)) {
      await cmdDESC(ctx);
    } else if (/^\/nome(\s|@)/i.test(text)) {
      await cmdNOME(ctx);
    } else if (/^\/nuovi/i.test(text)) {
      await cmdNUOVI(ctx);
    } else if (
      /^\/checked(\s|@)/i.test(text) ||
      /^\/cheched(\s|@)/i.test(text)
    ) {
      await cmdCHECKED(ctx);
    } else if (/^\/sync(?:stripe)?/i.test(text)) {
      await cmdSYNCSTRIPE(ctx);
    } else {
      await send(chatId, "Comando non riconosciuto. Scrivi `/start`.");
    }
  } catch (e: any) {
    await send(chatId, `❌ Errore: ${e.message}`);
  }
  return NextResponse.json({ ok: true });
}
