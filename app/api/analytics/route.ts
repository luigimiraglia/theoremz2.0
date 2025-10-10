import { NextRequest, NextResponse } from "next/server";
import { analyticsDB } from "@/lib/analyticsDB";

// Funzione per aggiornare statistiche giornaliere
async function updateDailyStatsCounter(date: string, field: string) {
  try {
    // Ottieni statistiche esistenti per la data
    const statsArray = await analyticsDB.getDailyStats(date) as any[];
    let stats = statsArray && statsArray.length > 0 ? statsArray[0] : null;
    
    if (!stats) {
      // Crea nuove statistiche per oggi se non esistono
      stats = {
        date: date,
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
    if (field in stats && typeof stats[field] === 'number') {
      stats[field]++;
    }
    
    // Aggiorna le statistiche nel database
    // Note: Non abbiamo updateDailyStats nella nuova versione, 
    // quindi per ora saltiamo questo aggiornamento
    console.log(`[Analytics] Would update daily stats for ${date}, field ${field}`);
    
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
    await analyticsDB.insertEvent(
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
        await updateDailyStatsCounter(today, "total_pageviews");
        break;
        
      case "session_start":
        // Crea o aggiorna sessione
        if (sessionId) {
          try {
            await analyticsDB.insertSession(
              sessionId,
              userId || null,
              anonId || null,
              params?.landing_page || page || "",
              params?.referrer || "",
              userAgent,
              ip
            );
            await updateDailyStatsCounter(today, "new_sessions");
          } catch {
            // Sessione già esiste, ignora errore
          }
        }
        break;
        
      case "conversion":
        const conversionType = params?.conversion_type;
        if (conversionType) {
          // Inserisci conversione
          await analyticsDB.insertConversion(
            conversionType,
            sessionId || null,
            userId || null,
            anonId || null,
            params?.conversion_value || "",
            page || ""
          );
          
          // Aggiorna contatori specifici
          switch (conversionType) {
            case "quiz_parent_click":
              await updateDailyStatsCounter(today, "quiz_parent_clicks");
              break;
            case "quiz_student_click":
              await updateDailyStatsCounter(today, "quiz_student_clicks");
              break;
            case "black_page_visit":
              await updateDailyStatsCounter(today, "black_page_visits");
              break;
            case "popup_click":
              await updateDailyStatsCounter(today, "popup_clicks");
              break;
            default:
              await updateDailyStatsCounter(today, "conversions");
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