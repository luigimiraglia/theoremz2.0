import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  buildAssessmentResultLine,
  mergeAssessmentTopics,
} from "@/lib/black/gradeSync";
import {
  syncActiveStripeSubscriptions,
  syncPendingStripeSignups,
  type StripeSignupSyncResult,
} from "@/lib/black/manualStripeSync";
import {
  recordStudentAssessmentLite,
  recordStudentGradeLite,
} from "@/lib/studentLiteSync";

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
  parseMode: "Markdown" | "HTML" | null | boolean = "Markdown"
) {
  let resolvedMode: "Markdown" | "HTML" | null;
  if (typeof parseMode === "boolean") {
    resolvedMode = parseMode ? "Markdown" : "HTML";
  } else if (parseMode === undefined) {
    resolvedMode = "Markdown";
  } else {
    resolvedMode = parseMode;
  }
  const res = await fetch(`${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text,
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
      ...(resolvedMode ? { parse_mode: resolvedMode } : {}),
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

async function cmdDARIATTIVARE({ db, chatId }: CmdCtx) {
  const { data, error } = await db
    .from("black_students")
    .select(
      "id, user_id, year_class, student_email, parent_email, student_phone, parent_phone, last_active_at, profiles:profiles!black_students_user_id_fkey(full_name)"
    )
    .eq("status", "active")
    .is("last_contacted_at", null)
    .not("last_active_at", "is", null)
    .order("last_active_at", { ascending: false })
    .limit(25);
  if (error) return send(chatId, `❌ Errore elenco: ${error.message}`);
  if (!data?.length) return send(chatId, "Nessuno studente da riattivare ✅");

  for (const row of data) {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const name =
      profile?.full_name || row.student_email || row.parent_email || "Studente";
    const email = row.student_email || row.parent_email || "—";
    const phone = row.student_phone || row.parent_phone || "—";
    const lastActive = row.last_active_at
      ? formatDateTime(row.last_active_at)
      : "—";
    const classInfo = row.year_class
      ? `${italic("Classe")}: ${escapeMarkdown(row.year_class)}`
      : null;
    const lines = [
      bold(name),
      classInfo,
      `${italic("Ultimo accesso app")}: ${escapeMarkdown(lastActive)}`,
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
                  text: "Segna contatto",
                  switch_inline_query_current_chat: `/checked ${email}`,
                },
              ],
            ],
          }
        : undefined;
    await send(chatId, lines, markup);
  }
}

async function cmdOREPAGATE({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/orepagate(?:@\w+)?\s+(\S+)\s+(\d+(?:[.,]\d+)?)/i);
  if (!m) return send(chatId, "Uso: /orepagate cognome 3.5");
  const [, query, rawHours] = m;
  const hours = Number(rawHours.replace(",", "."));
  if (!Number.isFinite(hours) || hours <= 0)
    return send(chatId, "Inserisci un numero di ore positivo.");

  const resolved = await resolveStudent(db, query);
  if ((resolved as any).err) return send(chatId, (resolved as any).err);
  const { id, name } = resolved as any;

  const { data, error } = await db
    .from("black_students")
    .select("hours_paid")
    .eq("id", id)
    .maybeSingle();
  if (error) return send(chatId, `❌ Errore lettura: ${error.message}`);
  const current = Number(data?.hours_paid ?? 0);
  const updated = current + hours;
  const { error: updateErr } = await db
    .from("black_students")
    .update({ hours_paid: updated })
    .eq("id", id);
  if (updateErr) return send(chatId, `❌ Errore update: ${updateErr.message}`);
  await send(
    chatId,
    `💳 Ore pagate per ${bold(name)}: +${hours}h (totale: ${updated.toFixed(2)}h)`
  );
}

async function cmdASSEGNA_TUTOR({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/assegnatutor(?:@\w+)?\s+(\S+)\s+([\s\S]+)$/i);
  if (!m) return send(chatId, "Uso: /assegnatutor cognome nomeTutor");
  const [, studentQuery, tutorQuery] = m;

  const resolved = await resolveStudent(db, studentQuery);
  if ((resolved as any).err) return send(chatId, (resolved as any).err);
  const { id, name } = resolved as any;

  const tutor = await resolveTutor(db, tutorQuery.trim());
  if ((tutor as any).err) return send(chatId, (tutor as any).err);
  const { id: tutorId, name: tutorName } = tutor as any;

  const { error: studentUpdate } = await db
    .from("black_students")
    .update({ videolesson_tutor_id: tutorId })
    .eq("id", id);
  if (studentUpdate)
    return send(chatId, `❌ Errore update studente: ${studentUpdate.message}`);

  await db.from("tutor_assignments").upsert(
    {
      tutor_id: tutorId,
      student_id: id,
      role: "videolezione",
    },
    { onConflict: "tutor_id,student_id" }
  );

  await send(
    chatId,
    `👩‍🏫 ${bold(tutorName)} ora segue ${bold(name)} per le videolezioni.`
  );
}

async function cmdLOGLEZIONE({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/loglezione(?:@\w+)?\s+(\S+)\s+(\d+(?:[.,]\d+)?)(?:\s+([\s\S]+))?$/i
  );
  if (!m) return send(chatId, "Uso: /loglezione cognome 1.5 [nota]");
  const [, studentQuery, rawHours, note] = m;
  const hours = Number(rawHours.replace(",", "."));
  if (!Number.isFinite(hours) || hours <= 0)
    return send(chatId, "Inserisci un numero di ore valido.");

  const resolved = await resolveStudent(db, studentQuery);
  if ((resolved as any).err) return send(chatId, (resolved as any).err);
  const { id, name } = resolved as any;

  const { data: studentRow, error: studentErr } = await db
    .from("black_students")
    .select("videolesson_tutor_id, hours_consumed")
    .eq("id", id)
    .maybeSingle();
  if (studentErr)
    return send(chatId, `❌ Errore lettura studente: ${studentErr.message}`);
  const tutorId = studentRow?.videolesson_tutor_id;
  if (!tutorId)
    return send(chatId, "❌ Nessun tutor assegnato. Usa /assegnatutor prima.");

  const happenedAt = new Date().toISOString().slice(0, 10);
  const sessionInsert = await db.from("tutor_sessions").insert({
    tutor_id: tutorId,
    student_id: id,
    duration: hours,
    happened_at: happenedAt,
    note: note?.trim() || null,
  });
  if (sessionInsert.error)
    return send(
      chatId,
      `❌ Errore log sessione: ${sessionInsert.error.message}`
    );

  const currentConsumed = Number(studentRow?.hours_consumed ?? 0);
  await db
    .from("black_students")
    .update({ hours_consumed: currentConsumed + hours })
    .eq("id", id);

  const { data: tutorRow } = await db
    .from("tutors")
    .select("hours_due, full_name")
    .eq("id", tutorId)
    .maybeSingle();
  if (tutorRow) {
    const due = Number(tutorRow.hours_due ?? 0) + hours;
    await db.from("tutors").update({ hours_due: due }).eq("id", tutorId);
  }

  await send(
    chatId,
    `📘 Loggato ${hours}h per ${bold(name)} (tutor: ${bold(
      tutorRow?.full_name || "Tutor"
    )}).`
  );
}

async function cmdPAGATUTOR({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/pagatutor(?:@\w+)?\s+([\s\S]+?)\s+(\d+(?:[.,]\d+)?)$/i
  );
  if (!m) return send(chatId, "Uso: /pagatutor nomeTutor 2");
  const [, tutorQuery, rawHours] = m;
  const hours = Number(rawHours.replace(",", "."));
  if (!Number.isFinite(hours) || hours <= 0)
    return send(chatId, "Inserisci ore positive.");

  const tutor = await resolveTutor(db, tutorQuery.trim());
  if ((tutor as any).err) return send(chatId, (tutor as any).err);
  const { id: tutorId, name } = tutor as any;

  const { data, error } = await db
    .from("tutors")
    .select("hours_due")
    .eq("id", tutorId)
    .maybeSingle();
  if (error) return send(chatId, `❌ Errore lettura tutor: ${error.message}`);
  const current = Number(data?.hours_due ?? 0);
  const updated = Math.max(0, current - hours);
  const { error: updErr } = await db
    .from("tutors")
    .update({ hours_due: updated })
    .eq("id", tutorId);
  if (updErr) return send(chatId, `❌ Errore update tutor: ${updErr.message}`);

  await send(
    chatId,
    `💸 Pagamento registrato per ${bold(
      name
    )}: -${hours}h (restano ${updated.toFixed(2)}h da saldare)`
  );
}

async function cmdDASHORE({ db, chatId }: CmdCtx) {
  const [tutorsRes, studentsRes] = await Promise.all([
    db
      .from("tutors")
      .select("id, full_name, hours_due")
      .gt("hours_due", 0)
      .order("hours_due", { ascending: false }),
    db
      .from("black_students")
      .select(
        "id, student_email, parent_email, hours_paid, profiles:profiles!black_students_user_id_fkey(full_name)"
      )
      .eq("status", "active")
      .gt("hours_paid", 0)
      .order("hours_paid", { ascending: false }),
  ]);

  if (tutorsRes.error)
    return send(chatId, `❌ Errore tutor: ${tutorsRes.error.message}`);
  if (studentsRes.error)
    return send(chatId, `❌ Errore studenti: ${studentsRes.error.message}`);

  const tutors = tutorsRes.data || [];
  const students = studentsRes.data || [];

  const tutorLines =
    tutors.length > 0
      ? tutors.map((t: any, idx: number) => {
          const name = bold(t.full_name || "Tutor");
          const hours = formatHours(Number(t.hours_due ?? 0));
          return `${idx + 1}. ${name} — ${hours}h da pagare`;
        })
      : ["Tutti i tutor risultano saldati ✅"];

  const studentLines =
    students.length > 0
      ? students.map((s: any, idx: number) => {
          const displayName =
            s?.profiles?.full_name || s.student_email || s.parent_email || "Studente";
          const name = bold(displayName);
          const hoursPaid = formatHours(Number(s.hours_paid ?? 0));
          return `${idx + 1}. ${name} — ${hoursPaid}h già pagate`;
        })
      : ["Nessuno studente con ore pagate al momento."];

  await sendDashoreSection(chatId, "💸 Tutor da pagare", tutorLines);
  await sendDashoreSection(chatId, "🎓 Studenti con ore pagate", studentLines);
}

async function cmdADDTUTOR({ db, chatId, text }: CmdCtx) {
  const raw = text.replace(/^\/addtutor(?:@\w+)?/i, "").trim();
  if (!raw) {
    return send(
      chatId,
      "Uso: /addtutor Nome Cognome;Telefono;Email (telefono/email opzionali, separati da ;)"
    );
  }
  const parts = raw.split(";").map((p) => p.trim());
  const fullName = parts[0];
  if (!fullName) {
    return send(
      chatId,
      "Uso: /addtutor Nome Cognome;Telefono;Email — serve almeno il nome."
    );
  }
  const phone = parts[1] || null;
  const email = parts[2]?.toLowerCase() || null;

  if (email) {
    const { data: existing, error: lookupErr } = await db
      .from("tutors")
      .select("id, full_name")
      .eq("email", email)
      .maybeSingle();
    if (lookupErr)
      return send(chatId, `❌ Errore lookup: ${lookupErr.message}`);
    if (existing?.id) {
      return send(
        chatId,
        `⚠️ Esiste già un tutor con email ${email}: ${existing.full_name}`
      );
    }
  }

  const { data, error } = await db
    .from("tutors")
    .insert({
      full_name: fullName,
      phone,
      email,
    })
    .select("id")
    .single();
  if (error) return send(chatId, `❌ Errore creazione tutor: ${error.message}`);

  await send(
    chatId,
    `✅ Tutor creato: ${bold(fullName)}${
      phone ? ` · 📞 ${phone}` : ""
    }${email ? ` · ✉️ ${email}` : ""}`
  );
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
 * Escape text for Telegram Markdown parse mode.
 * Use before wrapping dynamic values with bold()/italic() helpers.
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

function formatHours(value: number) {
  if (!Number.isFinite(value)) return "0";
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

async function sendDashoreSection(
  chatId: number,
  title: string,
  lines: string[]
) {
  const chunks = buildDashoreChunks(title, lines);
  for (const chunk of chunks) {
    await send(chatId, chunk);
  }
}

function buildDashoreChunks(title: string, lines: string[], limit = 3500) {
  const header = title ? bold(title) : "";
  const content = lines.length ? lines : ["—"];
  const chunks: string[] = [];
  let current = header;

  for (const line of content) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > limit && current) {
      chunks.push(current);
      current = header ? `${header}\n${line}` : line;
      continue;
    }
    current = candidate;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
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

async function resolveStudent(
  db: ReturnType<typeof supabaseServer>,
  query: string
) {
  if (query.includes("@")) {
    return lookupStudentByEmail(db, query.toLowerCase());
  }
  return resolveStudentId(db, query);
}

async function resolveTutor(
  db: ReturnType<typeof supabaseServer>,
  query: string
) {
  const normalized = query.trim();
  if (!normalized) return { err: "❌ Specifica un tutor (nome o email)." };
  let res;
  if (normalized.includes("@")) {
    res = await db
      .from("tutors")
      .select("id, full_name, email, phone")
      .eq("email", normalized.toLowerCase())
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    if (!res.data) return { err: `❌ Nessun tutor con email ${normalized}` };
    return {
      id: res.data.id,
      name: res.data.full_name || res.data.email || "Tutor",
      meta: res.data,
    };
  }
  const { data, error } = await db
    .from("tutors")
    .select("id, full_name, email, phone")
    .ilike("full_name", `%${normalized}%`)
    .limit(5);
  if (error) throw new Error(error.message);
  if (!data?.length)
    return { err: `❌ Nessun tutor trovato per "${normalized}"` };
  if (data.length > 1) {
    const sample = data
      .map((t) => `• ${t.full_name || t.email || "Tutor"}`)
      .join("\n");
    return { err: `⚠️ Più risultati:\n${sample}\nSpecifica meglio.` };
  }
  const row = data[0];
  return {
    id: row.id,
    name: row.full_name || row.email || "Tutor",
    meta: row,
  };
}

async function fetchStudentUserId(
  db: ReturnType<typeof supabaseServer>,
  studentId: string
) {
  const { data, error } = await db
    .from("black_students")
    .select("user_id")
    .eq("id", studentId)
    .maybeSingle();
  if (error) {
    console.error("[telegram-bot] user lookup failed", error);
    return null;
  }
  return data?.user_id || null;
}

async function mirrorAssessmentToFirestore({
  db,
  studentId,
  assessmentId,
  date,
  subject,
  topics,
}: {
  db: ReturnType<typeof supabaseServer>;
  studentId: string;
  assessmentId: string;
  date: string;
  subject?: string | null;
  topics?: string | null;
}) {
  const uid = await fetchStudentUserId(db, studentId);
  if (!uid) return;
  try {
    await adminDb
      .collection(`users/${uid}/exams`)
      .doc(assessmentId)
      .set(
        {
          date,
          subject: subject || null,
          notes: topics || null,
          blackAssessmentId: assessmentId,
          createdAt: Date.now(),
          source: "telegram_bot",
        },
        { merge: true }
      );
    await recordStudentAssessmentLite({
      userId: uid,
      seed: assessmentId,
      date,
      subject: subject || null,
      notes: topics || null,
      kind: "verifica",
    });
  } catch (error) {
    console.error("[telegram-bot] firestore exam mirror failed", {
      studentId,
      assessmentId,
      error,
    });
  }
}

async function mirrorGradeToFirestore({
  db,
  studentId,
  gradeId,
  date,
  subject,
  grade,
  maxScore,
  assessmentId,
}: {
  db: ReturnType<typeof supabaseServer>;
  studentId: string;
  gradeId: string;
  date: string;
  subject?: string | null;
  grade: number;
  maxScore: number;
  assessmentId?: string | null;
}) {
  const uid = await fetchStudentUserId(db, studentId);
  if (!uid) return;
  try {
    await adminDb
      .collection(`users/${uid}/grades`)
      .doc(gradeId)
      .set(
        {
          date,
          subject: subject || null,
          grade,
          maxScore,
          source: "telegram_bot",
          syncedAt: Date.now(),
        },
        { merge: true }
      );
    if (assessmentId) {
      await adminDb
        .collection(`users/${uid}/exams`)
        .doc(assessmentId)
        .set(
          {
            grade,
            grade_subject: subject || null,
            grade_id: gradeId,
            grade_synced_at: Date.now(),
          },
          { merge: true }
        );
    }
    await recordStudentGradeLite({
      userId: uid,
      seed: gradeId,
      date,
      subject: subject || null,
      grade,
      assessmentSeed: assessmentId || null,
    });
  } catch (error) {
    console.error("[telegram-bot] mirror grade failed", {
      studentId,
      gradeId,
      error,
    });
  }
}

async function findAssessmentMatch({
  db,
  studentId,
  when,
  subject,
}: {
  db: ReturnType<typeof supabaseServer>;
  studentId: string;
  when: string;
  subject: string | null;
}) {
  const { data, error } = await db
    .from("black_assessments")
    .select("id, subject, topics")
    .eq("student_id", studentId)
    .eq("when_at", when);
  if (error) {
    console.error("[telegram-bot] assessment lookup failed", error);
    return {
      match: null as any,
      info: "⚠️ Collegamento verifica non riuscito (errore).",
    };
  }
  if (!data?.length) {
    return {
      match: null as any,
      info: "ℹ️ Nessuna verifica in quella data da collegare.",
    };
  }
  if (data.length === 1) return { match: data[0], info: null };
  if (subject) {
    const normalized = subject.toLowerCase();
    const match = data.find(
      (row) => (row.subject || "").toLowerCase() === normalized
    );
    if (match) return { match, info: null };
    return {
      match: null as any,
      info: "ℹ️ Più verifiche quel giorno ma nessuna materia coincide, voto salvato senza collegamento.",
    };
  }
  return {
    match: null as any,
    info: "ℹ️ Più verifiche in quella data: specifica la materia per collegarle automaticamente.",
  };
}

async function attachGradeToAssessment({
  db,
  assessment,
  score,
  max,
  subject,
}: {
  db: ReturnType<typeof supabaseServer>;
  assessment: { id: string; subject?: string | null; topics?: string | null };
  score: number;
  max: number;
  subject: string | null;
}) {
  const resultLine = buildAssessmentResultLine({
    score,
    max,
    subject: subject || assessment.subject || null,
  });
  const updatedTopics = mergeAssessmentTopics(
    assessment.topics || "",
    resultLine
  );
  const { error } = await db
    .from("black_assessments")
    .update({ topics: updatedTopics })
    .eq("id", assessment.id);
  if (error) {
    console.error("[telegram-bot] assessment result update failed", error);
    return "⚠️ Voto salvato ma non sono riuscito a collegarlo alla verifica.";
  }
  const subjectLabel = assessment.subject || subject || "verifica";
  return `🔗 Collegato alla verifica ${subjectLabel}`;
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

  const whenDate = when || new Date().toISOString().slice(0, 10);
  const { data: inserted, error: e1 } = await db
    .from("black_grades")
    .insert({
      student_id: id,
      subject,
      score: Number(score),
      max_score: Number(max),
      when_at: whenDate,
    })
    .select("id")
    .single();
  if (e1 || !inserted?.id)
    return send(
      chatId,
      `❌ Errore voto: ${e1?.message || "inserimento fallito"}`
    );

  await mirrorGradeToFirestore({
    db,
    studentId: id,
    gradeId: inserted.id,
    date: whenDate,
    subject,
    grade: Number(score),
    maxScore: Number(max),
    assessmentId: null,
  });

  await db.rpc("refresh_black_brief", { _student: id });
  await send(
    chatId,
    `✅ Voto registrato per ${bold(name)}: ${score}/${max}${when ? " (" + when + ")" : ""}`
  );
}

/** /vdate <nome> <data YYYY-MM-DD> <voto>/<max> [materia] */
async function cmdVDATE({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/v(?:date|data)(?:@\w+)?\s+(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?:\s+(\S+))?$/i
  );
  if (!m)
    return send(chatId, "Uso: /vdate cognome 2025-11-20 7.5/10 [materia]");
  const [, q, when, scoreRaw, maxRaw, subjectRaw] = m;

  const score = Number(scoreRaw);
  const max = Number(maxRaw);
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) {
    return send(chatId, "❌ Formato voto non valido. Usa 7.5/10.");
  }

  const resolved = await resolveStudent(db, q);
  if ((resolved as any).err) return send(chatId, (resolved as any).err);
  const { id, name } = resolved as any;
  const explicitSubject = subjectRaw?.trim() || null;

  const matchInfo = await findAssessmentMatch({
    db,
    studentId: id,
    when,
    subject: explicitSubject,
  });

  const finalSubject = explicitSubject || matchInfo.match?.subject || null;

  const { data: gradeInsert, error: insertErr } = await db
    .from("black_grades")
    .insert({
      student_id: id,
      subject: finalSubject,
      score,
      max_score: max,
      when_at: when,
    })
    .select("id")
    .single();
  if (insertErr || !gradeInsert?.id)
    return send(
      chatId,
      `❌ Errore voto: ${insertErr?.message || "inserimento fallito"}`
    );

  let linkMessage: string | null = null;
  if (matchInfo.match) {
    linkMessage = await attachGradeToAssessment({
      db,
      assessment: matchInfo.match,
      score,
      max,
      subject: finalSubject,
    });
  } else if (matchInfo.info) {
    linkMessage = matchInfo.info;
  }

  await db.rpc("refresh_black_brief", { _student: id });
  const lines = [
    `✅ Voto registrato per ${bold(name)}: ${score}/${max} (${when})`,
    linkMessage,
  ]
    .filter(Boolean)
    .join("\n");
  await send(chatId, lines);

  await mirrorGradeToFirestore({
    db,
    studentId: id,
    gradeId: gradeInsert.id,
    date: when,
    subject: finalSubject,
    grade: score,
    maxScore: max,
    assessmentId: matchInfo.match?.id || null,
  });
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

  const { error: e1, data: assessmentData } = await db
    .from("black_assessments")
    .insert({
      student_id: id,
      subject,
      topics: topics || null,
      when_at: when,
    })
    .select("id")
    .single();
  if (e1) return send(chatId, `❌ Errore verifica: ${e1.message}`);

  // aggiorna cache prossima verifica rigenerando brief
  await db.rpc("refresh_black_brief", { _student: id });
  await mirrorAssessmentToFirestore({
    db,
    studentId: id,
    assessmentId: assessmentData?.id,
    date: when,
    subject,
    topics: topics || null,
  });

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

  const { error, data: assessmentData2 } = await db
    .from("black_assessments")
    .insert({
      student_id: id,
      subject,
      topics: topics || null,
      when_at: when,
    })
    .select("id")
    .single();
  if (error) return send(chatId, `❌ Errore verifica: ${error.message}`);

  try {
    await db.rpc("refresh_black_brief", { _student: id });
  } catch {
    // best effort
  }

  await mirrorAssessmentToFirestore({
    db,
    studentId: id,
    assessmentId: assessmentData2?.id,
    date: when,
    subject,
    topics: topics || null,
  });

  await send(
    chatId,
    `✅ Verifica importata per ${bold(name)}: ${subject} — ${when}${topics ? " — " + topics : ""}`
  );
}

/** /logs <nome|email> [limite] */
async function cmdLOGS({ db, chatId, text }: CmdCtx) {
  const rest = text.replace(/^\/logs(?:@\w+)?/i, "").trim();
  if (!rest) return send(chatId, "Uso: /logs cognome [limite].");
  const parts = rest.split(/\s+/);
  let limit = 5;
  let query = rest;
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    limit = Math.max(1, Math.min(15, Number(parts.pop())));
    query = parts.join(" ");
  }
  if (!query) return send(chatId, "Specificare cognome o email.");

  let resolved;
  if (query.includes("@")) {
    resolved = await lookupStudentByEmail(db, query.toLowerCase());
  } else {
    resolved = await resolveStudentId(db, query);
  }
  if ((resolved as any).err) return send(chatId, (resolved as any).err);
  const { id, name } = resolved as any;

  const [logsRes, assessmentsRes, gradesRes] = await Promise.all([
    db
      .from(CONTACT_LOG_TABLE)
      .select("contacted_at, body, author_label, source")
      .eq("student_id", id)
      .order("contacted_at", { ascending: false })
      .limit(limit),
    db
      .from("black_assessments")
      .select("id, subject, when_at, topics")
      .eq("student_id", id)
      .order("when_at", { ascending: false })
      .limit(Math.max(limit, 5)),
    db
      .from("black_grades")
      .select("subject, score, max_score, when_at")
      .eq("student_id", id)
      .order("when_at", { ascending: false })
      .limit(25),
  ]);

  const contactLogs = logsRes.data || [];
  const assessments = assessmentsRes.data || [];
  const grades = gradesRes.data || [];

  const gradeByDate = new Map<string, Array<any>>();
  for (const grade of grades) {
    if (!grade.when_at) continue;
    const key = grade.when_at;
    if (!gradeByDate.has(key)) gradeByDate.set(key, []);
    gradeByDate.get(key)!.push(grade);
  }

  const logLines =
    contactLogs.length > 0
      ? contactLogs.map((log) => {
          const when = formatDateTime(log.contacted_at);
          const who = log.author_label || log.source || "staff";
          const body = log.body ? log.body.slice(0, 120) : "—";
          return `• ${when} — ${who}: ${body}`;
        })
      : ["_Nessun log recente._"];

  const assessLines =
    assessments.length > 0
      ? assessments.map((ass) => {
          const when = formatDate(ass.when_at);
          const subject = ass.subject || "Materia";
          const gradeList = gradeByDate.get(ass.when_at || "");
          const gradeText = gradeList?.length
            ? gradeList.map((g) => `${g.score}/${g.max_score || 10}`).join(", ")
            : "—";
          const extra =
            ass.topics && ass.topics.includes("Esito")
              ? ` · ${ass.topics.split("\n").find((line: string) => line.includes("Esito"))}`
              : "";
          return `• ${when} — ${subject} → voto ${gradeText}${extra}`;
        })
      : ["_Nessuna verifica trovata._"];

  const textLines = [
    `*🗂️ Logs ${bold(name)}*`,
    ...logLines,
    "",
    "*📅 Verifiche & voti*",
    ...assessLines,
  ];

  await send(chatId, textLines.join("\n"));
}

/** /nomebreve <nome|email> <Nome> */
async function cmdNOMEBREVE({ db, chatId, text }: CmdCtx) {
  const m = text.match(/^\/nomebreve(?:@\w+)?\s+(\S+)\s+(.+)$/i);
  if (!m) return send(chatId, "Uso: /nomebreve cognome Nome");
  const [, query, rawName] = m;
  const preferred = rawName.trim();
  if (!preferred || preferred.length < 2)
    return send(chatId, "Nome troppo corto.");

  let resolved;
  if (query.includes("@")) {
    resolved = await lookupStudentByEmail(db, query.toLowerCase());
  } else {
    resolved = await resolveStudentId(db, query);
  }
  if ((resolved as any).err) return send(chatId, (resolved as any).err);
  const { id, name } = resolved as any;

  const { error } = await db
    .from("black_students")
    .update({
      preferred_name: preferred,
      preferred_name_updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return send(chatId, `❌ Errore salvataggio: ${error.message}`);

  try {
    await db.rpc("refresh_black_brief", { _student: id });
  } catch {
    // best effort
  }

  await send(
    chatId,
    `✅ Nome breve aggiornato per ${bold(name)} → ${bold(preferred)}`
  );
}

/** /votoiniziale <nome> <voto> */
async function cmdVOTOINIZIALE({ db, chatId, text }: CmdCtx) {
  const m = text.match(
    /^\/votoiniziale(?:@\w+)?\s+(\S+)\s+(\d+(?:[.,]\d+)?)$/i
  );
  if (!m) return send(chatId, "Uso: /votoiniziale cognome 6.5");
  const [, query, rawGrade] = m;
  const gradeValue = Number(rawGrade.replace(",", "."));
  if (!Number.isFinite(gradeValue) || gradeValue < 0 || gradeValue > 10) {
    return send(chatId, "Inserisci un voto tra 0 e 10.");
  }

  let resolved;
  if (query.includes("@")) {
    resolved = await lookupStudentByEmail(db, query.toLowerCase());
  } else {
    resolved = await resolveStudentId(db, query);
  }
  if ((resolved as any).err) return send(chatId, (resolved as any).err);
  const { id, name } = resolved as any;

  const { error } = await db
    .from("black_students")
    .update({ initial_avg: gradeValue })
    .eq("id", id);
  if (error) return send(chatId, `❌ Errore salvataggio: ${error.message}`);
  try {
    await db.rpc("refresh_black_brief", { _student: id });
  } catch {
    // ignore
  }

  await send(
    chatId,
    `✅ Voto iniziale aggiornato per ${bold(name)}: ${gradeValue.toFixed(1)}/10`
  );
}

/** /oggi → digest rapido: rossi/yellow/green + verifiche entro 7 giorni */
async function cmdOGGI({ db, chatId }: CmdCtx) {
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const startIso = startOfWeek.toISOString().slice(0, 10);
  const endIso = endOfWeek.toISOString().slice(0, 10);
  const { data: cards } = await db.from("black_student_card").select("*");

  if (!cards?.length) return send(chatId, "Nessuno studente.");

  const reds = cards.filter((c: any) => c.risk_level === "red");
  const yell = cards.filter((c: any) => c.risk_level === "yellow");
  const upcoming = cards.filter(
    (c: any) =>
      c.next_assessment_date &&
      c.next_assessment_date >= startIso &&
      c.next_assessment_date <= endIso
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
  const threshold = new Date(Date.now() - 5 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await db
    .from("black_students")
    .select(
      "id, user_id, readiness, parent_email, parent_phone, student_email, student_phone, year_class, last_contacted_at, profiles:profiles!black_students_user_id_fkey(full_name)"
    )
    .eq("status", "active")
    .lte("last_contacted_at", threshold)
    .order("last_contacted_at", { ascending: true })
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
          "`/vdate cognome YYYY-MM-DD 7.5/10 [materia]` — voto collegato alla verifica del giorno",
          "`/ass cognome YYYY-MM-DD materia [topics]` — nuova verifica",
          "`/verifica email@example.com YYYY-MM-DD materia [topics]` — importa verifica via email",
          "`/logs cognome [limite]` — ultimi log + verifiche/voti",
          "`/nomebreve cognome Nome` — imposta il nome corto",
          "`/votoiniziale cognome 7.0` — salva il voto iniziale",
          "`/dacontattare` — ultimi contatti >5 giorni",
          "`/dariattivare` — studenti mai contattati ma attivi sul sito",
          "`/orepagate cognome 3` — segna ore pagate",
          "`/assegnatutor cognome tutor` — collega tutor videolezione",
          "`/loglezione cognome 1.5 [nota]` — logga una lezione",
          "`/pagatutor tutor 2` — scala ore pagate al tutor",
          "`/addtutor Nome;Telefono;Email` — crea un tutor",
          "`/dashore` — riepilogo studenti/tutor/ore",
          "`/nuovi` — iscritti ultimi 30 giorni",
          "`/sync [limite]` — forza il sync delle attivazioni Stripe",
          "`/desc cognome testo...` — aggiorna overview studente",
          "`/nome email@example.com Nuovo Nome` — aggiorna il nome in anagrafica",
          "`/checked cognome|email [nota]` — segna ultimo contatto + log",
        ].join("\n")
      );
    } else if (/^\/oggi/i.test(text)) {
      await cmdOGGI(ctx);
    } else if (/^\/logs(\s|@)/i.test(text)) {
      await cmdLOGS(ctx);
    } else if (/^\/nomebreve(\s|@)/i.test(text)) {
      await cmdNOMEBREVE(ctx);
    } else if (/^\/votoiniziale(\s|@)/i.test(text)) {
      await cmdVOTOINIZIALE(ctx);
    } else if (/^\/dacontattare/i.test(text)) {
      await cmdDaContattare(ctx);
    } else if (/^\/dariattivare/i.test(text)) {
      await cmdDARIATTIVARE(ctx);
    } else if (/^\/orepagate/i.test(text)) {
      await cmdOREPAGATE(ctx);
    } else if (/^\/assegnatutor/i.test(text)) {
      await cmdASSEGNA_TUTOR(ctx);
    } else if (/^\/loglezione/i.test(text)) {
      await cmdLOGLEZIONE(ctx);
    } else if (/^\/pagatutor/i.test(text)) {
      await cmdPAGATUTOR(ctx);
    } else if (/^\/dashore/i.test(text)) {
      await cmdDASHORE(ctx);
    } else if (/^\/addtutor/i.test(text)) {
      await cmdADDTUTOR(ctx);
    } else if (/^\/s(\s|@)/i.test(text)) {
      await cmdS(ctx);
    } else if (/^\/n(\s|@)/i.test(text)) {
      await cmdN(ctx);
    } else if (/^\/vdate(\s|@)/i.test(text)) {
      await cmdVDATE(ctx);
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
