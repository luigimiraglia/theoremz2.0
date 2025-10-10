import { NextResponse } from "next/server";
import { analyticsDB } from "@/lib/analyticsDB";

export async function GET() {
  try {
    console.log('[Debug API] Testing database connection...');
    
    // Test 1: Verifica se il database esiste e ha eventi
    let totalEvents = 0;
    try {
      const events = await analyticsDB.getRecentEvents(100);
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
      const dailyStats = await analyticsDB.getDailyStatsRange(startDate, endDate);
      dailyStatsCount = dailyStats.length;
      console.log('[Debug API] Daily stats found:', dailyStatsCount);
      console.log('[Debug API] Sample daily stats:', dailyStats.slice(0, 2));
    } catch (error) {
      console.error('[Debug API] Error querying daily stats:', error);
    }

    // Test 3: Test connessione database
    const connectionTest = await analyticsDB.testConnection();
    console.log('[Debug API] Connection test result:', connectionTest);

    // Test 4: Informazioni sulle tabelle
    const tableInfo = await analyticsDB.getTableInfo();
    console.log('[Debug API] Table info:', tableInfo);

    return NextResponse.json({
      success: true,
      tests: {
        totalEvents,
        dailyStatsCount,
        connectionTest,
        tableInfo
      },
      timestamp: new Date().toISOString(),
      message: "Database debug completed successfully"
    });

  } catch (error) {
    console.error('[Debug API] General error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}