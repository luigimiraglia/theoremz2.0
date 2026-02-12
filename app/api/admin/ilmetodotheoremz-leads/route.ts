import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { addRomeDays, formatRomeYmd, romeDateToUtc, ROME_TZ } from "@/lib/rome-time";

const ADMIN_EMAIL = "luigi.miraglia006@gmail.com";

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
    console.error("[admin/ilmetodotheoremz-leads] auth error", error);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

type MetodoLeadRow = {
  id: string;
  created_at: string | null;
  full_name: string | null;
  email: string | null;
  phone_prefix: string | null;
  phone: string | null;
  page_url: string | null;
  source: string | null;
  response_status: string | null;
  responded_at: string | null;
  no_response_at: string | null;
  paused_at: string | null;
  updated_at: string | null;
};

type ManualLeadRow = {
  id: string;
  created_at: string | null;
  full_name: string | null;
  whatsapp_phone: string | null;
  note: string | null;
  channel?: string | null;
  status: string | null;
  response_status: string | null;
  responded_at: string | null;
  no_response_at: string | null;
  paused_at: string | null;
  updated_at: string | null;
};

type ChurnedStudentRow = {
  id: string;
  preferred_name: string | null;
  student_name: string | null;
  student_email: string | null;
  parent_email: string | null;
  student_phone: string | null;
  parent_phone: string | null;
  year_class: string | null;
  track: string | null;
  status: string | null;
  response_status?: string | null;
  responded_at?: string | null;
  no_response_at?: string | null;
  paused_at?: string | null;
  updated_at: string | null;
};

function normalizePhone(raw?: string | null) {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "").trim();
  const digits = compact.replace(/\D/g, "");
  if (!digits) return null;
  if (compact.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00") && digits.length > 2) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number) {
  const arr = [...items];
  const rand = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const ACTIVE_SUB_STATUSES = ["active", "trialing", "past_due", "unpaid"];
const ACTIVE_SUB_STATUS_FILTER = `(${ACTIVE_SUB_STATUSES.map((s) => `"${s}"`).join(",")})`;

function formatTimelineLabel(ymd: string) {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("it-IT", { timeZone: ROME_TZ, weekday: "short", day: "2-digit" });
}

function addContactCount(map: Map<string, number>, iso?: string | null) {
  if (!iso) return;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return;
  const ymd = formatRomeYmd(d);
  if (!map.has(ymd)) return;
  map.set(ymd, (map.get(ymd) || 0) + 1);
}

function mapMetodoLead(row: MetodoLeadRow) {
  return {
    id: row.id,
    fullName: row.full_name || null,
    email: row.email || null,
    phonePrefix: row.phone_prefix || null,
    phone: row.phone || null,
    pageUrl: row.page_url || null,
    source: row.source || "ilmetodotheoremz",
    responseStatus: row.response_status || "pending",
    respondedAt: row.responded_at || null,
    noResponseAt: row.no_response_at || null,
    pausedAt: row.paused_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapManualLead(row: ManualLeadRow) {
  return {
    id: row.id,
    fullName: row.full_name || null,
    email: null,
    phonePrefix: null,
    phone: row.whatsapp_phone || null,
    pageUrl: null,
    note: row.note || null,
    source: "whatsapp",
    responseStatus: row.response_status || "pending",
    respondedAt: row.responded_at || null,
    noResponseAt: row.no_response_at || null,
    pausedAt: row.paused_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapChurnedLead(row: ChurnedStudentRow) {
  const phone = normalizePhone(row.student_phone || row.parent_phone);
  const name = row.preferred_name || row.student_name || null;
  const email = row.student_email || row.parent_email || null;
  const extra = [row.year_class, row.track].filter(Boolean).join(" - ");
  const note = extra ? `Disdetta Black - ${extra}` : "Disdetta Black";
  return {
    id: row.id,
    fullName: name,
    email,
    phonePrefix: null,
    phone,
    pageUrl: null,
    note,
    source: "black",
    responseStatus: row.response_status || "pending",
    respondedAt: row.responded_at || null,
    noResponseAt: row.no_response_at || null,
    pausedAt: row.paused_at || null,
    createdAt: row.updated_at || null,
    updatedAt: row.updated_at || null,
  };
}

function dedupeByPhone<T extends { phone?: string | null; id: string; source?: string | null }>(
  items: T[],
) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.phone ? normalizePhone(item.phone) : null;
    const fallback = `${item.source || "lead"}:${item.id}`;
    const uniqueKey = key || fallback;
    if (seen.has(uniqueKey)) return false;
    seen.add(uniqueKey);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const db = supabaseServer();
  const dailyYmd = formatRomeYmd();
  const startYmd = addRomeDays(dailyYmd, -7);
  const tomorrowYmd = addRomeDays(dailyYmd, 1);
  const endYmd = addRomeDays(dailyYmd, 2);
  const startIso = romeDateToUtc(startYmd).toISOString();
  const endIso = romeDateToUtc(endYmd).toISOString();
  const streakDays = Array.from({ length: 9 }, (_, i) => addRomeDays(startYmd, i)).map((ymd) => ({
    ymd,
    label: formatTimelineLabel(ymd),
    isToday: ymd === dailyYmd,
    isTomorrow: ymd === tomorrowYmd,
  }));
  const streakMap = new Map(streakDays.map((day) => [day.ymd, 0]));
  const { data, error } = await db
    .from("ilmetodotheoremz_leads")
    .select(
      "id, created_at, full_name, email, phone_prefix, phone, page_url, source, response_status, responded_at, no_response_at, paused_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[admin/ilmetodotheoremz-leads] fetch error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads = (data || []).map((row) => mapMetodoLead(row as MetodoLeadRow));

  const { data: churnedRows, error: churnedErr } = await db
    .from("black_students")
    .select(
      "id, preferred_name, student_name, student_email, parent_email, student_phone, parent_phone, year_class, track, status, response_status, responded_at, no_response_at, paused_at, updated_at",
    )
    .not("status", "in", ACTIVE_SUB_STATUS_FILTER)
    .not("status", "is", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (churnedErr) {
    console.error("[admin/ilmetodotheoremz-leads] churned fetch error", churnedErr);
    return NextResponse.json({ error: churnedErr.message }, { status: 500 });
  }

  const { data: manualRows, error: manualErr } = await db
    .from("manual_leads")
    .select(
      "id, created_at, full_name, whatsapp_phone, note, channel, status, response_status, responded_at, no_response_at, paused_at, updated_at",
    )
    .eq("channel", "whatsapp")
    .order("updated_at", { ascending: false })
    .limit(800);

  if (manualErr) {
    console.error("[admin/ilmetodotheoremz-leads] manual fetch error", manualErr);
    return NextResponse.json({ error: manualErr.message }, { status: 500 });
  }

  const churnedList = (churnedRows || []) as ChurnedStudentRow[];
  const manualList = (manualRows || []) as ManualLeadRow[];
  const churnedLeads = churnedList.map(mapChurnedLead).filter(Boolean);
  const whatsappLeads = manualList.map(mapManualLead).filter(Boolean);
  const dailyCandidates = dedupeByPhone([...churnedLeads, ...whatsappLeads]);
  const dailyPool = seededShuffle(dailyCandidates, hashString(dailyYmd));
  const dailyLeads = dailyPool.slice(0, 30);

  const { data: metodoContacts, error: metodoContactsErr } = await db
    .from("ilmetodotheoremz_leads")
    .select("responded_at, no_response_at")
    .or(`responded_at.gte.${startIso},no_response_at.gte.${startIso}`);

  if (metodoContactsErr) {
    console.error("[admin/ilmetodotheoremz-leads] streak fetch error", metodoContactsErr);
    return NextResponse.json({ error: metodoContactsErr.message }, { status: 500 });
  }

  (metodoContacts || []).forEach((row: any) => {
    const contactIso = row?.responded_at || row?.no_response_at || null;
    if (contactIso && contactIso < endIso) addContactCount(streakMap, contactIso);
  });

  const { data: blackContacts, error: blackContactsErr } = await db
    .from("black_students")
    .select("responded_at, no_response_at, status")
    .not("status", "in", ACTIVE_SUB_STATUS_FILTER)
    .not("status", "is", null)
    .or(`responded_at.gte.${startIso},no_response_at.gte.${startIso}`);

  if (blackContactsErr) {
    console.error("[admin/ilmetodotheoremz-leads] streak black error", blackContactsErr);
    return NextResponse.json({ error: blackContactsErr.message }, { status: 500 });
  }

  (blackContacts || []).forEach((row: any) => {
    const contactIso = row?.responded_at || row?.no_response_at || null;
    if (contactIso && contactIso < endIso) addContactCount(streakMap, contactIso);
  });

  const { data: manualContacts, error: manualContactsErr } = await db
    .from("manual_leads")
    .select("responded_at, no_response_at, channel")
    .eq("channel", "whatsapp")
    .or(`responded_at.gte.${startIso},no_response_at.gte.${startIso}`);

  if (manualContactsErr) {
    console.error("[admin/ilmetodotheoremz-leads] streak manual error", manualContactsErr);
    return NextResponse.json({ error: manualContactsErr.message }, { status: 500 });
  }

  (manualContacts || []).forEach((row: any) => {
    const contactIso = row?.responded_at || row?.no_response_at || null;
    if (contactIso && contactIso < endIso) addContactCount(streakMap, contactIso);
  });

  const streakRows = streakDays.map((day) => ({
    day_ymd: day.ymd,
    count: streakMap.get(day.ymd) || 0,
    updated_at: new Date().toISOString(),
  }));

  const { error: streakErr } = await db
    .from("ilmetodotheoremz_lead_streaks")
    .upsert(streakRows, { onConflict: "day_ymd" });

  if (streakErr) {
    console.error("[admin/ilmetodotheoremz-leads] streak save error", streakErr);
  }

  return NextResponse.json({
    leads,
    daily: {
      date: dailyYmd,
      leads: dailyLeads,
    },
    streak: {
      days: streakDays.map((day) => ({
        ...day,
        count: streakMap.get(day.ymd) || 0,
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "missing_supabase_config" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  const source = typeof body.source === "string" ? body.source.trim().toLowerCase() : "ilmetodo";
  const normalizedSource = source === "whatsapp" ? "manual" : source;

  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  if (!["pending", "responded", "no_response", "paused"].includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, string | null> = {
    response_status: status,
    responded_at: null,
    no_response_at: null,
    paused_at: null,
  };

  if (status === "responded") patch.responded_at = now;
  if (status === "no_response") patch.no_response_at = now;
  if (status === "paused") patch.paused_at = now;

  const db = supabaseServer();
  if (normalizedSource === "manual") {
    const { data: manualData, error: manualError } = await db
      .from("manual_leads")
      .update(patch)
      .eq("id", id)
      .select(
        "id, created_at, full_name, whatsapp_phone, note, status, response_status, responded_at, no_response_at, paused_at, updated_at",
      )
      .maybeSingle();

    if (manualError) {
      console.error("[admin/ilmetodotheoremz-leads] manual update error", manualError);
      return NextResponse.json({ error: manualError.message }, { status: 500 });
    }
    if (!manualData) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ lead: mapManualLead(manualData as ManualLeadRow) });
  }

  if (normalizedSource === "black") {
    const blackPatch = { ...patch, updated_at: now };
    const { data: blackData, error: blackError } = await db
      .from("black_students")
      .update(blackPatch)
      .eq("id", id)
      .select(
        "id, preferred_name, student_name, student_email, parent_email, student_phone, parent_phone, year_class, track, status, response_status, responded_at, no_response_at, paused_at, updated_at",
      )
      .maybeSingle();

    if (blackError) {
      console.error("[admin/ilmetodotheoremz-leads] black update error", blackError);
      return NextResponse.json({ error: blackError.message }, { status: 500 });
    }
    if (!blackData) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ lead: mapChurnedLead(blackData as ChurnedStudentRow) });
  }

  const metodoPatch = { ...patch, updated_at: now };
  const { data: metodoData, error: metodoError } = await db
    .from("ilmetodotheoremz_leads")
    .update(metodoPatch)
    .eq("id", id)
    .select(
      "id, created_at, full_name, email, phone_prefix, phone, page_url, source, response_status, responded_at, no_response_at, paused_at, updated_at",
    )
    .maybeSingle();

  if (metodoError) {
    console.error("[admin/ilmetodotheoremz-leads] update error", metodoError);
    return NextResponse.json({ error: metodoError.message }, { status: 500 });
  }
  if (!metodoData) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ lead: mapMetodoLead(metodoData as MetodoLeadRow) });
}
