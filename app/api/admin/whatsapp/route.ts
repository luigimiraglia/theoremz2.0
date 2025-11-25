import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

type ConversationRow = {
  id?: string;
  phone_tail: string | null;
  phone_e164?: string | null;
  status?: string | null;
  type?: string | null;
  bot?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  followup_due_at?: string | null;
  followup_sent_at?: string | null;
  updated_at?: string | null;
  student_id?: string | null;
  black_students?: any;
};

const ALLOWED_EMAIL = "luigi.miraglia006@gmail.com";

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

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limitRaw = Number(searchParams.get("limit") || 30);
    const limit = Math.min(Math.max(limitRaw || 30, 1), 100);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "missing_supabase_config" },
        { status: 500 }
      );
    }

    const db = supabaseServer();
    let query = db
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
          "black_students(id, status, readiness, risk_level, year_class, track, student_email, parent_email, student_phone, parent_phone, start_date, profiles:profiles!black_students_user_id_fkey(full_name, stripe_price_id))",
        ].join(",")
      )
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (q) {
      query = query.or(
        `phone_tail.ilike.%${q}%,phone_e164.ilike.%${q}%,bot.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("[admin/whatsapp] list error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(data) ? (data as any[]) : [];
    const conversations = rows
      .filter((row) => row && typeof row === "object" && !row.error)
      .map((row: ConversationRow) => {
        const student = (row as any).black_students;
        const profile =
          student?.profiles && Array.isArray(student.profiles)
            ? student.profiles[0]
            : student?.profiles;
        return {
          id: row.id,
          phoneTail: row.phone_tail,
          phone: row.phone_e164,
          status: row.status,
          type: row.type,
          bot: row.bot,
          lastMessageAt: row.last_message_at,
          lastMessagePreview: row.last_message_preview,
          updatedAt: row.updated_at,
          followupDueAt: row.followup_due_at,
          followupSentAt: row.followup_sent_at,
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
        };
      });

    return NextResponse.json({ conversations });
  } catch (err: any) {
    console.error("[admin/whatsapp] unexpected error", err);
    return NextResponse.json(
      { error: "internal_error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
