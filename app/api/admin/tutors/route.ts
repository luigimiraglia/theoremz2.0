import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function getViewer(request: Request) {
  if (process.env.NODE_ENV === "development") {
    return { isAdmin: true, email: null };
  }
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase() || null;
    if (!email || !isAdminEmail(email)) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    return { isAdmin: true, email };
  } catch (err) {
    console.error("[admin/tutors] auth error", err);
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
}

export async function GET(request: Request) {
  const auth = await getViewer(request);
  if ("error" in auth) return auth.error;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

  const [
    { data: tutorRows, error: tutorErr },
    { data: directStudents, error: directErr },
    { data: assignedStudents, error: assignedErr },
    { data: assignmentRates, error: assignmentErr },
  ] = await Promise.all([
    db.from("tutors").select("id, display_name, full_name, email, phone, notes, hours_due").order("display_name", { ascending: true }),
    db
      .from("black_students")
      .select(
        "id, preferred_name, student_email, parent_email, student_phone, parent_phone, hours_paid, hours_consumed, status, videolesson_tutor_id",
      )
      .not("videolesson_tutor_id", "is", null),
    db
      .from("tutor_assignments")
      .select(
        "tutor_id, student:black_students!inner(id, preferred_name, student_email, parent_email, student_phone, parent_phone, hours_paid, hours_consumed, status)",
      ),
    db.from("tutor_assignments").select("tutor_id, student_id, hourly_rate, consumed_baseline"),
  ]);

  if (tutorErr) return NextResponse.json({ error: tutorErr.message }, { status: 500 });
  if (directErr) return NextResponse.json({ error: directErr.message }, { status: 500 });
  if (assignedErr) return NextResponse.json({ error: assignedErr.message }, { status: 500 });
  if (assignmentErr) return NextResponse.json({ error: assignmentErr.message }, { status: 500 });

  const rateMap = new Map<string, number | null>();
  const baselineMap = new Map<string, number | null>();
  (assignmentRates || []).forEach((row: any) => {
    if (!row?.tutor_id || !row?.student_id) return;
    const key = `${row.tutor_id}__${row.student_id}`;
    rateMap.set(key, row.hourly_rate != null ? Number(row.hourly_rate) : null);
    baselineMap.set(key, row.consumed_baseline != null ? Number(row.consumed_baseline) : 0);
  });

  const studentsByTutor = new Map<string, any[]>();
  const addStudent = (tutorId?: string | null, raw?: any) => {
    if (!tutorId || !raw) return;
    const hoursPaid = Number(raw.hours_paid ?? 0);
    const hoursConsumed = Number(raw.hours_consumed ?? 0);
    const baseline = baselineMap.get(`${tutorId}__${raw.id}`) ?? 0;
    const remainingPaid = Math.max(0, hoursPaid, hoursPaid - hoursConsumed);
    const name =
      raw.preferred_name ||
      raw.student_email ||
      raw.parent_email ||
      "Studente";
    const hourlyRate = rateMap.get(`${tutorId}__${raw.id}`) ?? null;
    const chargeableHours = Math.max(0, hoursConsumed - baseline);
    const student = {
      id: raw.id as string,
      name,
      email: raw.student_email || raw.parent_email || null,
      phone: raw.student_phone || raw.parent_phone || null,
      hoursPaid,
      hoursConsumed,
      remainingPaid,
      hourlyRate,
      consumedBaseline: baseline,
      chargeableHours,
      isBlack: typeof raw.status === "string" ? raw.status.toLowerCase() !== "inactive" : true,
    };
    const list = studentsByTutor.get(tutorId) || [];
    if (!list.find((s) => s.id === student.id)) {
      list.push(student);
      studentsByTutor.set(tutorId, list);
    }
  };

  (directStudents || []).forEach((s: any) => addStudent(s.videolesson_tutor_id, s));
  (assignedStudents || []).forEach((row: any) => addStudent(row.tutor_id, row.student));

  const tutors = (tutorRows || []).map((t: any) => ({
    id: t.id,
    display_name: t.display_name || t.full_name || t.email || "Tutor",
    full_name: t.full_name || t.display_name || t.email || "Tutor",
    email: t.email || null,
    phone: t.phone || null,
    notes: t.notes || null,
    hoursDue: Number(t.hours_due ?? 0),
    students: (studentsByTutor.get(t.id) || []).sort((a, b) => (a.name || "").localeCompare(b.name || "")),
  }));
  return NextResponse.json({ tutors });
}

export async function POST(request: Request) {
  const auth = await getViewer(request);
  if ("error" in auth) return auth.error;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.displayName || body.fullName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!name) {
    return NextResponse.json({ error: "displayName obbligatorio" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email obbligatoria per collegare l'account tutor" }, { status: 400 });
  }
  const payload: Record<string, any> = {
    display_name: name || email,
    full_name: name || email,
    email: email || null,
  };
  if (body.phone) payload.phone = String(body.phone).trim();
  if (body.notes || body.bio) payload.notes = String(body.notes || body.bio).trim();
  const { data, error } = await db
    .from("tutors")
    .insert(payload)
    .select("id, display_name, full_name, email, phone, notes, hours_due")
    .limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tutor = data?.[0]
    ? {
        ...data[0],
        display_name: data[0].display_name || data[0].full_name || data[0].email || "Tutor",
        full_name: data[0].full_name || data[0].display_name || data[0].email || "Tutor",
        hoursDue: Number(data[0].hours_due ?? 0),
      }
    : null;
  return NextResponse.json({ tutor });
}

export async function PATCH(request: Request) {
  const auth = await getViewer(request);
  if ("error" in auth) return auth.error;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  const displayName = String(body.displayName || "").trim();
  const fullName = String(body.fullName || "").trim();
  const emailRaw = body.email;
  const phoneRaw = body.phone;
  const notesRaw = body.notes ?? body.bio;
  const email = emailRaw !== undefined ? String(emailRaw || "").trim().toLowerCase() : undefined;
  const phone = phoneRaw !== undefined ? String(phoneRaw || "").trim() : undefined;
  const notes = notesRaw !== undefined ? String(notesRaw || "").trim() : undefined;
  const hoursDueRaw = body.hoursDue ?? body.hours_due;
  if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });

  const patch: Record<string, any> = {};
  if (displayName) patch.display_name = displayName;
  if (fullName) patch.full_name = fullName;
  if (email !== undefined) patch.email = email || null;
  if (phone !== undefined) patch.phone = phone || null;
  if (notes !== undefined) patch.notes = notes || null;
  if (hoursDueRaw !== undefined && hoursDueRaw !== null && hoursDueRaw !== "") {
    const hoursDue = Number(hoursDueRaw);
    if (!Number.isFinite(hoursDue)) {
      return NextResponse.json({ error: "hoursDue non valido" }, { status: 400 });
    }
    patch.hours_due = hoursDue;
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("tutors")
    .update(patch)
    .eq("id", id)
    .select(
      "id, display_name, full_name, email, phone, notes, hours_due"
    )
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const tutor = data
    ? {
        ...data,
        display_name: data.display_name || data.full_name || data.email || "Tutor",
        full_name: data.full_name || data.display_name || data.email || "Tutor",
        hoursDue: Number(data.hours_due ?? 0),
      }
    : null;
  return NextResponse.json({ tutor });
}

export async function DELETE(request: Request) {
  const auth = await getViewer(request);
  if ("error" in auth) return auth.error;

  const db = supabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "ID mancante" }, { status: 400 });
  const { error } = await db.from("tutors").delete().eq("id", id);
  if (error) {
    const isFk = error.code === "23503" || (error.message || "").includes("foreign key");
    const detail = isFk
      ? "Impossibile eliminare: tutor collegato ad altri record (es. studenti o booking)."
      : error.message;
    const status = isFk ? 409 : 500;
    return NextResponse.json({ error: detail }, { status });
  }
  return NextResponse.json({ ok: true });
}
