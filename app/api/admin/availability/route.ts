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

function toUtcMs(
  dateKey: string,
  hour: number,
  minute: number,
  tzOffsetMinutes?: number | null,
) {
  const [y, m, d] = dateKey.split("-").map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const baseUtc = Date.UTC(y, m - 1, d, hour, minute);
  const offset =
    typeof tzOffsetMinutes === "number" && Number.isFinite(tzOffsetMinutes)
      ? tzOffsetMinutes
      : 0;
  return baseUtc + offset * 60000;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mergeIntervals(list: Array<{ startMs: number; endMs: number }>) {
  const sorted = list
    .filter((i) => Number.isFinite(i.startMs) && Number.isFinite(i.endMs) && i.endMs > i.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  const merged: Array<{ startMs: number; endMs: number }> = [];
  sorted.forEach((item) => {
    const last = merged[merged.length - 1];
    if (!last || item.startMs > last.endMs) {
      merged.push({ startMs: item.startMs, endMs: item.endMs });
      return;
    }
    last.endMs = Math.max(last.endMs, item.endMs);
  });
  return merged;
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

    const blocksInput = Array.isArray(body.blocks) ? body.blocks : null;
    const newBlocksByDay = new Map<string, Array<{ startMs: number; endMs: number }>>();
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (blocksInput && blocksInput.length > 0) {
      const tzOffsetMinutes =
        typeof body.tzOffsetMinutes === "number" && Number.isFinite(body.tzOffsetMinutes)
          ? Number(body.tzOffsetMinutes)
          : null;
      let minStart = Number.POSITIVE_INFINITY;
      let maxEnd = 0;
      for (const block of blocksInput) {
        let startMs = NaN;
        let endMs = NaN;
        if (block?.startMs != null && block?.endMs != null) {
          startMs = Number(block.startMs);
          endMs = Number(block.endMs);
        } else if (block?.startsAt && block?.endsAt) {
          startMs = new Date(block.startsAt).getTime();
          endMs = new Date(block.endsAt).getTime();
        } else if (block?.date && block?.startTime && block?.endTime) {
          const dateKey = String(block.date);
          const [startH, startM] = String(block.startTime)
            .split(":")
            .map((v) => Number(v));
          const [endH, endM] = String(block.endTime)
            .split(":")
            .map((v) => Number(v));
          const startUtc = toUtcMs(dateKey, startH, startM, tzOffsetMinutes);
          const endUtc = toUtcMs(dateKey, endH, endM, tzOffsetMinutes);
          startMs = startUtc ?? NaN;
          endMs = endUtc ?? NaN;
        }
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
          return NextResponse.json({ error: "Blocco disponibilità non valido" }, { status: 400 });
        }
        const startKey = dayKey(new Date(startMs));
        const endKey = dayKey(new Date(endMs - 1));
        if (startKey !== endKey) {
          return NextResponse.json({ error: "Blocchi su più giorni non supportati" }, { status: 400 });
        }
        const list = newBlocksByDay.get(startKey) || [];
        list.push({ startMs, endMs });
        newBlocksByDay.set(startKey, list);
        minStart = Math.min(minStart, startMs);
        maxEnd = Math.max(maxEnd, endMs);
      }
      rangeStart = new Date(minStart);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(maxEnd);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setHours(0, 0, 0, 0);
    } else {
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
      const [startH, startM] = timeStart.split(":").map((x: string) => Number(x));
      const [endH, endM] = timeEnd.split(":").map((x: string) => Number(x));
      if (!Number.isFinite(startH) || !Number.isFinite(startM) || !Number.isFinite(endH) || !Number.isFinite(endM)) {
        return NextResponse.json({ error: "Finestra oraria non valida" }, { status: 400 });
      }
      const tzOffsetMinutes =
        typeof body.tzOffsetMinutes === "number" && Number.isFinite(body.tzOffsetMinutes)
          ? Number(body.tzOffsetMinutes)
          : null;

      const cursor = new Date(dateFrom);
      while (cursor.getTime() <= dateTo.getTime()) {
        const dow = (cursor.getDay() + 6) % 7; // convert Sunday=6
        if (daysOfWeek.includes(dow)) {
          const base = cursor.toISOString().slice(0, 10);
          const startMs = toUtcMs(base, startH, startM, tzOffsetMinutes);
          const endMs = toUtcMs(base, endH, endM, tzOffsetMinutes);
          if (startMs != null && endMs != null && endMs > startMs) {
            const key = dayKey(new Date(startMs));
            const list = newBlocksByDay.get(key) || [];
            list.push({ startMs, endMs });
            newBlocksByDay.set(key, list);
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (!newBlocksByDay.size) {
        return NextResponse.json({ error: "Nessuna disponibilità generata" }, { status: 400 });
      }

      rangeStart = new Date(dateFrom);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(dateTo);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setHours(0, 0, 0, 0);
    }

    const { data: existingBlocks, error: existingErr } = await db
      .from("tutor_availability_blocks")
      .select("id, starts_at, ends_at")
      .eq("tutor_id", targetTutorId)
      .lt("starts_at", (rangeEnd as Date).toISOString())
      .gt("ends_at", (rangeStart as Date).toISOString());
    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

    const existingByDay = new Map<string, Array<{ id: string; startMs: number; endMs: number }>>();
    (existingBlocks || []).forEach((block: any) => {
      const startMs = new Date(block.starts_at).getTime();
      const endMs = new Date(block.ends_at).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return;
      const key = dayKey(new Date(startMs));
      const list = existingByDay.get(key) || [];
      list.push({ id: block.id as string, startMs, endMs });
      existingByDay.set(key, list);
    });

    const idsToDelete: string[] = [];
    const inserts: Array<{ tutor_id: string; starts_at: string; ends_at: string }> = [];

    for (const [key, newBlocks] of newBlocksByDay.entries()) {
      const existing = existingByDay.get(key) || [];
      const intervals = [
        ...existing.map((b) => ({ startMs: b.startMs, endMs: b.endMs })),
        ...newBlocks,
      ];
      const merged = mergeIntervals(intervals);
      if (existing.length) idsToDelete.push(...existing.map((b) => b.id));
      merged.forEach((block) => {
        inserts.push({
          tutor_id: targetTutorId,
          starts_at: new Date(block.startMs).toISOString(),
          ends_at: new Date(block.endMs).toISOString(),
        });
      });
    }

    if (idsToDelete.length) {
      const { error: delErr } = await db
        .from("tutor_availability_blocks")
        .delete()
        .in("id", idsToDelete);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const { error: insertErr } = await db
      .from("tutor_availability_blocks")
      .insert(inserts);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, slots: inserts.length, tutorId: targetTutorId });
  } catch (err: any) {
    console.error("[admin/availability] unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore disponibilità" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const { error: authError, tutorId: viewerTutorId, isAdmin } = await resolveViewer(request, db);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const targetTutorId = (isAdmin ? searchParams.get("tutorId") : null) || viewerTutorId;
    if (!targetTutorId) return NextResponse.json({ error: "Tutor non trovato" }, { status: 404 });

    const limit = Math.min(600, Number(searchParams.get("limit") || 400));
    const fromIso = new Date().toISOString();
    const toIso = new Date(Date.now() + 90 * 86400000).toISOString(); // 90 giorni

    const { data, error } = await db
      .from("tutor_availability_blocks")
      .select("id, starts_at, ends_at")
      .eq("tutor_id", targetTutorId)
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso)
      .order("starts_at", { ascending: true })
      .limit(limit);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const slots = (data || []).map((row: any) => {
      const startMs = new Date(row.starts_at).getTime();
      const endMs = new Date(row.ends_at).getTime();
      const durationMin =
        Number.isFinite(startMs) && Number.isFinite(endMs)
          ? Math.max(1, Math.round((endMs - startMs) / 60000))
          : 60;
      return {
        id: row.id,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        duration_min: durationMin,
      };
    });

    return NextResponse.json({ slots, tutorId: targetTutorId });
  } catch (err: any) {
    console.error("[admin/availability] get unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore recupero disponibilità" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const { error: authError, tutorId: viewerTutorId, isAdmin } = await resolveViewer(request, db);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const targetTutorId = (isAdmin ? body.tutorId : null) || viewerTutorId;
    if (!targetTutorId) return NextResponse.json({ error: "Tutor non trovato" }, { status: 404 });

    const resetAll = Boolean(body.resetAll);
    const dateFrom = resetAll ? new Date() : parseDate(body.dateFrom);
    const dateTo = resetAll
      ? new Date(Date.now() + 180 * 86400000)
      : parseDate(body.dateTo) || parseDate(body.dateFrom);
    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: "Intervallo date non valido" }, { status: 400 });
    }
    if (dateTo.getTime() < dateFrom.getTime()) {
      return NextResponse.json({ error: "Data fine precedente alla data inizio" }, { status: 400 });
    }
    const dayDiff = Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000);
    if (dayDiff > 365) {
      return NextResponse.json({ error: "Intervallo troppo ampio" }, { status: 400 });
    }

    const daysOfWeek: number[] = Array.isArray(body.daysOfWeek)
      ? body.daysOfWeek.map((n: any) => Number(n)).filter((n: any) => Number.isInteger(n) && n >= 0 && n <= 6)
      : [];
    const hasDayFilter = daysOfWeek.length > 0;
    const timeStart = String(body.timeStart || "").trim();
    const timeEnd = String(body.timeEnd || "").trim();
    const tzOffsetMinutes =
      typeof body.tzOffsetMinutes === "number" && Number.isFinite(body.tzOffsetMinutes)
        ? Number(body.tzOffsetMinutes)
        : null;
    const hasTimeWindow = Boolean(timeStart && timeEnd);
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map((x) => Number(x));
      if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
      return h * 60 + m;
    };
    const minStart = hasTimeWindow ? toMinutes(timeStart) : null;
    const minEnd = hasTimeWindow ? toMinutes(timeEnd) : null;
    if (hasTimeWindow && (minStart == null || minEnd == null || minEnd <= minStart)) {
      return NextResponse.json({ error: "Finestra oraria non valida" }, { status: 400 });
    }

    const fromRange = new Date(dateFrom);
    fromRange.setHours(0, 0, 0, 0);
    const toRange = new Date(dateTo);
    toRange.setDate(toRange.getDate() + 1);
    toRange.setHours(0, 0, 0, 0);

    const { data: blocks, error } = await db
      .from("tutor_availability_blocks")
      .select("id, starts_at, ends_at")
      .eq("tutor_id", targetTutorId)
      .lt("starts_at", toRange.toISOString())
      .gt("ends_at", fromRange.toISOString())
      .limit(2000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const windowsByDay = new Map<string, { startMs: number; endMs: number }>();
    const cursor = new Date(fromRange);
    while (cursor.getTime() < toRange.getTime()) {
      const dow = (cursor.getDay() + 6) % 7;
      if (!hasDayFilter || daysOfWeek.includes(dow)) {
        const base = cursor.toISOString().slice(0, 10);
        const nextBase = new Date(cursor.getTime() + 86400000).toISOString().slice(0, 10);
        let windowStartMs = toUtcMs(base, 0, 0, tzOffsetMinutes);
        let windowEndMs = toUtcMs(nextBase, 0, 0, tzOffsetMinutes);
        if (hasTimeWindow) {
          const [hStart, mStart] = timeStart.split(":").map((x) => Number(x));
          const [hEnd, mEnd] = timeEnd.split(":").map((x) => Number(x));
          windowStartMs = toUtcMs(base, hStart, mStart, tzOffsetMinutes);
          windowEndMs = toUtcMs(base, hEnd, mEnd, tzOffsetMinutes);
        }
        if (windowStartMs != null && windowEndMs != null && windowEndMs > windowStartMs) {
          windowsByDay.set(dayKey(new Date(windowStartMs)), {
            startMs: windowStartMs,
            endMs: windowEndMs,
          });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const idsToDelete: string[] = [];
    const updates: Array<{ id: string; starts_at: string; ends_at: string }> = [];
    const inserts: Array<{ tutor_id: string; starts_at: string; ends_at: string }> = [];

    (blocks || []).forEach((block: any) => {
      const startMs = new Date(block.starts_at).getTime();
      const endMs = new Date(block.ends_at).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return;
      const key = dayKey(new Date(startMs));
      const window = windowsByDay.get(key);
      if (!window) return;
      const winStart = window.startMs;
      const winEnd = window.endMs;
      if (winEnd <= startMs || winStart >= endMs) return;

      if (winStart <= startMs && winEnd >= endMs) {
        idsToDelete.push(block.id as string);
        return;
      }

      if (winStart <= startMs && winEnd < endMs) {
        updates.push({
          id: block.id as string,
          starts_at: new Date(winEnd).toISOString(),
          ends_at: new Date(endMs).toISOString(),
        });
        return;
      }

      if (winStart > startMs && winEnd >= endMs) {
        updates.push({
          id: block.id as string,
          starts_at: new Date(startMs).toISOString(),
          ends_at: new Date(winStart).toISOString(),
        });
        return;
      }

      if (winStart > startMs && winEnd < endMs) {
        updates.push({
          id: block.id as string,
          starts_at: new Date(startMs).toISOString(),
          ends_at: new Date(winStart).toISOString(),
        });
        inserts.push({
          tutor_id: targetTutorId,
          starts_at: new Date(winEnd).toISOString(),
          ends_at: new Date(endMs).toISOString(),
        });
      }
    });

    if (!idsToDelete.length && !updates.length && !inserts.length) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    if (idsToDelete.length) {
      const { error: delErr } = await db.from("tutor_availability_blocks").delete().in("id", idsToDelete);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    for (const upd of updates) {
      const { error: updErr } = await db
        .from("tutor_availability_blocks")
        .update({ starts_at: upd.starts_at, ends_at: upd.ends_at, updated_at: new Date().toISOString() })
        .eq("id", upd.id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (inserts.length) {
      const { error: insErr } = await db.from("tutor_availability_blocks").insert(inserts);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: idsToDelete.length + updates.length });
  } catch (err: any) {
    console.error("[admin/availability] delete unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore rimozione disponibilità" }, { status: 500 });
  }
}
