import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function resolveViewer(request: NextRequest, db: ReturnType<typeof supabaseServer>) {
  if (process.env.NODE_ENV === "development") {
    // In dev prova a usare il token se disponibile
    const token = request.headers.get("authorization")?.replace(/^Bearer /i, "") || null;
    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const email = decoded.email?.toLowerCase() || null;
        if (email) {
          const { data: tutor } = await db.from("tutors").select("id").ilike("email", email).maybeSingle();
          return { email, tutorId: tutor?.id || null, isAdmin: isAdminEmail(email) };
        }
      } catch (err) {
        console.warn("[admin/availability] dev token decode failed", err);
      }
    }
    return { email: null, tutorId: null, isAdmin: true };
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase() || null;
    if (!email) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
    const { data: tutor, error: tutorErr } = await db.from("tutors").select("id").ilike("email", email).maybeSingle();
    if (tutorErr) {
      console.error("[admin/availability] tutor lookup error", tutorErr);
      return { error: NextResponse.json({ error: "auth_error" }, { status: 500 }) };
    }
    const isAdmin = isAdminEmail(email);
    if (!tutor && !isAdmin) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    return { email, tutorId: tutor?.id || null, isAdmin };
  } catch (err) {
    console.error("[admin/availability] auth error", err);
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
}

function parseDate(input?: string | null) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function POST(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const { error: authError, tutorId: viewerTutorId, isAdmin } = await resolveViewer(request, db);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const targetTutorId = (isAdmin ? body.tutorId : null) || viewerTutorId;
    if (!targetTutorId) return NextResponse.json({ error: "Tutor non trovato" }, { status: 404 });

    const dateFrom = parseDate(body.dateFrom);
    const dateTo = parseDate(body.dateTo);
    if (!dateFrom || !dateTo) return NextResponse.json({ error: "Intervallo date non valido" }, { status: 400 });
    if (dateTo.getTime() < dateFrom.getTime()) {
      return NextResponse.json({ error: "Data fine precedente alla data inizio" }, { status: 400 });
    }
    const dayDiff = Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000);
    if (dayDiff > 120) {
      return NextResponse.json({ error: "Intervallo troppo ampio (max 120 giorni)" }, { status: 400 });
    }

    const daysOfWeek: number[] = Array.isArray(body.daysOfWeek)
      ? body.daysOfWeek.map((n: any) => Number(n)).filter((n: any) => Number.isInteger(n) && n >= 0 && n <= 6)
      : [];
    if (!daysOfWeek.length) return NextResponse.json({ error: "Seleziona almeno un giorno della settimana" }, { status: 400 });

    const timeStart = String(body.timeStart || "09:00");
    const timeEnd = String(body.timeEnd || "18:00");
    const slotMinutes = Math.max(10, Math.min(240, Number(body.slotMinutes) || 30));

    const callTypeSlug = String(body.callTypeSlug || "").trim() || "videolezione";
    const { data: callType, error: callTypeErr } = await db
      .from("call_types")
      .select("id, slug, active, duration_min")
      .eq("slug", callTypeSlug)
      .maybeSingle();
    if (callTypeErr) return NextResponse.json({ error: callTypeErr.message }, { status: 500 });
    if (!callType || callType.active === false) {
      return NextResponse.json({ error: "Tipo di call non valido" }, { status: 400 });
    }

    const payload: any[] = [];
    const cursor = new Date(dateFrom);
    while (cursor.getTime() <= dateTo.getTime()) {
      const dow = (cursor.getDay() + 6) % 7; // convert Sunday=6
      if (daysOfWeek.includes(dow)) {
        const base = cursor.toISOString().slice(0, 10); // yyyy-mm-dd
        const [startH, startM] = timeStart.split(":").map((x: string) => Number(x));
        const [endH, endM] = timeEnd.split(":").map((x: string) => Number(x));
        const startMs = new Date(`${base}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`).getTime();
        const endMs = new Date(`${base}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`).getTime();
        for (let ts = startMs; ts + slotMinutes * 60000 <= endMs; ts += slotMinutes * 60000) {
          const startsAt = new Date(ts).toISOString();
          payload.push({
            tutor_id: targetTutorId,
            call_type_id: callType.id,
            starts_at: startsAt,
            duration_min: slotMinutes,
            status: "available",
          });
          if (payload.length >= 500) break;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
      if (payload.length >= 500) break;
    }

    if (!payload.length) {
      return NextResponse.json({ error: "Nessuno slot generato" }, { status: 400 });
    }

    const { error: insertErr } = await db
      .from("call_slots")
      .upsert(payload, { onConflict: "tutor_id,starts_at" });
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, slots: payload.length, tutorId: targetTutorId });
  } catch (err: any) {
    console.error("[admin/availability] unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore disponibilità" }, { status: 500 });
  }
}
