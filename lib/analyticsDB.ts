import { createClient, SupabaseClient } from '@supabase/supabase-js';

// SOLO Supabase PostgreSQL - database hostato affidabile
console.log(`[Analytics DB] Environment: ${process.env.NODE_ENV}`);
console.log(`[Analytics DB] Using ONLY Supabase PostgreSQL database`);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`[Analytics DB] ERRORE: Variabili Supabase mancanti!`);
  console.error(`[Analytics DB] SUPABASE_URL presente: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.error(`[Analytics DB] SERVICE_ROLE_KEY presente: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  throw new Error('Supabase database credentials not found');
}

console.log(`[Analytics DB] Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

let supabase: SupabaseClient;

try {
  // Usa service role key per operazioni server-side
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  console.log(`[Analytics DB] Supabase client created successfully`);
} catch (error) {
  console.error(`[Analytics DB] Failed to create Supabase client:`, error);
  throw error;
}

// Funzione per verificare lo schema del database
async function verifyDatabaseSchema(): Promise<void> {
  console.log('[Analytics DB] Verifying PostgreSQL database schema...')
  
  const tables = ['events', 'sessions', 'conversions', 'daily_stats']
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`[Analytics DB] ${table} table: MISSING`)
      } else {
        console.log(`[Analytics DB] ${table} table: EXISTS`)
      }
    } catch (error) {
      console.log(`[Analytics DB] Error checking ${table} table:`, error)
    }
  }
  
  console.log('[Analytics DB] Database verification completed')
}

// Inizializza database solo quando richiesto (evita overhead in produzione)
const shouldVerifySchema =
  process.env.NODE_ENV === "development" ||
  process.env.ANALYTICS_DB_VERIFY === "1";
const globalScope = globalThis as typeof globalThis & {
  __analyticsSchemaVerified?: boolean;
};
if (shouldVerifySchema && !globalScope.__analyticsSchemaVerified) {
  globalScope.__analyticsSchemaVerified = true;
  void verifyDatabaseSchema();
}

// Funzioni di utilità per PostgreSQL
export const analyticsDB = {
  // Esponi client supabase per query dirette
  supabase,

  // Inserisci evento
  insertEvent: async (eventName: string, pagePath?: string, userId?: string, sessionId?: string, anonId?: string, params?: string, userAgent?: string, ipAddress?: string) => {
    const { data, error } = await supabase
      .from('events')
      .insert({
        event_type: eventName,
        page_url: pagePath,
        user_id: userId,
        session_id: sessionId,
        event_data: params ? JSON.parse(params) : null,
        user_agent: userAgent,
        ip_address: ipAddress
      });
    
    if (error) throw error;
    return data;
  },

  // Inserisci sessione
  insertSession: async (id: string, userId?: string, userAgent?: string, ipAddress?: string, referrer?: string, landingPage?: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        id,
        user_id: userId,
        user_agent: userAgent,
        ip_address: ipAddress,
        referrer,
        landing_page: landingPage
      });
    
    if (error) throw error;
    return data;
  },

  // Update sessione
  updateSession: async (id: string, pagesVisited: number, durationSeconds: number) => {
    const { data, error } = await supabase
      .from('sessions')
      .update({
        end_time: new Date().toISOString(),
        page_views: pagesVisited,
        duration_seconds: durationSeconds
      })
      .eq('id', id);
    
    if (error) throw error;
    return data;
  },

  // Inserisci conversione
  insertConversion: async (conversionType: string, sessionId?: string, userId?: string, anonId?: string, conversionValue?: string, pagePath?: string) => {
    const { data, error } = await supabase
      .from('conversions')
      .insert({
        conversion_type: conversionType,
        session_id: sessionId,
        user_id: userId,
        conversion_value: conversionValue ? parseFloat(conversionValue) : null,
        conversion_data: pagePath ? { page_url: pagePath } : null
      });
    
    if (error) throw error;
    return data;
  },

  // Update daily stats - versione semplificata per Supabase
  updateDailyStats: async (date: string, field: string, increment: number = 1) => {
    try {
      // Controlla se esiste già un record per questa data
      const { data: existingData, error: selectError } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('date', date)
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') {
        console.error(`[Analytics DB] Failed to check daily stats:`, selectError);
        return null;
      }
      
      if (existingData) {
        // Update record esistente
        const newValue = (existingData[field] || 0) + increment;
        const { data: updateData, error: updateError } = await supabase
          .from('daily_stats')
          .update({ 
            [field]: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('date', date)
          .select();
        
        if (updateError) {
          console.error(`[Analytics DB] Failed to update daily stats:`, updateError);
          return null;
        }
        return updateData;
      } else {
        // Inserisci nuovo record
        const { data: insertData, error: insertError } = await supabase
          .from('daily_stats')
          .insert({
            date: date,
            [field]: increment
          })
          .select();
        
        if (insertError) {
          console.error(`[Analytics DB] Failed to insert daily stats:`, insertError);
          return null;
        }
        return insertData;
      }
    } catch (error) {
      console.error(`[Analytics DB] Daily stats operation failed:`, error);
      return null;
    }
  },

  // Get conversion funnel
  getConversionFunnel: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('conversions')
      .select('conversion_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error) throw error;
    
    // Raggruppa i risultati
    const counts: Record<string, number> = {};
    
    data?.forEach((row: any) => {
      counts[row.conversion_type] = (counts[row.conversion_type] || 0) + 1;
    });
    
    return Object.entries(counts).map(([conversion_type, count]) => ({ conversion_type, count }));
  },

  // Get top pages
  getTopPages: async (startDate: string, endDate: string, limit: number = 10) => {
    const { data, error } = await supabase
      .from('events')
      .select('page_url')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .not('page_url', 'is', null);
    
    if (error) throw error;
    
    // Raggruppa per pagina
    const pageCounts: Record<string, number> = {};
    data?.forEach((row: any) => {
      pageCounts[row.page_url] = (pageCounts[row.page_url] || 0) + 1;
    });
    
    return Object.entries(pageCounts)
      .map(([page_url, visits]) => ({ page_url, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, limit);
  },

  // Get buy clicks per day
  getBuyClicksPerDay: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('created_at')
      .eq('event_type', 'buy_click')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error) throw error;
    
    // Raggruppa per giorno
    const dailyCounts: Record<string, number> = {};
    data?.forEach((row: any) => {
      const date = new Date(row.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    
    return Object.entries(dailyCounts)
      .map(([date, buy_clicks]) => ({ date, buy_clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // Get session stats
  getSessionStats: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('duration_seconds, page_views')
      .gte('start_time', startDate)
      .lte('start_time', endDate);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        totalSessions: 0,
        avgDuration: 0,
        avgPageViews: 0
      };
    }
    
    const totalSessions = data.length;
    const avgDuration = data.reduce((sum, session) => sum + (session.duration_seconds || 0), 0) / totalSessions;
    const avgPageViews = data.reduce((sum, session) => sum + (session.page_views || 0), 0) / totalSessions;
    
    return {
      totalSessions,
      avgDuration: Math.round(avgDuration),
      avgPageViews: Math.round(avgPageViews * 10) / 10
    };
  },

  // Get recent events
  getRecentEvents: async (limit: number = 100) => {
    const { data, error } = await supabase
      .from('events')
      .select('event_type, page_url, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  // Get daily stats
  getDailyStats: async (date: string) => {
    const { data, error } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('date', date)
      .limit(1);
    
    if (error) throw error;
    return data || [];
  },

  // Get daily stats range
  getDailyStatsRange: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('daily_stats')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get funnel entries daily
  getFunnelEntriesDaily: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('conversions')
      .select('created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error) throw error;
    
    // Raggruppa per giorno
    const dailyCounts: Record<string, number> = {};
    data?.forEach((row: any) => {
      const date = new Date(row.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    
    return Object.entries(dailyCounts)
      .map(([date, funnel_entries]) => ({ date, funnel_entries }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // Get total visits daily
  getTotalVisitsDaily: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('start_time')
      .gte('start_time', startDate)
      .lte('start_time', endDate);
    
    if (error) throw error;
    
    // Raggruppa per giorno
    const dailyCounts: Record<string, number> = {};
    data?.forEach((row: any) => {
      const date = new Date(row.start_time).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    
    return Object.entries(dailyCounts)
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // Get black page visits daily
  getBlackPageVisitsDaily: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('created_at')
      .eq('event_type', 'page_view')
      .like('page_url', '%/black%')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error) throw error;
    
    // Raggruppa per giorno
    const dailyCounts: Record<string, number> = {};
    data?.forEach((row: any) => {
      const date = new Date(row.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    
    return Object.entries(dailyCounts)
      .map(([date, black_page_visits]) => ({ date, black_page_visits }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  // Get buy clicks daily - nuovo nome per la funzione che già esisteva
  getBuyClicksDaily: async (startDate: string, endDate: string) => {
    return analyticsDB.getBuyClicksPerDay(startDate, endDate);
  },

  // Test connection
  testConnection: async () => {
    try {
      const { count, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, message: 'Database connection successful', count };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  // Debug info
  getTableInfo: async () => {
    try {
      // Test se possiamo accedere alle tabelle usando head request
      const { count: eventsCount, error: eventsError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
        
      const { count: sessionsCount, error: sessionsError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });
      
      return {
        type: 'supabase_postgresql',
        tables: [
          { name: 'events', accessible: !eventsError, count: eventsCount },
          { name: 'sessions', accessible: !sessionsError, count: sessionsCount },
          { name: 'conversions', accessible: true },
          { name: 'daily_stats', accessible: true }
        ]
      };
    } catch (error) {
      return { 
        type: 'supabase_postgresql', 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
};
