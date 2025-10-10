import { NextRequest, NextResponse } from "next/server";
import { analyticsDB } from "@/lib/analyticsDB";

// Funzione per aggiornare statistiche giornaliere
function updateDailyStatsCounter(date: string, field: string) {
  try {
    let stats = analyticsDB.getDailyStats.get(date) as any;
    
    if (!stats) {
      // Crea nuove statistiche per oggi
      stats = {
        unique_visitors: 0,
        total_pageviews: 0,
        new_sessions: 0,
        quiz_parent_clicks: 0,
        quiz_student_clicks: 0,
        black_page_visits: 0,
        popup_clicks: 0,
        conversions: 0,
      };
    }
    
    // Incrementa il campo specifico
    if (field in stats) {
      stats[field]++;
    }
    
    analyticsDB.updateDailyStats.run(
      date,
      stats.unique_visitors,
      stats.total_pageviews,
      stats.new_sessions,
      stats.quiz_parent_clicks,
      stats.quiz_student_clicks,
      stats.black_page_visits,
      stats.popup_clicks,
      stats.conversions
    );
  } catch (error) {
    console.error("Errore aggiornamento statistiche giornaliere:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, page, sessionId, userId, anonId, params } = body;

    if (!event || typeof event !== "string") {
      return NextResponse.json({ error: "Event name required" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Inserisci evento nel database
    analyticsDB.insertEvent.run(
      event,
      page || "",
      userId || null,
      sessionId || null,
      anonId || null,
      JSON.stringify(params || {}),
      userAgent,
      ip
    );

    // Gestisci eventi speciali
    switch (event) {
      case "page_view":
        updateDailyStatsCounter(today, "total_pageviews");
        break;
        
      case "session_start":
        // Crea o aggiorna sessione
        if (sessionId) {
          try {
            analyticsDB.insertSession.run(
              sessionId,
              userId || null,
              anonId || null,
              params?.landing_page || page || "",
              params?.referrer || "",
              userAgent,
              ip
            );
            updateDailyStatsCounter(today, "new_sessions");
          } catch {
            // Sessione già esiste, ignora errore
          }
        }
        break;
        
      case "conversion":
        const conversionType = params?.conversion_type;
        if (conversionType) {
          // Inserisci conversione
          analyticsDB.insertConversion.run(
            sessionId || null,
            userId || null,
            anonId || null,
            conversionType,
            params?.conversion_value || "",
            page || ""
          );
          
          // Aggiorna contatori specifici
          switch (conversionType) {
            case "quiz_parent_click":
              updateDailyStatsCounter(today, "quiz_parent_clicks");
              break;
            case "quiz_student_click":
              updateDailyStatsCounter(today, "quiz_student_clicks");
              break;
            case "black_page_visit":
              updateDailyStatsCounter(today, "black_page_visits");
              break;
            case "popup_click":
              updateDailyStatsCounter(today, "popup_clicks");
              break;
            default:
              updateDailyStatsCounter(today, "conversions");
          }
        }
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore API analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}