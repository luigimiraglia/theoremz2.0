import { NextResponse } from "next/server";
import { analyticsDB } from "@/lib/analyticsDB";

export async function GET() {
  try {
    console.log('[Debug API] Testing database connection...');
    
    // Test 1: Verifica se il database esiste e ha eventi
    let totalEvents = 0;
    try {
      // Usa una query esistente per contare gli eventi
      const events = analyticsDB.getRecentEvents.all(new Date(Date.now() - 30*24*60*60*1000).toISOString());
      totalEvents = events.length;
      console.log('[Debug API] Total recent events found:', totalEvents);
      console.log('[Debug API] Sample events:', events.slice(0, 3));
    } catch (error) {
      console.error('[Debug API] Error querying events:', error);
    }

    // Test 2: Prova a fare una query di daily stats
    let dailyStatsCount = 0;
    try {
      const startDate = new Date(Date.now() - 7*24*60*60*1000).toISOString().split("T")[0];
      const endDate = new Date().toISOString().split("T")[0];
      const dailyStats = analyticsDB.getDailyStatsRange.all(startDate, endDate);
      dailyStatsCount = dailyStats.length;
      console.log('[Debug API] Daily stats found:', dailyStatsCount);
      console.log('[Debug API] Sample daily stats:', dailyStats.slice(0, 2));
    } catch (error) {
      console.error('[Debug API] Error querying daily stats:', error);
    }

    // Test 3: Prova Black user logs
    let blackUsersCount = 0;
    try {
      const blackUsers = analyticsDB.getBlackUserVisitLogs.all(new Date(Date.now() - 7*24*60*60*1000).toISOString());
      blackUsersCount = blackUsers.length;
      console.log('[Debug API] Black users found:', blackUsersCount);
      console.log('[Debug API] Sample black users:', blackUsers.slice(0, 2));
    } catch (error) {
      console.error('[Debug API] Error querying black users:', error);
    }

    return NextResponse.json({
      success: true,
      debug: {
        totalEvents,
        dailyStatsCount,
        blackUsersCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Debug API] Critical error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}