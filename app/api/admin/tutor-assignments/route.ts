import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const isAdminEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase() === ADMIN_EMAIL);

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded?.email || !isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (err) {
    console.error("[admin/tutor-assignments] auth error", err);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

function normalizePhoneTail(input?: string | null) {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "");
  return digits.slice(-10);
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const db = supabaseServer();
    if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const tutorId = String(body.tutorId || "").trim();
    const studentId = String(body.studentId || "").trim();
    const studentEmailRaw = String(body.studentEmail || "").trim();
    const studentEmail = studentEmailRaw.toLowerCase();
    const studentPhone = normalizePhoneTail(body.studentPhone || body.phone || "");
    const studentName = String(body.studentName || "").trim();
    if (!tutorId) return NextResponse.json({ error: "tutorId mancante" }, { status: 400 });
    if (!studentId && !studentEmail && !studentPhone) {
      return NextResponse.json({ error: "Inserisci email, telefono o ID studente" }, { status: 400 });
    }

    const { data: tutor, error: tutorErr } = await db
      .from("tutors")
      .select("id, full_name, display_name, email")
      .eq("id", tutorId)
      .maybeSingle();
    if (tutorErr) return NextResponse.json({ error: tutorErr.message }, { status: 500 });
    if (!tutor) return NextResponse.json({ error: "Tutor non trovato" }, { status: 404 });
    const tutorEmail = (tutor.email || "").trim();
    if (!tutorEmail) {
      return NextResponse.json(
        { error: "Aggiungi un'email al tutor per collegare le assegnazioni al suo account." },
        { status: 400 },
      );
    }

    let student: any = null;
    if (studentId) {
      const { data, error } = await db.from("black_students").select("id, student_email, parent_email").eq("id", studentId).maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      student = data;
    }

    if (!student && studentEmail) {
      const { data, error } = await db
        .from("black_students")
        .select("id, student_email, parent_email")
        .or(`student_email.ilike.${studentEmail},parent_email.ilike.${studentEmail}`)
        .limit(1)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      student = data;
    }

    let linkedProfile: { id: string } | null = null;
    if (!student && studentEmail) {
      // Cerca via profilo se esiste un account collegato (anche non Black)
      const { data: profile, error: profileErr } = await db
        .from("profiles")
        .select("id")
        .eq("email", studentEmail)
        .maybeSingle();
      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });
      linkedProfile = profile || null;
      if (profile?.id) {
        const { data: bs, error: bsErr } = await db
          .from("black_students")
          .select("id, student_email, parent_email")
          .eq("user_id", profile.id)
          .limit(1)
          .maybeSingle();
        if (bsErr) return NextResponse.json({ error: bsErr.message }, { status: 500 });
        student = bs;
      }
    }

    if (!student && studentPhone) {
      const { data, error } = await db
        .from("black_students")
        .select("id, student_email, parent_email, student_phone, parent_phone")
        .or(`student_phone.ilike.%${studentPhone},parent_phone.ilike.%${studentPhone}`)
        .limit(1)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      student = data;
    }

    if (!student && (studentEmail || studentPhone)) {
      let profileId = linkedProfile?.id || null;
      if (!profileId) {
        const fallbackEmail =
          studentEmailRaw ||
          studentEmail ||
          (studentPhone ? `${studentPhone}@autogen.tz` : `autogen-${Date.now()}@autogen.tz`);
        const profilePayload = {
          id: randomUUID(),
          email: fallbackEmail.toLowerCase(),
          full_name: studentName || fallbackEmail.split("@")[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error: profileErr } = await db.from("profiles").insert(profilePayload);
        if (profileErr) {
          return NextResponse.json({ error: profileErr.message }, { status: 500 });
        }
        profileId = profilePayload.id;
      }

      const insertPayload: Record<string, any> = {
        user_id: profileId,
        student_email: studentEmailRaw || studentEmail || null,
        parent_email: studentEmailRaw || studentEmail || null,
        student_phone: studentPhone || null,
        parent_phone: studentPhone || null,
        preferred_name: studentName || null,
        status: "active",
        start_date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error: createErr } = await db
        .from("black_students")
        .insert(insertPayload)
        .select("id, student_email, parent_email")
        .maybeSingle();
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      student = created;
    }

    if (!student) {
      return NextResponse.json({ error: "Studente non trovato" }, { status: 404 });
    }

    const { error: assignErr } = await db
      .from("tutor_assignments")
      .upsert(
        {
          tutor_id: tutorId,
          student_id: student.id,
          role: (body.role as string) || "videolezione",
          },
        { onConflict: "tutor_id,student_id" }
      );
    if (assignErr) return NextResponse.json({ error: assignErr.message }, { status: 500 });

    const { error: updateErr } = await db
      .from("black_students")
      .update({
        videolesson_tutor_id: tutorId,
        updated_at: new Date().toISOString(),
        ...(studentName ? { preferred_name: studentName } : {}),
      })
      .eq("id", student.id);
    if (updateErr) {
      console.warn("[admin/tutor-assignments] videolesson_tutor_id update failed", updateErr);
    }

    return NextResponse.json({
      ok: true,
      tutorId,
      tutorName: tutor.display_name || tutor.full_name || tutor.email || "Tutor",
      studentId: student.id,
    });
  } catch (err: any) {
    console.error("[admin/tutor-assignments] unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore assegnazione tutor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const db = supabaseServer();
    if (!db) return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const tutorId = String(body.tutorId || "").trim();
    const studentId = String(body.studentId || "").trim();
    const hourlyRateRaw = body.hourlyRate;
    const baselineRaw = body.consumedBaseline ?? body.baseline;
    if (!tutorId || !studentId) {
      return NextResponse.json({ error: "tutorId e studentId obbligatori" }, { status: 400 });
    }
    if (hourlyRateRaw === undefined && baselineRaw === undefined && body.role === undefined) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }

    const patch: Record<string, any> = {
      tutor_id: tutorId,
      student_id: studentId,
    };
    if (hourlyRateRaw !== undefined) {
      const hr = Number(hourlyRateRaw);
      if (!Number.isFinite(hr)) {
        return NextResponse.json({ error: "hourlyRate non valido" }, { status: 400 });
      }
      patch.hourly_rate = hr;
    }
    if (baselineRaw !== undefined) {
      const base = Number(baselineRaw);
      if (!Number.isFinite(base) || base < 0) {
        return NextResponse.json({ error: "baseline non valida" }, { status: 400 });
      }
      patch.consumed_baseline = base;
    }
    if (body.role) {
      patch.role = String(body.role);
    }

    const { data, error } = await db
      .from("tutor_assignments")
      .upsert(patch, { onConflict: "tutor_id,student_id" })
      .select("tutor_id, student_id, hourly_rate, consumed_baseline, role")
      .limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      assignment: data?.[0]
        ? {
            tutorId: data[0].tutor_id,
            studentId: data[0].student_id,
            hourlyRate: data[0].hourly_rate,
            consumedBaseline: data[0].consumed_baseline,
            role: data[0].role,
          }
        : null,
    });
  } catch (err: any) {
    console.error("[admin/tutor-assignments] patch unexpected", err);
    return NextResponse.json({ error: err?.message || "Errore aggiornamento assegnazione" }, { status: 500 });
  }
}
