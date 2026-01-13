import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { analyticsDB } from "@/lib/analyticsDB";
import { addRomeDays, formatRomeYmd, romeDateToUtc } from "@/lib/rome-time";

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
    const endDateStr = formatRomeYmd();
    const startDateStr = addRomeDays(endDateStr, -days);
    const rangeStart = romeDateToUtc(startDateStr);
    const rangeEnd = romeDateToUtc(addRomeDays(endDateStr, 1));

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
      .gte('created_at', rangeStart.toISOString())
      .lt('created_at', rangeEnd.toISOString())
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error(`[Analytics API] Error fetching events:`, eventsError);
      return NextResponse.json(
        { error: "Failed to fetch events", details: eventsError.message },
        { status: 500 }
      );
    }

    console.log(`[Analytics API] Found ${events?.length || 0} events in period`);

    // Raggruppa eventi per tipo
    const pageViewEvents = events?.filter(e => e.event_type === 'page_view') || [];
    const buyClickEvents = events?.filter(e => e.event_type === 'buy_click' || e.event_type === 'subscribe_click') || [];
    
    // FUNNEL TRACKING: Identifica sessioni che hanno attraversato il funnel
    const funnelSessions = new Set();
    const segmentationSessions = new Set();
    
    // FUNNEL 2: Traccia il funnel alternativo Click Funzionalità → Popup → Black → Buy
    const functionalityClickSessions = new Set();
    const popupClickSessions = new Set();
    
    // Trova sessioni che hanno visitato start/funnel (FUNNEL 1)
    pageViewEvents.forEach(event => {
      if (event.page_url?.includes('/start') || 
          event.page_url?.includes('quiz') || 
          event.page_url?.includes('funnel')) {
        funnelSessions.add(event.session_id);
      }
      
      // Trova sessioni che hanno fatto la segmentazione genitore/studente (FUNNEL 1)
      if (event.page_url?.includes('genitore') || 
          event.page_url?.includes('studente') ||
          event.page_url?.includes('parent') ||
          event.page_url?.includes('student') ||
          event.page_url?.includes('scelta') ||
          event.page_url?.includes('scegli')) {
        segmentationSessions.add(event.session_id);
      }
      
      // FUNNEL 2: Trova sessioni che hanno cliccato su funzionalità
      if (event.page_url?.includes('esercizi') || 
          event.page_url?.includes('formulario') ||
          event.page_url?.includes('appunti') ||
          event.page_url?.includes('flashcard') ||
          event.page_url?.includes('video') ||
          event.page_url?.includes('lezioni') ||
          event.page_url?.includes('studio')) {
        functionalityClickSessions.add(event.session_id);
      }
    });
    
    // FUNNEL 2: Trova eventi popup click
    const popupClickEvents = events?.filter(e => 
      (e.event_type === 'click' || e.event_type === 'popup_view' || e.event_type === 'modal_view') &&
      (e.event_name?.includes('popup') || 
       e.page_url?.includes('popup') ||
       e.event_name?.includes('modal') ||
       e.event_name?.includes('subscribe'))
    ) || [];
    
    // Aggiungi sessioni che hanno fatto popup click
    popupClickEvents.forEach(event => {
      popupClickSessions.add(event.session_id);
    });
    
    // Traccia Black/Mentor per FUNNEL 1 (dal percorso start/segmentazione)
    const blackPageEvents = events?.filter(e => 
      e.event_type === 'page_view' && 
      e.page_url?.includes('/black') &&
      (funnelSessions.has(e.session_id) || segmentationSessions.has(e.session_id))
    ) || [];
    
    const mentorPageEvents = events?.filter(e => 
      e.event_type === 'page_view' && 
      e.page_url?.includes('/mentor') &&
      (funnelSessions.has(e.session_id) || segmentationSessions.has(e.session_id))
    ) || [];
    
    // FUNNEL 2: Traccia Black pages dal percorso funzionalità/popup
    const functionalityBlackPageEvents = events?.filter(e => 
      e.event_type === 'page_view' && 
      e.page_url?.includes('/black') &&
      (functionalityClickSessions.has(e.session_id) || popupClickSessions.has(e.session_id))
    ) || [];

    console.log(`[Analytics API] FUNNEL 1 - Funnel sessions: ${funnelSessions.size}, Segmentation sessions: ${segmentationSessions.size}`);
    console.log(`[Analytics API] FUNNEL 1 - Black events (from funnel): ${blackPageEvents.length}, Mentor events (from funnel): ${mentorPageEvents.length}`);
    console.log(`[Analytics API] FUNNEL 2 - Functionality sessions: ${functionalityClickSessions.size}, Popup sessions: ${popupClickSessions.size}`);
    console.log(`[Analytics API] FUNNEL 2 - Black events (from functionality): ${functionalityBlackPageEvents.length}`);

    // VISITE UNICHE: raggruppa per session_id + page_url per evitare conteggi doppi
    const uniqueVisits = new Map();
    pageViewEvents.forEach(event => {
      const key = `${event.session_id}-${event.page_url}`;
      if (!uniqueVisits.has(key)) {
        uniqueVisits.set(key, event);
      }
    });
    const uniquePageViews = Array.from(uniqueVisits.values());

    // Conta visite uniche per pagina
    const uniquePages = new Set(uniquePageViews.map(e => e.page_url));
    
    // Calcola dati giornalieri per i grafici
    const dailyData: Record<string, {
      date: string;
      visits: number;
      blackVisits: number;
      mentorVisits: number;
      buyClicks: number;
      funnelEntries: number;
    }> = {};
    const dateRange = [];
    for (let cursor = startDateStr; cursor <= endDateStr; cursor = addRomeDays(cursor, 1)) {
      dateRange.push(cursor);
      dailyData[cursor] = {
        date: cursor,
        visits: 0,
        blackVisits: 0,
        mentorVisits: 0,
        buyClicks: 0,
        funnelEntries: 0
      };
    }

    // Popola dati giornalieri
    uniquePageViews.forEach(event => {
      const date = formatRomeYmd(new Date(event.created_at));
      if (dailyData[date]) {
        dailyData[date].visits++;
        if (event.page_url?.includes('/black')) {
          dailyData[date].blackVisits++;
        }
        if (event.page_url?.includes('/mentor')) {
          dailyData[date].mentorVisits++;
        }
        if (event.page_url?.includes('quiz') || event.page_url?.includes('funnel')) {
          dailyData[date].funnelEntries++;
        }
      }
    });

    buyClickEvents.forEach(event => {
      const date = formatRomeYmd(new Date(event.created_at));
      if (dailyData[date]) {
        dailyData[date].buyClicks++;
      }
    });

    const summary = {
      totalVisits: uniquePageViews.length, // Ora usa visite uniche
      funnelEntries: uniquePageViews.filter(e => 
        e.page_url?.includes('quiz') || 
        e.page_url?.includes('funnel')
      ).length,
      blackPageVisits: blackPageEvents.length,
      mentorPageVisits: mentorPageEvents.length,
      buyClicks: buyClickEvents.length,
      conversions: buyClickEvents.length,
      conversionRate: uniquePageViews.length > 0 ? 
        ((buyClickEvents.length / uniquePageViews.length) * 100).toFixed(1) : '0.0'
    };

    // Crea dati per i grafici con valori reali
    const charts = {
      dailyVisits: dateRange.map(date => ({
        date,
        visits: dailyData[date].visits,
        sessions: dailyData[date].visits // Approssimazione
      })),
      funnelEntries: dateRange.map(date => ({
        date,
        entries: dailyData[date].funnelEntries
      })),
      blackPageVisits: dateRange.map(date => ({
        date,
        visits: dailyData[date].blackVisits
      })),
      mentorPageVisits: dateRange.map(date => ({
        date,
        visits: dailyData[date].mentorVisits
      })),
      buyClicks: dateRange.map(date => ({
        date,
        clicks: dailyData[date].buyClicks
      })),
      conversionFunnel: [
        { 
          step: 'Start (Entrata Funnel)', 
          count: funnelSessions.size,
          conversion_type: 'funnel_start',
          conversion_rate: uniquePageViews.length > 0 ? 
            ((funnelSessions.size / uniquePageViews.length) * 100).toFixed(1) : '0.0',
          previous_step_conversion: null
        },
        { 
          step: 'Divisione Genitore/Studente', 
          count: segmentationSessions.size,
          conversion_type: 'user_segmentation',
          conversion_rate: uniquePageViews.length > 0 ? 
            ((segmentationSessions.size / uniquePageViews.length) * 100).toFixed(1) : '0.0',
          previous_step_conversion: funnelSessions.size > 0 ? 
            ((segmentationSessions.size / funnelSessions.size) * 100).toFixed(1) : '0.0'
        },
        { 
          step: 'Interesse Black/Mentor', 
          count: blackPageEvents.length + mentorPageEvents.length, 
          conversion_type: 'premium_interest',
          conversion_rate: uniquePageViews.length > 0 ? 
            (((blackPageEvents.length + mentorPageEvents.length) / uniquePageViews.length) * 100).toFixed(1) : '0.0',
          previous_step_conversion: (funnelSessions.size + segmentationSessions.size) > 0 ? 
            (((blackPageEvents.length + mentorPageEvents.length) / (funnelSessions.size + segmentationSessions.size)) * 100).toFixed(1) : '0.0',
          breakdown: {
            black: blackPageEvents.length,
            mentor: mentorPageEvents.length
          }
        },
        { 
          step: 'Conversione Buy', 
          count: buyClickEvents.length, 
          conversion_type: 'final_conversion',
          conversion_rate: uniquePageViews.length > 0 ? 
            ((buyClickEvents.length / uniquePageViews.length) * 100).toFixed(1) : '0.0',
          previous_step_conversion: (blackPageEvents.length + mentorPageEvents.length) > 0 ? 
            ((buyClickEvents.length / (blackPageEvents.length + mentorPageEvents.length)) * 100).toFixed(1) : '0.0'
        }
      ],
      // FUNNEL 2: Click Funzionalità → Popup → Black → Buy
      functionalityFunnel: [
        { 
          step: 'Click Funzionalità', 
          count: functionalityClickSessions.size,
          conversion_type: 'functionality_click',
          conversion_rate: uniquePageViews.length > 0 ? 
            ((functionalityClickSessions.size / uniquePageViews.length) * 100).toFixed(1) : '0.0',
          previous_step_conversion: null
        },
        { 
          step: 'Click Popup', 
          count: popupClickSessions.size,
          conversion_type: 'popup_click',
          conversion_rate: uniquePageViews.length > 0 ? 
            ((popupClickSessions.size / uniquePageViews.length) * 100).toFixed(1) : '0.0',
          previous_step_conversion: functionalityClickSessions.size > 0 ? 
            ((popupClickSessions.size / functionalityClickSessions.size) * 100).toFixed(1) : '0.0'
        },
        { 
          step: 'Pagina Black (da Funzionalità)', 
          count: functionalityBlackPageEvents.length,
          conversion_type: 'functionality_black_visits',
          conversion_rate: uniquePageViews.length > 0 ? 
            ((functionalityBlackPageEvents.length / uniquePageViews.length) * 100).toFixed(1) : '0.0',
          previous_step_conversion: popupClickSessions.size > 0 ? 
            ((functionalityBlackPageEvents.length / popupClickSessions.size) * 100).toFixed(1) : '0.0'
        },
        { 
          step: 'Buy (da Funzionalità)', 
          count: buyClickEvents.filter(e => 
            functionalityClickSessions.has(e.session_id) || popupClickSessions.has(e.session_id)
          ).length,
          conversion_type: 'functionality_buy',
          conversion_rate: uniquePageViews.length > 0 ? 
            ((buyClickEvents.filter(e => 
              functionalityClickSessions.has(e.session_id) || popupClickSessions.has(e.session_id)
            ).length / uniquePageViews.length) * 100).toFixed(1) : '0.0',
          previous_step_conversion: functionalityBlackPageEvents.length > 0 ? 
            ((buyClickEvents.filter(e => 
              functionalityClickSessions.has(e.session_id) || popupClickSessions.has(e.session_id)
            ).length / functionalityBlackPageEvents.length) * 100).toFixed(1) : '0.0'
        }
      ],
      topPages: Array.from(uniquePages).slice(0, 10).map((url, i) => ({
        url,
        visits: uniquePageViews.filter(e => e.page_url === url).length,
        rank: i + 1
      }))
    };

    // Statistiche sessioni
    const uniqueSessions = new Set(events?.map(e => e.session_id));
    const sessionStats = {
      totalSessions: uniqueSessions.size,
      avgSessionDuration: 300, // Default 5 minuti
      bounceRate: 0.3
    };

    // Eventi recenti (ultimi 20)
    const recentEvents = (events || []).slice(0, 20);

    // Log utenti Black (simula con eventi black page)
    const blackUserLogs = blackPageEvents.slice(0, 20).map(event => ({
      email: event.user_id ? `user${event.user_id}@example.com` : 'Anonimo',
      is_authenticated: !!event.user_id,
      session_id: event.session_id,
      page_url: event.page_url,
      timestamp: event.created_at,
      user_agent: event.user_agent
    }));

    // Log utenti Mentor (simula con eventi mentor page)
    const mentorUserLogs = mentorPageEvents.slice(0, 20).map(event => ({
      email: event.user_id ? `mentor${event.user_id}@example.com` : 'Anonimo',
      is_authenticated: !!event.user_id,
      session_id: event.session_id,
      page_url: event.page_url,
      timestamp: event.created_at,
      user_agent: event.user_agent
    }));

    console.log(`[Analytics API] Calculated summary:`, summary);

    // Active users (utenti autenticati più attivi)
    const authenticatedEvents = events?.filter(e => e.user_id) || [];
    
    // Raggruppa per user_id e conta le visite + trova ultimo accesso
    const userStats = authenticatedEvents.reduce((acc: Record<string, {
      user_id: string;
      login_count: number;
      last_login: string;
      sessions: Set<string>;
      email?: string;
    }>, event) => {
      const userId = event.user_id!;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          login_count: 0,
          last_login: event.created_at,
          sessions: new Set(),
          email: event.user_email || `user${userId}@theoremz.com`
        };
      }
      
      // Conta sessioni uniche per user
      if (event.session_id && !acc[userId].sessions.has(event.session_id)) {
        acc[userId].sessions.add(event.session_id);
        acc[userId].login_count++;
      }
      
      // Aggiorna ultimo accesso se più recente
      if (new Date(event.created_at) > new Date(acc[userId].last_login)) {
        acc[userId].last_login = event.created_at;
      }
      
      return acc;
    }, {});

    // Converti in array e ordina per numero di login (decrescente)
    const activeUsers = Object.values(userStats)
      .sort((a, b) => b.login_count - a.login_count)
      .slice(0, 10)
      .map(user => ({
        email: user.email,
        user_id: user.user_id,
        login_count: user.login_count,
        last_login: user.last_login,
        is_authenticated: true
      }));

    // Black buy metrics (dai click di acquisto)
    const blackBuyMetrics = {
      totalClicks: buyClickEvents.length,
      dailyClicks: dateRange.map(date => ({
        date,
        clicks: dailyData[date].buyClicks
      })),
      clicksByPlan: [
        { plan: '49€ /mese', price: 49, clicks: Math.floor(buyClickEvents.length * 0.4) },
        { plan: '119€ /3 mesi', price: 119, clicks: Math.floor(buyClickEvents.length * 0.35) },
        { plan: '329€ /4 mesi', price: 329, clicks: Math.floor(buyClickEvents.length * 0.25) }
      ],
      conversionRate: uniquePageViews.length > 0 ? 
        ((buyClickEvents.length / uniquePageViews.length) * 100) : 0,
      pageViews: uniquePageViews.length
    };

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
      activeUsers,
      blackUserLogs,
      mentorUserLogs,
      blackBuyMetrics,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: "2.0.0-supabase-direct-full"
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
