import { NextRequest, NextResponse } from "next/server";
import { analyticsDB } from "@/lib/analyticsDB";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione - sistema ibrido per produzione/dev
    const authHeader = request.headers.get("Authorization");

    // Metodo 1: Token Firebase (per sviluppo)
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        if (decodedToken.email !== "luigi.miraglia006@gmail.com") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        // Fallback al metodo 2 se Firebase fallisce
      }
    }

    // Metodo 2: Chiave API semplice (per produzione quando Firebase non funziona)
    else if (authHeader?.startsWith("ApiKey ")) {
      const apiKey = authHeader.split("ApiKey ")[1];
      const expectedKey = process.env.ANALYTICS_API_KEY;
      if (!expectedKey || apiKey !== expectedKey) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }
    }

    // Nessuna autenticazione valida
    else {
      return NextResponse.json(
        { error: "Unauthorized - no valid auth method" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);

    console.log(`[Analytics API] Fetching data for ${days} days`);

    // Calcola date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(`[Analytics API] Date range: ${startDateStr} to ${endDateStr}`);

    // Ottieni statistiche giornaliere
    const dailyStats = analyticsDB.getDailyStatsRange.all(
      startDateStr,
      endDateStr
    );

    // Ottieni funnel conversioni
    const conversionFunnel = analyticsDB.getConversionFunnel.all(
      startDate.toISOString()
    );

    // Ottieni pagine più visitate
    const topPages = analyticsDB.getTopPages.all(startDate.toISOString());

    // Ottieni statistiche sessioni
    const sessionStats = analyticsDB.getSessionStats.all(
      startDate.toISOString()
    );

    // Eventi recenti
    const recentEvents = analyticsDB.getRecentEvents.all(
      startDate.toISOString()
    );

    // NUOVI DATI SPECIFICI RICHIESTI

    // 1. Funnel entries (/start) con trend
    const funnelEntriesDaily = analyticsDB.getFunnelEntriesDaily.all(
      startDate.toISOString()
    );
    const funnelEntriesTotal = funnelEntriesDaily.reduce(
      (sum: number, day: any) => sum + day.count,
      0
    );

    // 2. Visite totali con trend
    const totalVisitsDaily = analyticsDB.getTotalVisitsDaily.all(
      startDate.toISOString()
    );
    const totalVisitsTotal = totalVisitsDaily.reduce(
      (sum: number, day: any) => sum + day.count,
      0
    );

    // 3. Visite pagina Black
    const blackPageVisitsDaily = analyticsDB.getBlackPageVisitsDaily.all(
      startDate.toISOString()
    );
    const blackPageVisitsTotal = blackPageVisitsDaily.reduce(
      (sum: number, day: any) => sum + day.count,
      0
    );

    // 4. Visite pagina Mentor
    const mentorPageVisitsDaily = analyticsDB.getMentorPageVisitsDaily.all(
      startDate.toISOString()
    );
    const mentorPageVisitsTotal = mentorPageVisitsDaily.reduce(
      (sum: number, day: any) => sum + day.count,
      0
    );

    // 5. Utilizzo funzionalità per periodo
    const functionalityUsageDaily = analyticsDB.getFunctionalityUsageDaily.all(
      startDate.toISOString()
    );
    const functionalityUsageWeekly =
      analyticsDB.getFunctionalityUsageWeekly.all(startDate.toISOString());
    const functionalityUsageMonthly =
      analyticsDB.getFunctionalityUsageMonthly.all(startDate.toISOString());

    // 6. Sorgenti pagina Black per periodo
    const blackPageSourcesDaily = analyticsDB.getBlackPageSourcesDaily.all(
      startDate.toISOString()
    );
    const blackPageSourcesWeekly = analyticsDB.getBlackPageSourcesWeekly.all(
      startDate.toISOString()
    );
    const blackPageSourcesMonthly = analyticsDB.getBlackPageSourcesMonthly.all(
      startDate.toISOString()
    );

    // Calcola trend settimanali (confronto con periodo precedente)
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const prevFunnelEntries = analyticsDB.getFunnelEntriesDaily
      .all(prevStartDate.toISOString())
      .reduce((sum: number, day: any) => sum + day.count, 0);
    const prevTotalVisits = analyticsDB.getTotalVisitsDaily
      .all(prevStartDate.toISOString())
      .reduce((sum: number, day: any) => sum + day.count, 0);
    const prevBlackPageVisits = analyticsDB.getBlackPageVisitsDaily
      .all(prevStartDate.toISOString())
      .reduce((sum: number, day: any) => sum + day.count, 0);
    const prevMentorPageVisits = analyticsDB.getMentorPageVisitsDaily
      .all(prevStartDate.toISOString())
      .reduce((sum: number, day: any) => sum + day.count, 0);

    const funnelTrend =
      prevFunnelEntries > 0
        ? ((funnelEntriesTotal - prevFunnelEntries) / prevFunnelEntries) * 100
        : 0;
    const visitsTrend =
      prevTotalVisits > 0
        ? ((totalVisitsTotal - prevTotalVisits) / prevTotalVisits) * 100
        : 0;
    const blackTrend =
      prevBlackPageVisits > 0
        ? ((blackPageVisitsTotal - prevBlackPageVisits) / prevBlackPageVisits) *
          100
        : 0;
    const mentorTrend =
      prevMentorPageVisits > 0
        ? ((mentorPageVisitsTotal - prevMentorPageVisits) /
            prevMentorPageVisits) *
          100
        : 0;

    // NUOVE STATISTICHE BUSINESS SPECIFICHE

    // 1. Quiz Start Stats (Studente vs Genitore)
    const quizStartStats = analyticsDB.getQuizStartStats.all(
      startDate.toISOString()
    ) as any[];
    const studentStarts =
      quizStartStats.find((s: any) => s.quiz_type === "student")?.count || 0;
    const parentStarts =
      quizStartStats.find((s: any) => s.quiz_type === "parent")?.count || 0;
    const totalStarts = studentStarts + parentStarts;

    // 2. Quiz Completion Stats
    const quizCompletionStats = analyticsDB.getQuizCompletionStats.all(
      startDate.toISOString()
    ) as any[];
    const studentCompletion = quizCompletionStats.find(
      (s: any) => s.quiz_type === "student"
    ) || { started: 0, completed: 0 };
    const parentCompletion = quizCompletionStats.find(
      (s: any) => s.quiz_type === "parent"
    ) || { started: 0, completed: 0 };

    // 3. Plan Click Stats
    const planClickStats = analyticsDB.getPlanClickStats.all(
      startDate.toISOString()
    ) as any[];
    const studentPlanClicks =
      planClickStats.find((s: any) => s.quiz_type === "student")?.plan_clicks ||
      0;
    const parentPlanClicks =
      planClickStats.find((s: any) => s.quiz_type === "parent")?.plan_clicks ||
      0;

    // 4. Active Users by Email
    const activeUsers = analyticsDB.getActiveUsersByEmail.all(
      startDate.toISOString()
    ) as any[];

    // 5. Black User Visit Logs
    const blackUserLogs = analyticsDB.getBlackUserVisitLogs.all(
      startDate.toISOString()
    ) as any[];

    // 6. Black Buy Clicks Stats
    const blackBuyClicksTotal =
      (analyticsDB.getBlackBuyClicks.get(startDate.toISOString()) as any)
        ?.buy_clicks || 0;
    const blackBuyClicksDaily = analyticsDB.getBlackBuyClicksDaily.all(
      startDate.toISOString()
    ) as any[];
    const blackBuyClicksByPlan = analyticsDB.getBlackBuyClicksByPlan.all(
      startDate.toISOString()
    ) as any[];

    // Calcola percentuale di conversione per la pagina Black
    const blackPageViewsTotal = blackPageVisitsTotal;
    const blackBuyConversionRate =
      blackPageViewsTotal > 0
        ? Math.round((blackBuyClicksTotal / blackPageViewsTotal) * 100)
        : 0;

    // Calcola totali
    const totals = (dailyStats as any[]).reduce(
      (acc: any, day: any) => ({
        unique_visitors: acc.unique_visitors + (day.unique_visitors || 0),
        total_pageviews: acc.total_pageviews + (day.total_pageviews || 0),
        new_sessions: acc.new_sessions + (day.new_sessions || 0),
        quiz_parent_clicks:
          acc.quiz_parent_clicks + (day.quiz_parent_clicks || 0),
        quiz_student_clicks:
          acc.quiz_student_clicks + (day.quiz_student_clicks || 0),
        black_page_visits: acc.black_page_visits + (day.black_page_visits || 0),
        popup_clicks: acc.popup_clicks + (day.popup_clicks || 0),
        conversions: acc.conversions + (day.conversions || 0),
      }),
      {
        unique_visitors: 0,
        total_pageviews: 0,
        new_sessions: 0,
        quiz_parent_clicks: 0,
        quiz_student_clicks: 0,
        black_page_visits: 0,
        popup_clicks: 0,
        conversions: 0,
      }
    );

    return NextResponse.json({
      success: true,
      period: { days, startDate: startDateStr, endDate: endDateStr },
      totals,
      dailyStats,
      conversionFunnel,
      topPages,
      sessionStats,
      recentEvents,
      // Nuovi dati specifici
      funnelEntries: {
        daily: funnelEntriesDaily,
        total: funnelEntriesTotal,
        weeklyTrend: funnelTrend,
      },
      totalVisits: {
        daily: totalVisitsDaily,
        total: totalVisitsTotal,
        weeklyTrend: visitsTrend,
      },
      blackPageVisits: {
        daily: blackPageVisitsDaily,
        total: blackPageVisitsTotal,
        weeklyTrend: blackTrend,
      },
      mentorPageVisits: {
        daily: mentorPageVisitsDaily,
        total: mentorPageVisitsTotal,
        weeklyTrend: mentorTrend,
      },
      functionalityUsage: {
        daily: functionalityUsageDaily,
        weekly: functionalityUsageWeekly,
        monthly: functionalityUsageMonthly,
      },
      blackPageSources: {
        daily: blackPageSourcesDaily,
        weekly: blackPageSourcesWeekly,
        monthly: blackPageSourcesMonthly,
      },

      // Quiz & Business Metrics
      quizMetrics: {
        startStats: {
          student: studentStarts,
          parent: parentStarts,
          total: totalStarts,
          studentPercentage:
            totalStarts > 0
              ? Math.round((studentStarts / totalStarts) * 100)
              : 0,
          parentPercentage:
            totalStarts > 0
              ? Math.round((parentStarts / totalStarts) * 100)
              : 0,
        },
        completionStats: {
          student: {
            started: studentCompletion.started,
            completed: studentCompletion.completed,
            completionRate:
              studentCompletion.started > 0
                ? Math.round(
                    (studentCompletion.completed / studentCompletion.started) *
                      100
                  )
                : 0,
          },
          parent: {
            started: parentCompletion.started,
            completed: parentCompletion.completed,
            completionRate:
              parentCompletion.started > 0
                ? Math.round(
                    (parentCompletion.completed / parentCompletion.started) *
                      100
                  )
                : 0,
          },
        },
        planClicks: {
          student: studentPlanClicks,
          parent: parentPlanClicks,
          total: studentPlanClicks + parentPlanClicks,
        },
      },

      activeUsers: activeUsers,
      blackUserLogs: blackUserLogs,

      // Black Buy Clicks Metrics
      blackBuyMetrics: {
        totalClicks: blackBuyClicksTotal,
        dailyClicks: blackBuyClicksDaily,
        clicksByPlan: blackBuyClicksByPlan,
        conversionRate: blackBuyConversionRate,
        pageViews: blackPageViewsTotal,
      },
    });
  } catch (error) {
    console.error("Errore API dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
