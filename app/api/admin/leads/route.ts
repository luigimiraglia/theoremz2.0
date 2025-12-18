import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";
const FOLLOWUP_STEPS_DAYS = [1, 2, 7, 30];

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
    console.error("[admin/leads] auth error", error);
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

function computeNextFollowUp(stepIndex: number, from: Date) {
  const offset = FOLLOWUP_STEPS_DAYS[stepIndex];
  if (offset === undefined) return null;
  return addDays(from, offset);
}

function normalizeHandle(raw?: string | null) {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^@+/, "");
  return cleaned || null;
}

function normalizePhone(raw?: string | null) {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "").trim(); // tolerate spaces inside
  const digits = compact.replace(/\D/g, "");
  if (!digits) return null;
  if (compact.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00") && digits.length > 2) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

function mapLead(row: any) {
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.full_name || null,
    instagramHandle: row.instagram_handle || null,
    whatsappPhone: row.whatsapp_phone || null,
    note: row.note || null,
    channel: row.channel || (row.instagram_handle ? "instagram" : "whatsapp"),
    status: row.status || "active",
    currentStep: typeof row.current_step === "number" ? row.current_step : 0,
    nextFollowUpAt: row.next_follow_up_at || null,
    lastContactedAt: row.last_contacted_at || null,
    completedAt: row.completed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const includeCompleted = searchParams.get("includeCompleted") === "1";
  const limitRaw = Number(searchParams.get("limit") || 150);
  const limit = Math.max(1, Math.min(500, limitRaw));
  const fetchAll = searchParams.get("all") === "1";

  const parsedDay = dateParam ? new Date(dateParam) : new Date();
  const referenceDay = Number.isNaN(parsedDay.getTime()) ? new Date() : parsedDay;
  const dayStart = startOfDay(referenceDay);
  const dayEnd = addDays(dayStart, 1);

  if (fetchAll) {
    const { data, error } = await db
      .from("manual_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[admin/leads] all fetch error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ all: Array.isArray(data) ? data.map(mapLead) : [] });
  }

  const [
    { data: dueRows, error: dueErr },
    { data: upcomingRows, error: upcomingErr },
    completedPromise,
  ] = await Promise.all([
    db
      .from("manual_leads")
      .select("*")
      .eq("status", "active")
      .lte("next_follow_up_at", dayEnd.toISOString())
      .order("next_follow_up_at", { ascending: true }),
    db
      .from("manual_leads")
      .select("*")
      .eq("status", "active")
      .gt("next_follow_up_at", dayEnd.toISOString())
      .order("next_follow_up_at", { ascending: true })
      .limit(limit),
    includeCompleted
      ? db
          .from("manual_leads")
          .select("*")
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const completedRows = "data" in completedPromise ? completedPromise.data : [];
  const completedErr = "error" in completedPromise ? (completedPromise as any).error : null;

  if (dueErr) {
    console.error("[admin/leads] due fetch error", dueErr);
    return NextResponse.json({ error: dueErr.message }, { status: 500 });
  }
  if (upcomingErr) {
    console.error("[admin/leads] upcoming fetch error", upcomingErr);
    return NextResponse.json({ error: upcomingErr.message }, { status: 500 });
  }
  if (completedErr) {
    console.error("[admin/leads] completed fetch error", completedErr);
    return NextResponse.json({ error: completedErr.message }, { status: 500 });
  }

  return NextResponse.json({
    date: dayStart.toISOString(),
    due: Array.isArray(dueRows) ? dueRows.map(mapLead) : [],
    upcoming: Array.isArray(upcomingRows) ? upcomingRows.map(mapLead) : [],
    completed: Array.isArray(completedRows) ? completedRows.map(mapLead) : [],
  });
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
  const instagramHandle = normalizeHandle(body.instagram || body.instagramHandle || body.handle);
  const whatsappPhone = normalizePhone(body.whatsapp || body.whatsappPhone || body.phone);

  if (!instagramHandle && !whatsappPhone) {
    return NextResponse.json({ error: "contact_missing" }, { status: 400 });
  }

  const channel = instagramHandle ? "instagram" : "whatsapp";
  const now = new Date();
  const nextFollowUp = computeNextFollowUp(0, now);

  const payload = {
    full_name: name,
    note,
    instagram_handle: instagramHandle,
    whatsapp_phone: whatsappPhone,
    channel,
    status: "active",
    current_step: 0,
    next_follow_up_at: nextFollowUp ? nextFollowUp.toISOString() : null,
  };

  const { data, error } = await db.from("manual_leads").insert(payload).select("*").maybeSingle();
  if (error) {
    console.error("[admin/leads] insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: mapLead(data) });
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

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  if (action === "advance") {
    const { data: existing, error: fetchErr } = await db
      .from("manual_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) {
      console.error("[admin/leads] advance fetch error", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (existing.status === "completed") {
      return NextResponse.json({ error: "already_completed" }, { status: 400 });
    }
    const now = new Date();
    const nextStep = Math.min(
      Number(existing.current_step ?? 0) + 1,
      FOLLOWUP_STEPS_DAYS.length
    );
    const nextFollowUp = computeNextFollowUp(nextStep, now);
    const updatePayload: Record<string, any> = {
      current_step: nextStep,
      last_contacted_at: now.toISOString(),
      next_follow_up_at: nextFollowUp ? nextFollowUp.toISOString() : null,
      status: nextFollowUp ? "active" : "completed",
    };
    if (!nextFollowUp) {
      updatePayload.completed_at = now.toISOString();
    }

    const { data, error } = await db
      .from("manual_leads")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[admin/leads] advance update error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ lead: mapLead(data) });
  }

  if (action === "restart") {
    const { data: existing, error: fetchErr } = await db
      .from("manual_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) {
      console.error("[admin/leads] restart fetch error", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const now = new Date();
    const nextFollowUp = computeNextFollowUp(0, now);
    const updatePayload: Record<string, any> = {
      current_step: 0,
      status: "active",
      last_contacted_at: now.toISOString(),
      next_follow_up_at: nextFollowUp ? nextFollowUp.toISOString() : null,
      completed_at: null,
    };
    const { data, error } = await db
      .from("manual_leads")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[admin/leads] restart update error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ lead: mapLead(data) });
  }

  const patch: Record<string, any> = {};
  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    patch.full_name = name || null;
  }
  if (body.note !== undefined) {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    patch.note = note || null;
  }
  if (body.instagram !== undefined || body.instagramHandle !== undefined || body.handle !== undefined) {
    patch.instagram_handle = normalizeHandle(body.instagram || body.instagramHandle || body.handle);
  }
  if (body.whatsapp !== undefined || body.whatsappPhone !== undefined || body.phone !== undefined) {
    patch.whatsapp_phone = normalizePhone(body.whatsapp || body.whatsappPhone || body.phone);
  }
  if (body.nextFollowUpAt !== undefined) {
    const parsed = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    patch.next_follow_up_at = parsed ? parsed.toISOString() : null;
  }
  if (body.status) {
    const status = String(body.status).toLowerCase();
    if (["active", "completed", "dropped"].includes(status)) {
      patch.status = status;
      if (status === "completed") {
        patch.completed_at = new Date().toISOString();
      }
    }
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("manual_leads")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[admin/leads] generic update error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: mapLead(data) });
}
