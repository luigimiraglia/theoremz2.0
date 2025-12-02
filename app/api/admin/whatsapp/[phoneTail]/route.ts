import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

type ConversationStatus = "bot" | "waiting_tutor" | "tutor";
type ConversationType = "black" | "prospect" | "genitore" | "insegnante" | "altro";

const ALLOWED_EMAIL = "luigi.miraglia006@gmail.com";
export const runtime = "nodejs";

function isAdminEmail(email?: string | null) {
  return Boolean(email && email.toLowerCase() === ALLOWED_EMAIL);
}

async function getAdminAuth() {
  try {
    const mod = await import("@/lib/firebaseAdmin");
    return mod.adminAuth;
  } catch (err) {
    console.error("[admin/whatsapp] firebase admin unavailable", err);
    return null;
  }
}

async function requireAdmin(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return null;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  const adminAuth = await getAdminAuth();
  if (!adminAuth) {
    return NextResponse.json({ error: "admin_auth_unavailable" }, { status: 503 });
  }
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
  try {
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
          "updated_at",
          "student_id",
          "black_students(id, user_id, status, readiness, risk_level, year_class, track, student_email, parent_email, student_phone, parent_phone, parent_name, goal, difficulty_focus, next_assessment_subject, next_assessment_date, ai_description, last_contacted_at, start_date, profiles:profiles!black_students_user_id_fkey(full_name, stripe_price_id))",
        ].join(",")
      )
      .eq("phone_tail", phoneTail)
      .maybeSingle();

    const [convoRes] = await Promise.all([convoQuery]);

    if (convoRes.error) {
      console.error("[admin/whatsapp] detail error", convoRes.error);
      return NextResponse.json({ error: convoRes.error.message }, { status: 500 });
    }
    const conversation = convoRes.data as any;
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Recupera tutti i messaggi legati alla conversazione, sia per phone_tail sia per student_id (se presente).
    const messagesQuery = db
      .from("black_whatsapp_messages")
      .select("id, role, content, created_at, meta, phone_tail, student_id")
      .order("created_at", { ascending: true });
    if (conversation.student_id) {
      messagesQuery.or(`phone_tail.eq.${phoneTail},student_id.eq.${conversation.student_id}`);
    } else {
      messagesQuery.eq("phone_tail", phoneTail);
    }
    const messagesRes = await messagesQuery;

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
        updatedAt: conversation.updated_at,
        studentId: conversation.student_id,
        student: student
          ? {
              id: student.id,
              userId: student.user_id,
              status: student.status,
              readiness: student.readiness,
              risk: student.risk_level,
              yearClass: student.year_class,
              track: student.track,
              startDate: student.start_date,
              studentEmail: student.student_email,
              parentEmail: student.parent_email,
              studentPhone: student.student_phone,
              parentPhone: student.parent_phone,
              parentName: student.parent_name,
              goal: student.goal,
              difficultyFocus: student.difficulty_focus,
              nextAssessmentSubject: student.next_assessment_subject,
              nextAssessmentDate: student.next_assessment_date,
              aiDescription: student.ai_description,
              lastContactedAt: student.last_contacted_at,
              name: profile?.full_name || null,
              stripePrice: profile?.stripe_price_id || null,
            }
          : null,
      },
      messages: messagesRes.data || [],
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("[admin/whatsapp] detail unexpected", err);
    return NextResponse.json(
      { error: "internal_error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ phoneTail: string }> }
) {
  try {
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
    const nextBot = typeof body.bot === "string" ? body.bot.trim() : undefined;
    const update = (body.update || null) as Record<string, any> | null;
    const linkEmail = typeof body.linkEmail === "string" ? body.linkEmail.trim() : "";

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

    if (linkEmail) {
      const normalizedPhone = normalizePhone(convo.phone_e164 || convo.phone_tail);
      if (!normalizedPhone) {
        return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
      }
      const { data: studentRow, error: studentErr } = await db
        .from("black_students")
        .select("id, student_phone, parent_phone")
        .or(`student_email.ilike.${linkEmail},parent_email.ilike.${linkEmail}`)
        .limit(1)
        .maybeSingle();
      if (studentErr) {
        console.error("[admin/whatsapp] student fetch error", studentErr);
        return NextResponse.json({ error: studentErr.message }, { status: 500 });
      }
      if (!studentRow?.id) {
        return NextResponse.json({ error: "student_not_found" }, { status: 404 });
      }
      const targetColumn = studentRow.student_phone ? "parent_phone" : "student_phone";
      const currentValue =
        studentRow[targetColumn as "student_phone" | "parent_phone"] || null;
      if (currentValue !== normalizedPhone) {
        const { error: updateStudentErr } = await db
          .from("black_students")
          .update({ [targetColumn]: normalizedPhone, updated_at: new Date().toISOString() })
          .eq("id", studentRow.id);
        if (updateStudentErr) {
          console.error("[admin/whatsapp] student phone link error", updateStudentErr);
          return NextResponse.json({ error: updateStudentErr.message }, { status: 500 });
        }
      }
      const convoUpdate: Record<string, any> = {
        student_id: studentRow.id,
        type: "black",
        bot: "black",
        updated_at: new Date().toISOString(),
      };
      const { error: convoUpdateErr } = await db
        .from("black_whatsapp_conversations")
        .update(convoUpdate)
        .eq("phone_tail", phoneTail);
      if (convoUpdateErr) {
        console.error("[admin/whatsapp] link convo update error", convoUpdateErr);
        return NextResponse.json({ error: convoUpdateErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, linked: true, studentId: studentRow.id });
    }

    if (update) {
      if (!convo.student_id) {
        return NextResponse.json({ error: "student_not_linked" }, { status: 400 });
      }
      const { data: studentRow, error: studentErr } = await db
        .from("black_students")
        .select("id, user_id")
        .eq("id", convo.student_id)
        .maybeSingle();
      if (studentErr) {
        console.error("[admin/whatsapp] student fetch error", studentErr);
        return NextResponse.json({ error: studentErr.message }, { status: 500 });
      }
      const normalize = (val: any) => {
        if (typeof val === "string") {
          const trimmed = val.trim();
          return trimmed.length ? trimmed : null;
        }
        return val ?? null;
      };
      const studentUpdate: Record<string, any> = {};
      if ("studentPhone" in update) studentUpdate.student_phone = normalize(update.studentPhone);
      if ("parentPhone" in update) studentUpdate.parent_phone = normalize(update.parentPhone);
      if ("studentEmail" in update) studentUpdate.student_email = normalize(update.studentEmail);
      if ("parentEmail" in update) studentUpdate.parent_email = normalize(update.parentEmail);
      if ("yearClass" in update) studentUpdate.year_class = normalize(update.yearClass);
      if ("track" in update) studentUpdate.track = normalize(update.track);
      if ("goal" in update) studentUpdate.goal = normalize(update.goal);
      if ("difficultyFocus" in update)
        studentUpdate.difficulty_focus = normalize(update.difficultyFocus);
      if ("nextAssessmentSubject" in update)
        studentUpdate.next_assessment_subject = normalize(update.nextAssessmentSubject);
      if ("nextAssessmentDate" in update)
        studentUpdate.next_assessment_date = normalize(update.nextAssessmentDate);

      if (Object.keys(studentUpdate).length) {
        const { error: updateStudentErr } = await db
          .from("black_students")
          .update(studentUpdate)
          .eq("id", convo.student_id);
        if (updateStudentErr) {
          console.error("[admin/whatsapp] student update error", updateStudentErr);
          return NextResponse.json({ error: updateStudentErr.message }, { status: 500 });
        }
      }

      if (update.name && studentRow?.user_id) {
        const fullName = normalize(update.name);
        if (fullName) {
          const { error: profileErr } = await db
            .from("profiles")
            .update({ full_name: fullName })
            .eq("id", studentRow.user_id);
          if (profileErr) {
            console.error("[admin/whatsapp] profile update error", profileErr);
          }
        }
      }

      return NextResponse.json({ ok: true, updated: true });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (nextStatus) updates.status = nextStatus;
    if (nextType) updates.type = nextType;
    if (nextBot !== undefined) updates.bot = nextBot || null;

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
  } catch (err: any) {
    console.error("[admin/whatsapp] update unexpected", err);
    return NextResponse.json(
      { error: "internal_error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}

const WHATSAPP_GRAPH_VERSION =
  process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v20.0";
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() || "";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN?.trim() || "";
const IT_PREFIX = "39";

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

function normalizePhone(raw: string | null | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith("00")) normalized = normalized.slice(2);
  if (normalized.startsWith("0") && normalized.length > 9) normalized = normalized.replace(/^0+/, "");
  if (!normalized.startsWith(IT_PREFIX) && normalized.length === 10) {
    normalized = `${IT_PREFIX}${normalized}`;
  }
  return `+${normalized}`;
}
