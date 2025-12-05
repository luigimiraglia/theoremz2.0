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

  const weekAssessments = await fetchAssessmentsNext7Days(db);
  const assessmentsText = weekAssessments.length
    ? formatAssessments(weekAssessments)
    : null;

  const staleContacts = cards.filter((c: any) => {
    if (!c.last_contacted_at) return false;
    const contactedAt = new Date(c.last_contacted_at);
    if (Number.isNaN(contactedAt.getTime())) return false;
    const diffMs = now.getTime() - contactedAt.getTime();
    const diffDays = diffMs / (24 * 3600 * 1000);
    return diffDays > 3;
  });

  const contactLine = (c: any) => {
    const when = new Date(c.last_contacted_at).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
    return `• ${resolveContactLabel(c)} — contattato il ${when}`;
  };

  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: recentSignups } = await db
    .from("black_students")
    .select(
      "id, start_date, student_email, parent_email, profiles:profiles!black_students_user_id_fkey(full_name)"
    )
    .gte("start_date", threeDaysAgo)
    .is("last_contacted_at", null)
    .eq("status", "active");

  const signupLine = (row: any) => {
    const name = resolveContactLabel(row);
    const start = row.start_date
      ? new Date(row.start_date).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
        })
      : "—";
    return `• ${name} — onboarding dal ${start}`;
  };

  const txt =
    [
      "*📊 Digest quotidiano*",
      assessmentsText ? `\n🧾 *Agenda verifiche (7g)*\n${assessmentsText}` : "",
      staleContacts.length
        ? `\n📞 *Da ricontattare (>3g)* (${staleContacts.length})\n${staleContacts
            .map(contactLine)
            .join("\n")}`
        : "",
      recentSignups?.length
        ? `\n🚀 *Nuove attivazioni (<3g)* (${recentSignups.length})\n${recentSignups
            .map(signupLine)
            .join("\n")}`
        : "",
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
      "student_id, subject, when_at, readiness, black_students!inner(user_id, student_email, parent_email, profiles:profiles!black_students_user_id_fkey(full_name))"
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
      const name = resolveContactLabel({
        student_email: row.black_students?.student_email,
        parent_email: row.black_students?.parent_email,
        student_name:
          studentProfile?.full_name ||
          row.black_students?.user_id ||
          row.student_id,
      });
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

function resolveContactLabel(source: {
  student_email?: string | null;
  parent_email?: string | null;
  student_name?: string | null;
}) {
  return (
    source.student_email ||
    source.parent_email ||
    source.student_name ||
    "Studente"
  );
}
