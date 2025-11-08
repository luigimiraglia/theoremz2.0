import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

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
    (c: any) => c.next_assessment_date && c.next_assessment_date <= in7
  );

  const line = (c: any) =>
    `• ${c.student_name} ${c.readiness ?? "—"}/100` +
    (c.next_assessment_date
      ? ` (${c.next_assessment_subject ?? "verifica"} ${c.next_assessment_date})`
      : "");

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
    ]
      .filter(Boolean)
      .join("\n") || "Nessun dato.";

  await Promise.all(TARGETS.map((id) => send(id, txt)));
  return NextResponse.json({ ok: true });
}
