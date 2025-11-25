import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { adminAuth } from "@/lib/firebaseAdmin";

type ConversationStatus = "bot" | "waiting_tutor" | "tutor";
type ConversationType = "black" | "prospect" | "genitore" | "insegnante" | "altro";

const ALLOWED_EMAIL = "luigi.miraglia006@gmail.com";

function isAdminEmail(email?: string | null) {
  return Boolean(email && email.toLowerCase() === ALLOWED_EMAIL);
}

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!isAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("[admin/whatsapp] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ phoneTail: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { phoneTail } = await ctx.params;
  if (!phoneTail) {
    return NextResponse.json({ error: "missing_phone_tail" }, { status: 400 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "missing_supabase_config" },
      { status: 500 }
    );
  }

  const db = supabaseServer();
  const convoQuery = db
    .from("black_whatsapp_conversations")
    .select(
      [
        "id",
        "phone_tail",
        "phone_e164",
        "status",
        "type",
        "bot",
        "last_message_at",
        "last_message_preview",
        "followup_due_at",
        "followup_sent_at",
        "updated_at",
        "student_id",
        "black_students(id, status, plan_label, readiness, risk_level, year_class, track, student_email, parent_email, student_phone, parent_phone, start_date, profiles:profiles!black_students_user_id_fkey(full_name, stripe_price_id))",
      ].join(",")
    )
    .eq("phone_tail", phoneTail)
    .maybeSingle();

  const messagesQuery = db
    .from("black_whatsapp_messages")
    .select("id, role, content, created_at")
    .eq("phone_tail", phoneTail)
    .order("created_at", { ascending: true })
    .limit(80);

  const [convoRes, messagesRes] = await Promise.all([convoQuery, messagesQuery]);

  if (convoRes.error) {
    console.error("[admin/whatsapp] detail error", convoRes.error);
    return NextResponse.json({ error: convoRes.error.message }, { status: 500 });
  }
  const conversation = convoRes.data as any;
  if (!conversation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const student = conversation.black_students;
  const profile =
    student?.profiles && Array.isArray(student.profiles)
      ? student.profiles[0]
      : student?.profiles;

  const payload = {
    conversation: {
      id: conversation.id,
      phoneTail: conversation.phone_tail,
      phone: conversation.phone_e164,
      status: conversation.status,
      type: conversation.type,
      bot: conversation.bot,
      lastMessageAt: conversation.last_message_at,
      lastMessagePreview: conversation.last_message_preview,
      followupDueAt: conversation.followup_due_at,
      followupSentAt: conversation.followup_sent_at,
      updatedAt: conversation.updated_at,
      studentId: conversation.student_id,
      student: student
        ? {
            id: student.id,
            status: student.status,
            planLabel: student.plan_label,
            readiness: student.readiness,
            risk: student.risk_level,
            yearClass: student.year_class,
            track: student.track,
            startDate: student.start_date,
            studentEmail: student.student_email,
            parentEmail: student.parent_email,
            studentPhone: student.student_phone,
            parentPhone: student.parent_phone,
            name: profile?.full_name || null,
            stripePrice: profile?.stripe_price_id || null,
          }
        : null,
    },
    messages: messagesRes.data || [],
  };

  return NextResponse.json(payload);
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ phoneTail: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { phoneTail } = await ctx.params;
  if (!phoneTail) {
    return NextResponse.json({ error: "missing_phone_tail" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const nextStatus = body.status as ConversationStatus | undefined;
  const nextType = body.type as ConversationType | undefined;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "missing_supabase_config" },
      { status: 500 }
    );
  }
  const db = supabaseServer();

  const { data: convo, error: convoError } = await db
    .from("black_whatsapp_conversations")
    .select("id, phone_tail, phone_e164, status, type, student_id")
    .eq("phone_tail", phoneTail)
    .maybeSingle();
  if (convoError) {
    console.error("[admin/whatsapp] fetch conversation error", convoError);
    return NextResponse.json({ error: convoError.message }, { status: 500 });
  }
  if (!convo) {
    return NextResponse.json({ error: "conversation_not_found" }, { status: 404 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (nextStatus) updates.status = nextStatus;
  if (nextType) updates.type = nextType;

  if (message) {
    if (!convo.phone_e164) {
      return NextResponse.json({ error: "missing_phone" }, { status: 400 });
    }
    const sendResult = await sendWhatsAppText(convo.phone_e164, message);
    if (!sendResult.ok) {
      return NextResponse.json(
        { error: sendResult.error || "send_failed" },
        { status: 502 }
      );
    }
    updates.last_message_at = updates.updated_at;
    updates.last_message_preview = message.slice(0, 200);
    updates.status = nextStatus || "tutor";

    await db.from("black_whatsapp_messages").insert({
      student_id: convo.student_id || null,
      phone_tail: phoneTail,
      role: "assistant",
      content: message,
      meta: { source: "admin_console" },
    });
  }

  if (Object.keys(updates).length > 1) {
    const { error: updateError } = await db
      .from("black_whatsapp_conversations")
      .update(updates)
      .eq("phone_tail", phoneTail);
    if (updateError) {
      console.error("[admin/whatsapp] update error", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

const WHATSAPP_GRAPH_VERSION =
  process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() || "";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN?.trim() || "";

async function sendWhatsAppText(to: string, body: string) {
  if (!META_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn("[admin/whatsapp] missing WhatsApp config");
    return { ok: false, error: "missing_whatsapp_config" as const };
  }
  const endpoint = `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || (data && (data as any).error)) {
      console.error("[admin/whatsapp] send failed", { status: res.status, body: data });
      return {
        ok: false,
        error: (data as any)?.error?.message || `status_${res.status}`,
      };
    }
    return { ok: true };
  } catch (error: any) {
    console.error("[admin/whatsapp] send error", error);
    return { ok: false, error: error?.message || "unknown_error" };
  }
}
