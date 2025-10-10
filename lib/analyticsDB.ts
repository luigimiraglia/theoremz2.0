import Database from 'better-sqlite3';
import { createClient, type Client } from '@libsql/client';
import path from 'path';

// Determina il tipo di database e inizializza
const isProduction = process.env.NODE_ENV === 'production';
const useCloudDatabase = isProduction && process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;

console.log(`[Analytics DB] Environment: ${process.env.NODE_ENV}`);

let localDB: Database.Database | null = null;
let cloudDB: Client | null = null;

if (useCloudDatabase) {
  // Usa Turso in produzione
  console.log(`[Analytics DB] Using Turso cloud database`);
  cloudDB = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
} else {
  // Usa SQLite locale in sviluppo o come fallback
  const dbPath = path.join(process.cwd(), 'analytics.db');
  console.log(`[Analytics DB] Using local SQLite: ${dbPath}`);
  
  try {
    localDB = new Database(dbPath);
    console.log(`[Analytics DB] Local database initialized successfully`);
    
    // Abilita WAL mode per performance migliori (solo per SQLite locale)
    try {
      localDB.pragma('journal_mode = WAL');
    } catch (error) {
      console.warn(`[Analytics DB] WAL mode not supported:`, error);
      // Fallback a DELETE mode
      localDB.pragma('journal_mode = DELETE');
    }
  } catch (error) {
    console.error(`[Analytics DB] Failed to initialize database:`, error);
    // Fallback: database in memoria se tutto fallisce
    console.log(`[Analytics DB] Falling back to in-memory database`);
    localDB = new Database(':memory:');
  }
}

// Helper function per eseguire query
const executeQuery = async (sql: string, params?: any[]): Promise<any> => {
  if (cloudDB) {
    const result = await cloudDB.execute(sql, params);
    return result;
  } else if (localDB) {
    if (sql.toLowerCase().includes('select')) {
      const stmt = localDB.prepare(sql);
      return params ? stmt.all(...params) : stmt.all();
    } else {
      const stmt = localDB.prepare(sql);
      return params ? stmt.run(...params) : stmt.run();
    }
  }
  throw new Error('No database connection available');
};

// Schema database
const initDB = async () => {
  try {
    console.log(`[Analytics DB] Initializing database schema...`);
    
    // Tabella eventi
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_name TEXT NOT NULL,
        page_path TEXT,
        user_id TEXT,
        session_id TEXT,
        anon_id TEXT,
        params TEXT,
        user_agent TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(`[Analytics DB] Events table created/verified`);

    // Tabella sessioni
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        anon_id TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        pages_visited INTEGER DEFAULT 0,
        duration_seconds INTEGER DEFAULT 0,
        referrer TEXT,
        landing_page TEXT,
        user_agent TEXT,
        ip_address TEXT
      );
    `);
    console.log(`[Analytics DB] Sessions table created/verified`);

    // Tabella conversioni (per trackare il funnel)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        user_id TEXT,
        anon_id TEXT,
        conversion_type TEXT NOT NULL,
        conversion_value TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        page_path TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
    `);
    console.log(`[Analytics DB] Conversions table created/verified`);

    // Tabella statistiche giornaliere (per performance)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        unique_visitors INTEGER DEFAULT 0,
        total_pageviews INTEGER DEFAULT 0,
        new_sessions INTEGER DEFAULT 0,
        quiz_parent_clicks INTEGER DEFAULT 0,
        quiz_student_clicks INTEGER DEFAULT 0,
        black_page_visits INTEGER DEFAULT 0,
        popup_clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(`[Analytics DB] Daily stats table created/verified`);

    // Indici per performance (solo per SQLite locale)
    if (localDB) {
      await executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(created_at);
      `);
      await executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
      `);
      await executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
      `);
      await executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
      `);
      await executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON conversions(timestamp);
      `);
      await executeQuery(`
        CREATE INDEX IF NOT EXISTS idx_conversions_type ON conversions(conversion_type);
      `);
      console.log(`[Analytics DB] Database indices created/verified`);
    }

    console.log(`[Analytics DB] Database initialization completed`);
  } catch (error) {
    console.error(`[Analytics DB] Schema initialization failed:`, error);
  }
};

// Inizializza database
initDB();

// Funzioni di utilità
export const analyticsDB = {
  // Inserisci evento
  insertEvent: async (eventName: string, pagePath?: string, userId?: string, sessionId?: string, anonId?: string, params?: string, userAgent?: string, ipAddress?: string) => {
    return executeQuery(
      `INSERT INTO events (event_name, page_path, user_id, session_id, anon_id, params, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventName, pagePath, userId, sessionId, anonId, params, userAgent, ipAddress]
    );
  },

  // Inserisci sessione
  insertSession: async (id: string, userId?: string, anonId?: string, landingPage?: string, referrer?: string, userAgent?: string, ipAddress?: string) => {
    return executeQuery(
      `INSERT INTO sessions (id, user_id, anon_id, landing_page, referrer, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, anonId, landingPage, referrer, userAgent, ipAddress]
    );
  },

  // Aggiorna sessione
  updateSession: async (id: string, pagesVisited: number, durationSeconds: number) => {
    return executeQuery(
      `UPDATE sessions 
       SET ended_at = CURRENT_TIMESTAMP, pages_visited = ?, duration_seconds = ?
       WHERE id = ?`,
      [pagesVisited, durationSeconds, id]
    );
  },

  // Inserisci conversione
  insertConversion: async (conversionType: string, sessionId?: string, userId?: string, anonId?: string, conversionValue?: string, pagePath?: string) => {
    return executeQuery(
      `INSERT INTO conversions (session_id, user_id, anon_id, conversion_type, conversion_value, page_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, userId, anonId, conversionType, conversionValue, pagePath]
    );
  },

  // Query per analytics dashboard
  getDailyStats: async (date: string) => {
    return executeQuery(`SELECT * FROM daily_stats WHERE date = ?`, [date]);
  },

  getEventsByDateRange: async (startDate: string, endDate: string) => {
    return executeQuery(
      `SELECT DATE(created_at) as date, event_name, COUNT(*) as count
       FROM events 
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at), event_name
       ORDER BY date DESC`,
      [startDate, endDate]
    );
  },

  getConversionFunnel: async (startDate: string, endDate: string) => {
    return executeQuery(
      `SELECT conversion_type, COUNT(*) as count, DATE(timestamp) as date
       FROM conversions 
       WHERE DATE(timestamp) BETWEEN ? AND ?
       GROUP BY conversion_type, DATE(timestamp)
       ORDER BY date DESC`,
      [startDate, endDate]
    );
  },

  getTopPages: async (startDate: string, endDate: string, limit: number = 10) => {
    return executeQuery(
      `SELECT page_path, COUNT(*) as visits
       FROM events 
       WHERE event_name = 'page_view' 
         AND DATE(created_at) BETWEEN ? AND ?
         AND page_path IS NOT NULL
       GROUP BY page_path 
       ORDER BY visits DESC 
       LIMIT ?`,
      [startDate, endDate, limit]
    );
  },

  getSessionStats: async (startDate: string, endDate: string) => {
    return executeQuery(
      `SELECT 
         COUNT(*) as total_sessions,
         COUNT(DISTINCT anon_id) as unique_visitors,
         AVG(duration_seconds) as avg_duration,
         AVG(pages_visited) as avg_pages_per_session
       FROM sessions 
       WHERE DATE(started_at) BETWEEN ? AND ?`,
      [startDate, endDate]
    );
  },

  getDailyStatsRange: async (startDate: string, endDate: string) => {
    return executeQuery(
      `SELECT * FROM daily_stats WHERE date BETWEEN ? AND ? ORDER BY date DESC`,
      [startDate, endDate]
    );
  },

  getRecentEvents: async (limit: number = 100) => {
    return executeQuery(
      `SELECT * FROM events 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [limit]
    );
  },

  // Query specifiche per funnel analysis
  getFunnelEntriesDaily: async (startDate: string, endDate: string) => {
    return executeQuery(
      `SELECT 
         DATE(created_at) as date,
         SUM(CASE WHEN event_name = 'quiz_parent_click' THEN 1 ELSE 0 END) as quiz_parent_clicks,
         SUM(CASE WHEN event_name = 'quiz_student_click' THEN 1 ELSE 0 END) as quiz_student_clicks,
         SUM(CASE WHEN event_name = 'popup_click' THEN 1 ELSE 0 END) as popup_clicks
       FROM events 
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [startDate, endDate]
    );
  },

  getTotalVisitsDaily: async (startDate: string, endDate: string) => {
    return executeQuery(
      `SELECT 
         DATE(created_at) as date,
         COUNT(DISTINCT session_id) as total_visits,
         COUNT(DISTINCT anon_id) as unique_visitors
       FROM events 
       WHERE event_name = 'page_view' AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [startDate, endDate]
    );
  },

  getBlackPageVisitsDaily: async (startDate: string, endDate: string) => {
    return executeQuery(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as black_page_visits,
         COUNT(DISTINCT session_id) as unique_black_visitors
       FROM events 
       WHERE page_path = '/black' AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [startDate, endDate]
    );
  },

  getBuyClicksDaily: async (startDate: string, endDate: string) => {
    return executeQuery(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as buy_clicks,
         COUNT(DISTINCT session_id) as unique_buyers
       FROM events 
       WHERE event_name = 'subscribe_click' AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [startDate, endDate]
    );
  },

  // Test di connettività
  testConnection: async () => {
    try {
      const result = await executeQuery(`SELECT 1 as test`);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  // Debug info
  getTableInfo: async () => {
    try {
      if (localDB) {
        return {
          type: 'local_sqlite',
          tables: localDB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
        };
      } else if (cloudDB) {
        const tables = await cloudDB.execute("SELECT name FROM sqlite_master WHERE type='table'");
        return {
          type: 'turso_cloud',
          tables: tables.rows
        };
      }
      return { type: 'none', tables: [] };
    } catch (error) {
      return { type: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  }
};

export default analyticsDB;