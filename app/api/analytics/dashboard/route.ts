import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { analyticsDB } from "@/lib/analyticsDB";

export async function GET(request: NextRequest) {
  try {
    console.log(`[Analytics API] Starting dashboard request`);

    // Autenticazione - BYPASS in sviluppo per debug
    if (process.env.NODE_ENV !== "development") {
      const apiKey = request.headers.get("x-api-key");
      const authHeader = request.headers.get("authorization");

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
    } else {
      console.log("[Analytics API] Development mode - bypassing authentication");
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

    // TEMP: Calcola statistiche direttamente dalla tabella events invece delle tabelle aggregate vuote
    console.log(`[Analytics API] Calculating stats from events table directly`);
    
    // Query eventi per il periodo
    const { data: events, error: eventsError } = await analyticsDB.supabase
      .from('events')
      .select('*')
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr + ' 23:59:59');

    if (eventsError) {
      console.error(`[Analytics API] Error fetching events:`, eventsError);
      return NextResponse.json(
        { error: "Failed to fetch events", details: eventsError.message },
        { status: 500 }
      );
    }

    console.log(`[Analytics API] Found ${events?.length || 0} events in period`);

    // Calcola statistiche dai dati reali degli eventi
    const pageViewEvents = events?.filter(e => e.event_type === 'page_view') || [];
    const buyClickEvents = events?.filter(e => e.event_type === 'buy_click') || [];
    const blackPageEvents = events?.filter(e => 
      e.event_type === 'page_view' && 
      (e.page_url?.includes('/black') || e.page_url?.includes('/mentor'))
    ) || [];

    // Conta visite uniche per pagina
    const uniquePages = new Set(pageViewEvents.map(e => e.page_url));
    
    const summary = {
      totalVisits: pageViewEvents.length,
      funnelEntries: pageViewEvents.filter(e => 
        e.page_url?.includes('quiz') || 
        e.page_url?.includes('funnel')
      ).length,
      blackPageVisits: blackPageEvents.length,
      buyClicks: buyClickEvents.length,
      conversions: buyClickEvents.length, // Semplificazione per ora
      conversionRate: pageViewEvents.length > 0 ? 
        ((buyClickEvents.length / pageViewEvents.length) * 100).toFixed(1) : '0.0'
    };

    // Crea dati per i grafici
    const charts = {
      dailyVisits: [],
      funnelEntries: [],
      blackPageVisits: [],
      buyClicks: [],
      conversionFunnel: [],
      topPages: Array.from(uniquePages).slice(0, 10).map((url, i) => ({
        url,
        visits: pageViewEvents.filter(e => e.page_url === url).length,
        rank: i + 1
      }))
    };

    // Statistiche sessioni (approssimate)
    const sessionStats = {
      totalSessions: new Set(events?.map(e => e.session_id)).size,
      avgSessionDuration: 300, // Default 5 minuti
      bounceRate: 0.3
    };

    // Eventi recenti
    const recentEvents = (events || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    console.log(`[Analytics API] Calculated summary:`, summary);
    // Risposta strutturata
    const response = {
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
        days: days
      },
      summary,
      charts,
      sessionStats,
      recentEvents,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: "2.0.0-supabase-direct"
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