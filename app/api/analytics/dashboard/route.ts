import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { analyticsDB } from "@/lib/analyticsDB";

export async function GET(request: NextRequest) {
  try {
    console.log(`[Analytics API] Starting dashboard request`);

    // Autenticazione - verifica API key per production
    const apiKey = request.headers.get("x-api-key");
    const authHeader = request.headers.get("authorization");

    if (process.env.NODE_ENV === "production") {
      // In production, usa API key come fallback
      if (!apiKey || apiKey !== process.env.ANALYTICS_API_KEY) {
        if (!authHeader?.startsWith("Bearer ")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const token = authHeader.split("Bearer ")[1];
          const decodedToken = await adminAuth.verifyIdToken(token);
          
          // Verifica che sia luigi.miraglia006@gmail.com
          if (decodedToken.email !== "luigi.miraglia006@gmail.com") {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
          }
        } catch (error) {
          console.error("[Analytics API] Token verification failed:", error);
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
      }
    }

    // Parametri query
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam) : 7;

    // Date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(`[Analytics API] Date range: ${startDateStr} to ${endDateStr}`);

    // Test connessione database
    const connectionTest = await analyticsDB.testConnection();
    if (!connectionTest.success) {
      console.error(`[Analytics API] Database connection failed:`, connectionTest.error);
      return NextResponse.json(
        { error: "Database connection failed", details: connectionTest.error },
        { status: 500 }
      );
    }

    console.log(`[Analytics API] Database connected successfully`);

    // Ottieni statistiche base
    const [
      conversionFunnel,
      topPages,
      sessionStats,
      recentEvents,
      funnelEntriesDaily,
      totalVisitsDaily,
      blackPageVisitsDaily,
      buyClicksDaily
    ] = await Promise.all([
      analyticsDB.getConversionFunnel(startDateStr, endDateStr),
      analyticsDB.getTopPages(startDateStr, endDateStr),
      analyticsDB.getSessionStats(startDateStr, endDateStr),
      analyticsDB.getRecentEvents(100),
      analyticsDB.getFunnelEntriesDaily(startDateStr, endDateStr),
      analyticsDB.getTotalVisitsDaily(startDateStr, endDateStr),
      analyticsDB.getBlackPageVisitsDaily(startDateStr, endDateStr),
      analyticsDB.getBuyClicksDaily(startDateStr, endDateStr)
    ]);

    console.log(`[Analytics API] Data retrieved successfully`);

    // Calcola totali
    const funnelEntriesTotal = funnelEntriesDaily.reduce(
      (sum: number, day: any) => sum + (day.quiz_parent_clicks + day.quiz_student_clicks + day.popup_clicks),
      0
    );

    const totalVisitsTotal = totalVisitsDaily.reduce(
      (sum: number, day: any) => sum + day.total_visits,
      0
    );

    const blackPageVisitsTotal = blackPageVisitsDaily.reduce(
      (sum: number, day: any) => sum + day.black_page_visits,
      0
    );

    const buyClicksTotal = buyClicksDaily.reduce(
      (sum: number, day: any) => sum + day.buy_clicks,
      0
    );

    // Calcola percentuale di conversione (buy clicks / visite pagina Black)
    const blackPageConversionRate = blackPageVisitsTotal > 0 
      ? ((buyClicksTotal / blackPageVisitsTotal) * 100)
      : 0;

    // Statistiche periodo precedente per trend
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevEndDate = new Date(startDate);
    
    const prevStartDateStr = prevStartDate.toISOString().split("T")[0];
    const prevEndDateStr = prevEndDate.toISOString().split("T")[0];

    const [
      prevTotalVisits,
      prevBlackPageVisits,
      prevBuyClicks
    ] = await Promise.all([
      analyticsDB.getTotalVisitsDaily(prevStartDateStr, prevEndDateStr),
      analyticsDB.getBlackPageVisitsDaily(prevStartDateStr, prevEndDateStr),
      analyticsDB.getBuyClicksDaily(prevStartDateStr, prevEndDateStr)
    ]);

    const prevTotalVisitsSum = prevTotalVisits.reduce((sum: number, day: any) => sum + day.total_visits, 0);
    const prevBlackPageVisitsSum = prevBlackPageVisits.reduce((sum: number, day: any) => sum + day.black_page_visits, 0);
    const prevBuyClicksSum = prevBuyClicks.reduce((sum: number, day: any) => sum + day.buy_clicks, 0);

    // Calcola trend percentuali
    const visitorsTrend = prevTotalVisitsSum > 0
      ? ((totalVisitsTotal - prevTotalVisitsSum) / prevTotalVisitsSum) * 100
      : 0;

    const blackTrend = prevBlackPageVisitsSum > 0
      ? ((blackPageVisitsTotal - prevBlackPageVisitsSum) / prevBlackPageVisitsSum) * 100
      : 0;

    const buyClicksTrend = prevBuyClicksSum > 0
      ? ((buyClicksTotal - prevBuyClicksSum) / prevBuyClicksSum) * 100
      : 0;

    // Risposta strutturata
    const response = {
      success: true,
      timeRange: {
        startDate: startDateStr,
        endDate: endDateStr,
        days: days
      },
      database: {
        type: connectionTest.result?.type || 'unknown',
        status: 'connected'
      },
      overview: {
        totalVisitors: {
          current: totalVisitsTotal,
          trend: Math.round(visitorsTrend * 100) / 100
        },
        funnelEntries: {
          current: funnelEntriesTotal,
          breakdown: {
            quiz_parent: funnelEntriesDaily.reduce((sum: number, day: any) => sum + day.quiz_parent_clicks, 0),
            quiz_student: funnelEntriesDaily.reduce((sum: number, day: any) => sum + day.quiz_student_clicks, 0),
            popup_clicks: funnelEntriesDaily.reduce((sum: number, day: any) => sum + day.popup_clicks, 0)
          }
        },
        blackPageVisits: {
          current: blackPageVisitsTotal,
          trend: Math.round(blackTrend * 100) / 100
        },
        buyClicks: {
          current: buyClicksTotal,
          trend: Math.round(buyClicksTrend * 100) / 100,
          conversionRate: Math.round(blackPageConversionRate * 100) / 100
        }
      },
      charts: {
        dailyVisits: totalVisitsDaily,
        funnelEntries: funnelEntriesDaily,
        blackPageVisits: blackPageVisitsDaily,
        buyClicks: buyClicksDaily,
        conversionFunnel: conversionFunnel,
        topPages: topPages
      },
      sessionStats: sessionStats,
      recentEvents: recentEvents.slice(0, 20), // Limita a 20 eventi recenti
      metadata: {
        generatedAt: new Date().toISOString(),
        version: "2.0.0-turso"
      }
    };

    console.log(`[Analytics API] Response prepared successfully`);

    return NextResponse.json(response);

  } catch (error) {
    console.error("[Analytics API] Dashboard error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch analytics data", 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}