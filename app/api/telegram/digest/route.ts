import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { decayReadiness } from "@/lib/black/readiness";

const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TARGETS = (process.env.ALLOWED_CHAT_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function send(chat_id: string, text: string) {
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

export async function GET() {
  const db = supabaseServer();
  try {
    await decayReadiness({ db });
  } catch (error) {
    console.error("[telegram-digest] readiness decay failed", error);
  }
  const { data: cards } = await db.from("black_student_card").select("*");

  if (!cards?.length) {
    await Promise.all(TARGETS.map((id) => send(id, "Nessuno studente.")));
    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const reds = cards.filter((c: any) => c.risk_level === "red");
  const yell = cards.filter((c: any) => c.risk_level === "yellow");
  const greens = cards.filter((c: any) => c.risk_level === "green");
  const upcoming = cards.filter(
    (c: any) =>
      c.next_assessment_date &&
      c.next_assessment_date <= in7 &&
      c.next_assessment_date >= now.toISOString().slice(0, 10)
  );

  const line = (c: any) =>
    `• ${c.student_name} ${c.readiness ?? "—"}/100` +
    (c.next_assessment_date
      ? ` (${c.next_assessment_subject ?? "verifica"} ${c.next_assessment_date})`
      : "");

  const weekAssessments = await fetchAssessmentsNext7Days(db);
  const assessmentsText = weekAssessments.length
    ? formatAssessments(weekAssessments)
    : null;

  const txt =
    [
      "*📊 Digest quotidiano*",
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
      assessmentsText ? `\n🧾 *Agenda verifiche (7g)*\n${assessmentsText}` : "",
    ]
      .filter(Boolean)
      .join("\n") || "Nessun dato.";

  await Promise.all(TARGETS.map((id) => send(id, txt)));
  return NextResponse.json({ ok: true });
}

async function fetchAssessmentsNext7Days(db: ReturnType<typeof supabaseServer>) {
  const today = new Date();
  const in7 = new Date(today.getTime() + 7 * 24 * 3600 * 1000);
  const from = today.toISOString().slice(0, 10);
  const to = in7.toISOString().slice(0, 10);
  const { data, error } = await db
    .from("black_assessments")
    .select(
      "student_id, subject, when_at, readiness, black_students!inner(user_id, profiles:profiles!black_students_user_id_fkey(full_name))"
    )
    .gte("when_at", from)
    .lte("when_at", to)
    .order("when_at", { ascending: true });
  if (error) {
    console.error("[telegram-digest] assessments fetch failed", error);
    return [];
  }
  return data ?? [];
}

function formatAssessments(rows: any[]) {
  return rows
    .map((row: any) => {
      const studentProfile = Array.isArray(row.black_students?.profiles)
        ? row.black_students.profiles[0]
        : row.black_students?.profiles;
      const name =
        studentProfile?.full_name ||
        row.black_students?.user_id ||
        row.student_id ||
        "Studente";
      const when = row.when_at
        ? new Date(row.when_at).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
          })
        : "—";
      const readiness = Number(row.readiness ?? row.black_students?.readiness ?? 0);
      return `• ${when} — ${name} (${row.subject || "materia"}) · readiness ${readiness}/100`;
    })
    .join("\n");
}
