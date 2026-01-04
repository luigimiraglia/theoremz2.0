import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const DEFAULT_OFFSET_DAYS = 3;
const LEAD_FOLLOWUP_STEPS = [1, 2, 7, 30];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdminEmail(email?: string | null) {
  return Boolean(email && email.toLowerCase() === ADMIN_EMAIL);
}

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;

  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { adminAuth } = await import("@/lib/firebaseAdmin");
    const token = authHeader.slice("Bearer ".length);
    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("[admin/black-followups] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function computeLeadNextFollowUp(stepIndex: number, from: Date) {
  const offset = LEAD_FOLLOWUP_STEPS[stepIndex];
  if (offset === undefined) return null;
  return addDays(from, offset);
}

function normalizePhone(raw?: string | null) {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "").trim();
  const digits = compact.replace(/\D/g, "");
  if (!digits) return null;
  if (compact.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00") && digits.length > 2) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

type PostgrestErrorLike = {
  message?: string | null;
  details?: string | null;
  code?: string | null;
};

function extractMissingColumn(error?: PostgrestErrorLike | null) {
  const raw = `${error?.message || ""} ${error?.details || ""}`.trim();
  if (!raw) return null;
  const match =
    raw.match(/column "?([a-zA-Z0-9_.]+)"?/i) ||
    raw.match(/'([^']+)' column/i);
  const col = match?.[1];
  if (!col) return null;
  return col.includes(".") ? col.split(".").pop() || null : col;
}

async function updateBlackStudentSafe(
  db: ReturnType<typeof supabaseServer>,
  studentId: string,
  patch: Record<string, any>,
  fallbackName?: string | null,
) {
  let current = { ...patch };
  const missingCols = new Set<string>();
  let attempts = 0;

  while (Object.keys(current).length && attempts < 6) {
    const { error } = await db
      .from("black_students")
      .update(current)
      .eq("id", studentId);
    if (!error) return null;
    const missing = extractMissingColumn(error);
    if (missing && !missingCols.has(missing)) {
      missingCols.add(missing);
      delete current[missing];
      if (missing === "preferred_name") {
        delete current.preferred_name_updated_at;
        if (fallbackName && !("student_name" in current)) {
          current.student_name = fallbackName;
        }
      }
      attempts += 1;
      continue;
    }
    return error;
  }
  return null;
}

function mapRow(row: any) {
  if (!row) return null;
  const student = (row as any).student || (row as any).black_students;
  return {
    id: row.id as string,
    studentId: row.student_id || student?.id || null,
    name: row.full_name || null,
    whatsappPhone: row.whatsapp_phone || null,
    note: row.note || null,
    status: row.status || "active",
    nextFollowUpAt: row.next_follow_up_at || null,
    lastContactedAt: row.last_contacted_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    student: student
      ? {
          id: student.id,
          preferred_name: student.preferred_name,
          student_name: student.student_name,
          student_email: student.student_email,
          parent_email: student.parent_email,
          student_phone: student.student_phone,
          parent_phone: student.parent_phone,
          year_class: student.year_class,
          track: student.track,
        }
      : null,
  };
}

async function attachStudents(
  db: ReturnType<typeof supabaseServer>,
  rows: any[],
  preload?: Record<string, any>,
) {
  const uniqueIds = Array.from(
    new Set(
      rows
        .map((r) => r?.student_id)
        .filter(Boolean)
    ),
  );
  if (!uniqueIds.length && !preload) return rows;
  const studentMap = new Map<string, any>();
  if (preload) {
    Object.entries(preload).forEach(([k, v]) => {
      if (k && v) studentMap.set(k, v);
    });
  }
  if (uniqueIds.length) {
    const { data, error } = await db
      .from("black_students")
      .select(
        "id, preferred_name, student_name, student_email, parent_email, student_phone, parent_phone, year_class, track",
      )
      .in("id", uniqueIds);
    if (!error && Array.isArray(data)) {
      data.forEach((s) => {
        if (s?.id) studentMap.set(s.id, s);
      });
    }
  }
  return rows.map((r) => ({
    ...r,
    student: r.student || studentMap.get(r.student_id) || null,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
    }

    const db = supabaseServer();
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const includeCompleted = searchParams.get("includeCompleted") === "1";
  const lookup = (searchParams.get("lookup") || "").trim();
  const fetchNext = searchParams.get("next") === "1";
  const fetchAll = searchParams.get("all") === "1";
  const referenceDay = dateParam ? new Date(dateParam) : new Date();
  const day = Number.isNaN(referenceDay.getTime()) ? new Date() : referenceDay;
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

    if (lookup) {
      const safeLookup = lookup.replace(/[^\w@\.\+\-\s]/g, "").trim();
      if (!safeLookup) return NextResponse.json({ students: [] });
      const { data, error } = await db
        .from("black_students")
        .select(
          "id, preferred_name, student_name, student_email, parent_email, student_phone, parent_phone, year_class, track",
        )
        .or(
          [
            `student_email.ilike.%${safeLookup}%`,
            `parent_email.ilike.%${safeLookup}%`,
            `student_phone.ilike.%${safeLookup}%`,
            `parent_phone.ilike.%${safeLookup}%`,
            `preferred_name.ilike.%${safeLookup}%`,
            `student_name.ilike.%${safeLookup}%`,
          ].join(","),
        )
        .limit(15);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const students = Array.isArray(data) ? data : [];
    const studentIds = students.map((s: any) => s?.id).filter(Boolean);
    let activeIds = new Set<string>();
    if (studentIds.length) {
      const { data: activeRows, error: activeErr } = await db
        .from("black_followups")
        .select("student_id")
        .eq("status", "active")
        .in("student_id", studentIds);
      if (activeErr) return NextResponse.json({ error: activeErr.message }, { status: 500 });
      activeIds = new Set(
        (activeRows || [])
          .map((row: any) => row?.student_id)
          .filter(Boolean),
      );
    }
    const enriched = students.map((s: any) => ({
      ...s,
      hasActiveFollowup: Boolean(s?.id && activeIds.has(s.id)),
    }));
    return NextResponse.json({ students: enriched });
  }

  if (fetchAll) {
    const { data, error } = await db
      .from("black_followups")
      .select("*")
      .order("status", { ascending: true })
      .order("next_follow_up_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const withStudents = await attachStudents(db, Array.isArray(data) ? data : []);
    return NextResponse.json({ contacts: withStudents.map(mapRow) });
  }

  if (fetchNext) {
    const { data: activeStudents } = await db
      .from("black_followups")
      .select("student_id")
      .eq("status", "active")
        .not("student_id", "is", null);
      const excludeIds = new Set<string>(
        (activeStudents || [])
          .map((r: any) => r?.student_id)
          .filter(Boolean)
      );

      const { data: candidates, error: candErr } = await db
        .from("black_students")
        .select(
          "id, preferred_name, student_name, student_phone, parent_phone, student_email, parent_email, year_class, track, last_contacted_at, start_date",
        )
        .order("last_contacted_at", { ascending: true, nullsFirst: true })
        .order("start_date", { ascending: true })
        .limit(50);
      if (candErr) return NextResponse.json({ error: candErr.message }, { status: 500 });

      const candidate = (candidates || []).find((c: any) => {
        if (!c) return false;
        if (excludeIds.has(c.id)) return false;
        const phone = c.student_phone || c.parent_phone;
        return Boolean(phone);
      });
      if (!candidate) {
        return NextResponse.json({ error: "no_candidate" }, { status: 404 });
      }

      const phone = normalizePhone(candidate.student_phone || candidate.parent_phone);
      if (!phone) return NextResponse.json({ error: "missing_phone" }, { status: 400 });
      const noteParts = [];
      if (candidate.year_class) noteParts.push(`Classe: ${candidate.year_class}`);
      if (candidate.track) noteParts.push(`Percorso: ${candidate.track}`);
      if (candidate.student_email || candidate.parent_email) {
        noteParts.push(`Email: ${candidate.student_email || candidate.parent_email}`);
      }
      const note = noteParts.join(" • ");

      const payload = {
        student_id: candidate.id,
        full_name: candidate.preferred_name || candidate.student_name || null,
        whatsapp_phone: phone,
        note: note || null,
        status: "active",
        next_follow_up_at: dayStart.toISOString(),
      };

      const { data, error } = await db
        .from("black_followups")
        .insert(payload)
        .select("*")
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const [withStudent] = await attachStudents(db, data ? [data] : [], {
        [candidate.id]: candidate,
      });
      return NextResponse.json({ contact: mapRow(withStudent) });
    }

    const [
      { data: dueRows, error: dueErr },
      { data: upcomingRows, error: upcomingErr },
      completedPromise,
    ] = await Promise.all([
      db
        .from("black_followups")
        .select("*")
        .eq("status", "active")
        .lte("next_follow_up_at", dayEnd.toISOString())
        .order("next_follow_up_at", { ascending: true }),
      db
        .from("black_followups")
        .select("*")
        .eq("status", "active")
        .gt("next_follow_up_at", dayEnd.toISOString())
        .order("next_follow_up_at", { ascending: true })
        .limit(150),
      includeCompleted
        ? db
            .from("black_followups")
            .select("*")
            .eq("status", "completed")
            .order("updated_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const completedRows = "data" in completedPromise ? completedPromise.data : [];
    const completedErr = "error" in completedPromise ? (completedPromise as any).error : null;

    if (dueErr) return NextResponse.json({ error: dueErr.message }, { status: 500 });
    if (upcomingErr) return NextResponse.json({ error: upcomingErr.message }, { status: 500 });
    if (completedErr) return NextResponse.json({ error: completedErr.message }, { status: 500 });

    const [dueWithStudents, upcomingWithStudents, completedWithStudents] = await Promise.all([
      attachStudents(db, Array.isArray(dueRows) ? dueRows : []),
      attachStudents(db, Array.isArray(upcomingRows) ? upcomingRows : []),
      attachStudents(db, Array.isArray(completedRows) ? completedRows : []),
    ]);

    return NextResponse.json({
      date: dayStart.toISOString(),
      due: dueWithStudents.map(mapRow),
      upcoming: upcomingWithStudents.map(mapRow),
      completed: completedWithStudents.map(mapRow),
    });
  } catch (err: any) {
    console.error("[admin/black-followups] GET error", err);
    return NextResponse.json({ error: err?.message || "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : null;
  const note = typeof body.note === "string" ? body.note.trim() : null;
  const nextRaw = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
  let whatsappPhone = normalizePhone(body.whatsapp || body.whatsappPhone || body.phone);
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : null;
  let student: any = null;
  if (studentId) {
    const { data: activeRows, error: activeErr } = await db
      .from("black_followups")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .limit(1);
    if (activeErr) return NextResponse.json({ error: activeErr.message }, { status: 500 });
    if (activeRows && activeRows.length > 0) {
      return NextResponse.json(
        { error: "Studente già collegato a un follow-up attivo" },
        { status: 409 },
      );
    }
  }

  if (!whatsappPhone && studentId) {
    const { data, error: studErr } = await db
      .from("black_students")
      .select("student_phone, parent_phone, preferred_name, student_name, student_email, parent_email, year_class, track")
      .eq("id", studentId)
      .maybeSingle();
    if (studErr) return NextResponse.json({ error: studErr.message }, { status: 500 });
    student = data;
    whatsappPhone = normalizePhone(student?.student_phone || student?.parent_phone);
    if (!name && student) {
      const fallbackName = student.preferred_name || student.student_name || null;
      if (fallbackName) (body as any).name = fallbackName;
    }
    if (!note && student) {
      const parts = [];
      if (student.year_class) parts.push(`Classe: ${student.year_class}`);
      if (student.track) parts.push(`Percorso: ${student.track}`);
      if (student.student_email || student.parent_email) {
        parts.push(`Email: ${student.student_email || student.parent_email}`);
      }
      if (parts.length) (body as any).note = parts.join(" • ");
    }
  }

  if (!whatsappPhone) {
    return NextResponse.json({ error: "missing_whatsapp" }, { status: 400 });
  }

  const nextFollowUpAt = nextRaw && !Number.isNaN(nextRaw.getTime()) ? nextRaw : new Date();

  // Se l'admin sovrascrive nome/telefono mentre collega lo studente, aggiorna anche la scheda Black
  if (studentId) {
    const studentPatch: Record<string, any> = {};
    if (name) studentPatch.preferred_name = name;
    if (whatsappPhone) studentPatch.student_phone = whatsappPhone;
    if (Object.keys(studentPatch).length) {
      studentPatch.updated_at = new Date().toISOString();
      const { error: updateErr } = await db
        .from("black_students")
        .update(studentPatch)
        .eq("id", studentId);
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  const payload = {
    full_name: name,
    whatsapp_phone: whatsappPhone,
    note,
    student_id: studentId || null,
    status: "active",
    next_follow_up_at: nextFollowUpAt.toISOString(),
  };

  const { data, error } = await db
    .from("black_followups")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[admin/black-followups] insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [withStudent] = await attachStudents(db, data ? [data] : []);
  return NextResponse.json({ contact: mapRow(withStudent) });
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  if (action === "restart_lead_cycle") {
    const { data: existing, error: fetchErr } = await db
      .from("black_followups")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const now = new Date();
    const nextRaw = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    const nextFollowUp = nextRaw && !Number.isNaN(nextRaw.getTime()) ? nextRaw : addDays(now, DEFAULT_OFFSET_DAYS);
    const phone = normalizePhone(body.whatsapp || body.whatsappPhone || body.phone || existing.whatsapp_phone);
    if (!phone) return NextResponse.json({ error: "missing_phone" }, { status: 400 });
    const leadName =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : existing.full_name || null;
    const nextLeadFollowUp = computeLeadNextFollowUp(0, now);

    const leadPayload: Record<string, any> = {
      full_name: leadName,
      note: existing.note || null,
      instagram_handle: null,
      whatsapp_phone: phone,
      channel: "black",
      status: "active",
      current_step: 0,
      last_contacted_at: now.toISOString(),
      next_follow_up_at: nextLeadFollowUp ? nextLeadFollowUp.toISOString() : null,
      completed_at: null,
      updated_at: now.toISOString(),
    };

    const { data: existingLead } = await db
      .from("manual_leads")
      .select("*")
      .eq("whatsapp_phone", phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let leadRow: any | null = null;
    if (existingLead?.id) {
      const { data, error } = await db
        .from("manual_leads")
        .update(leadPayload)
        .eq("id", existingLead.id)
        .select("*")
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      leadRow = data;
    } else {
      leadPayload.created_at = now.toISOString();
      const { data, error } = await db.from("manual_leads").insert(leadPayload).select("*").maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      leadRow = data;
    }

    const { data: updatedFollowup, error: updateFollowErr } = await db
      .from("black_followups")
      .update({
        last_contacted_at: now.toISOString(),
        next_follow_up_at: nextFollowUp ? nextFollowUp.toISOString() : null,
        status: "active",
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (updateFollowErr) return NextResponse.json({ error: updateFollowErr.message }, { status: 500 });

    const [withStudent] = await attachStudents(db, updatedFollowup ? [updatedFollowup] : []);
    return NextResponse.json({ ok: true, leadId: leadRow?.id || null, contact: mapRow(withStudent) });
  }

  if (action === "advance") {
    const { data: existing, error: fetchErr } = await db
      .from("black_followups")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const now = new Date();
    const nextRaw = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    const nextFollowUpAt =
      nextRaw && !Number.isNaN(nextRaw.getTime()) ? nextRaw : addDays(now, DEFAULT_OFFSET_DAYS);

    const { data, error } = await db
      .from("black_followups")
      .update({
        last_contacted_at: now.toISOString(),
        next_follow_up_at: nextFollowUpAt.toISOString(),
        status: "active",
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (existing.student_id) {
      await db
        .from("black_students")
        .update({
          last_contacted_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", existing.student_id);
    }

    const [withStudent] = await attachStudents(db, data ? [data] : []);
    return NextResponse.json({ contact: mapRow(withStudent) });
  }

  const patch: Record<string, any> = {};
  const wantsNameUpdate = body.name !== undefined;
  const wantsPhoneUpdate =
    body.whatsapp !== undefined || body.whatsappPhone !== undefined || body.phone !== undefined;
  let nextName: string | null = null;
  let normalizedPhone: string | null | undefined;

  if (wantsNameUpdate) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Nome non valido" }, { status: 400 });
    }
    nextName = name;
    patch.full_name = nextName;
  }
  if (body.note !== undefined) {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    patch.note = note || null;
  }
  if (wantsPhoneUpdate) {
    normalizedPhone = normalizePhone(body.whatsapp || body.whatsappPhone || body.phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "missing_whatsapp" }, { status: 400 });
    }
    patch.whatsapp_phone = normalizedPhone;
  }
  if (body.nextFollowUpAt !== undefined) {
    const parsed = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    patch.next_follow_up_at = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
  }
  if (body.status) {
    const status = String(body.status).toLowerCase();
    if (["active", "completed", "dropped"].includes(status)) {
      patch.status = status;
    }
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  if (wantsNameUpdate || wantsPhoneUpdate) {
    const { data: existing, error: fetchErr } = await db
      .from("black_followups")
      .select("student_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    const studentId = existing?.student_id || null;
    if (studentId) {
      const studentPatch: Record<string, any> = {};
      const updatedAt = new Date().toISOString();
      if (wantsNameUpdate && nextName) {
        studentPatch.preferred_name = nextName;
        studentPatch.preferred_name_updated_at = updatedAt;
      }
      if (wantsPhoneUpdate) {
        studentPatch.student_phone = normalizedPhone;
        studentPatch.parent_phone = normalizedPhone;
      }
      if (Object.keys(studentPatch).length) {
        studentPatch.updated_at = updatedAt;
        const studentErr = await updateBlackStudentSafe(db, studentId, studentPatch, nextName);
        if (studentErr) {
          return NextResponse.json(
            { error: studentErr.message, details: studentErr.details, code: studentErr.code },
            { status: 500 }
          );
        }
      }
    }
  }

  const { data, error } = await db
    .from("black_followups")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [withStudent] = await attachStudents(db, data ? [data] : []);
  return NextResponse.json({ contact: mapRow(withStudent) });
}
