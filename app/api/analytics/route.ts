import { NextRequest, NextResponse } from "next/server";
import { analyticsDB } from "@/lib/analyticsDB";

type AnalyticsEventPayload = {
  event?: string;
  page?: string;
  sessionId?: string;
  userId?: string;
  anonId?: string;
  params?: Record<string, any> | string | null;
};

const DAILY_STATS_ENABLED = process.env.ANALYTICS_DAILY_STATS === "1";

function normalizeParams(raw: AnalyticsEventPayload["params"]) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, any>;
  return {};
}

async function updateDailyStatsCounter(date: string, field: string, increment = 1) {
  if (!DAILY_STATS_ENABLED) return;
  await analyticsDB.updateDailyStats(date, field, increment);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];
    if (!events.length) {
      return NextResponse.json({ error: "Event name required" }, { status: 400 });
    }

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const eventRows: any[] = [];
    const sessionRows = new Map<string, any>();
    const conversionRows: any[] = [];
    const dailyCounts: Record<string, number> = {};

    const bump = (field: string, inc = 1) => {
      dailyCounts[field] = (dailyCounts[field] || 0) + inc;
    };

    for (const raw of events) {
      const payload = raw as AnalyticsEventPayload;
      const eventName = payload?.event;
      if (typeof eventName !== "string" || !eventName.trim()) continue;

      const page = typeof payload.page === "string" ? payload.page : "";
      const sessionId =
        typeof payload.sessionId === "string" && payload.sessionId.trim()
          ? payload.sessionId
          : null;
      const userId =
        typeof payload.userId === "string" && payload.userId.trim()
          ? payload.userId
          : null;
      const params = normalizeParams(payload.params);

      eventRows.push({
        event_type: eventName,
        page_url: page,
        user_id: userId,
        session_id: sessionId,
        event_data: params,
        user_agent: userAgent,
        ip_address: ip,
      });

      switch (eventName) {
        case "page_view":
          bump("total_pageviews");
          break;
        case "session_start":
          if (sessionId) {
            sessionRows.set(sessionId, {
              id: sessionId,
              user_id: userId,
              user_agent: userAgent,
              ip_address: ip,
              referrer: params?.referrer || "",
              landing_page: params?.landing_page || page || "",
            });
            bump("new_sessions");
          }
          break;
        case "conversion": {
          const conversionType = params?.conversion_type;
          if (typeof conversionType === "string" && conversionType) {
            const rawValue = params?.conversion_value;
            const numericValue =
              rawValue === null || rawValue === undefined || rawValue === ""
                ? null
                : Number(String(rawValue).replace(",", "."));
            conversionRows.push({
              conversion_type: conversionType,
              session_id: sessionId,
              user_id: userId,
              conversion_value: Number.isFinite(numericValue)
                ? numericValue
                : null,
              conversion_data: page ? { page_url: page } : null,
            });

            switch (conversionType) {
              case "quiz_parent_click":
                bump("quiz_parent_clicks");
                break;
              case "quiz_student_click":
                bump("quiz_student_clicks");
                break;
              case "black_page_visit":
                bump("black_page_visits");
                break;
              case "popup_click":
                bump("popup_clicks");
                break;
              default:
                bump("conversions");
            }
          }
          break;
        }
        default:
          break;
      }
    }

    if (!eventRows.length) {
      return NextResponse.json({ error: "Event name required" }, { status: 400 });
    }

    const { error: eventsError } = await analyticsDB.supabase
      .from("events")
      .insert(eventRows);
    if (eventsError) throw eventsError;

    if (sessionRows.size > 0) {
      const { error: sessionsError } = await analyticsDB.supabase
        .from("sessions")
        .upsert(Array.from(sessionRows.values()), { onConflict: "id" });
      if (sessionsError) {
        console.error("[analytics] session upsert failed", sessionsError);
      }
    }

    if (conversionRows.length > 0) {
      const { error: conversionsError } = await analyticsDB.supabase
        .from("conversions")
        .insert(conversionRows);
      if (conversionsError) {
        console.error("[analytics] conversion insert failed", conversionsError);
      }
    }

    if (DAILY_STATS_ENABLED) {
      for (const [field, inc] of Object.entries(dailyCounts)) {
        await updateDailyStatsCounter(today, field, inc);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore API analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
