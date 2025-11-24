import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

function normalizeDigits(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D+/g, "");
  return digits || null;
}

function extractPhoneTail(raw: string | null) {
  const digits = normalizeDigits(raw);
  if (!digits) return null;
  return digits.slice(-10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const limit = Number(url.searchParams.get("limit") || 50);
  if (!query) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  const db = supabaseServer();
  const tail = extractPhoneTail(query);
  const isEmail = query.includes("@");

  let student: any = null;
  try {
    if (isEmail) {
      const { data, error } = await db
        .from("black_students")
        .select(
          "id, student_name, student_email, parent_email, student_phone, parent_phone, year_class, track, goal, difficulty_focus, readiness, ai_description, metrics"
        )
        .or(`student_email.ilike.${query},parent_email.ilike.${query}`)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      student = data || null;
    } else if (tail) {
      const { data, error } = await db
        .from("black_students")
        .select(
          "id, student_name, student_email, parent_email, student_phone, parent_phone, year_class, track, goal, difficulty_focus, readiness, ai_description, metrics"
        )
        .or(`student_phone.ilike.%${tail},parent_phone.ilike.%${tail}`)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      student = data || null;
    }
  } catch (err) {
    console.error("[whatsapp-admin] student lookup failed", err);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const messagesFilter = student?.id
    ? { column: "student_id", value: student.id }
    : tail
    ? { column: "phone_tail", value: tail }
    : null;

  let messages: any[] = [];
  if (messagesFilter) {
    try {
      const { data, error } = await db
        .from("black_whatsapp_messages")
        .select("id, role, content, created_at, student_id, phone_tail")
        .eq(messagesFilter.column, messagesFilter.value)
        .order("created_at", { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 200));
      if (error) throw error;
      messages = (data || []).reverse();
    } catch (err) {
      console.error("[whatsapp-admin] messages fetch failed", err);
      return NextResponse.json({ error: "messages_fetch_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({
    student,
    phone_tail: tail,
    messages,
  });
}
