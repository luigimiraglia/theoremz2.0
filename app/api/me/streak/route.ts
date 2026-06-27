import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { formatRomeYmd, romeDateToUtc } from "@/lib/rome-time";
import { supabaseServer } from "@/lib/supabase";
import { ensureStudentRecord } from "@/lib/students";

async function getUid(req: Request) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  try {
    const d = await adminAuth.verifyIdToken(token);
    return d.uid as string;
  } catch {
    return null;
  }
}

function isoDay(d = new Date()) {
  return formatRomeYmd(d);
}
function daysBetweenISO(a: string, b: string) {
  const da = romeDateToUtc(a).getTime();
  const db = romeDateToUtc(b).getTime();
  return Math.round((db - da) / 86400000);
}

export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseServer();
  const { data, error } = await db
    .from("student_streaks")
    .select("last_date, count")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("[me-streak] read failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ lastDate: data?.last_date ?? null, count: data?.count ?? 0 });
}

// POST → tick giornaliero
export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = isoDay();
  const db = supabaseServer();
  const student = await ensureStudentRecord({ authUid: uid, source: "auth" }, db);
  const { data: prev, error: readError } = await db
    .from("student_streaks")
    .select("last_date, count")
    .eq("user_id", uid)
    .maybeSingle();
  if (readError) {
    console.error("[me-streak] read before write failed", readError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let count = 1;
  if (prev?.last_date === today) {
    count = prev.count || 1;
  } else if (prev?.last_date) {
    const gap = daysBetweenISO(prev.last_date, today);
    count = gap === 1 ? (prev.count || 0) + 1 : 1;
  }

  const { error: writeError } = await db.from("student_streaks").upsert({
    user_id: uid,
    student_id: student.id,
    last_date: today,
    count,
    updated_at: new Date().toISOString(),
  });
  if (writeError) {
    console.error("[me-streak] write failed", writeError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lastDate: today, count });
}
