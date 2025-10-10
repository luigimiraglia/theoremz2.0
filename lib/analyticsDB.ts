import Database from 'better-sqlite3';
import path from 'path';

// Determina il percorso del database basato sull'ambiente
const isProduction = process.env.NODE_ENV === 'production';
let dbPath: string;

if (isProduction) {
  // In produzione, prova diversi percorsi
  const tempDir = process.env.VERCEL_TEMP_DIR || process.env.TMPDIR || '/tmp';
  dbPath = path.join(tempDir, 'analytics.db');
  console.log(`[Analytics DB] Production mode - temp dir: ${tempDir}`);
} else {
  // In sviluppo, usa la directory del progetto
  dbPath = path.join(process.cwd(), 'analytics.db');
}

console.log(`[Analytics DB] Environment: ${process.env.NODE_ENV}`);
console.log(`[Analytics DB] Using database path: ${dbPath}`);

let db: Database.Database;

try {
  db = new Database(dbPath);
  console.log(`[Analytics DB] Database initialized successfully`);
  
  // Abilita WAL mode per performance migliori (solo se supportato)
  try {
    db.pragma('journal_mode = WAL');
  } catch (error) {
    console.warn(`[Analytics DB] WAL mode not supported:`, error);
    // Fallback a DELETE mode
    db.pragma('journal_mode = DELETE');
  }
} catch (error) {
  console.error(`[Analytics DB] Failed to initialize database:`, error);
  // Fallback: database in memoria se tutto fallisce
  console.log(`[Analytics DB] Falling back to in-memory database`);
  db = new Database(':memory:');
}

// Schema database
const initDB = () => {
  try {
    console.log(`[Analytics DB] Initializing database schema...`);
    
    // Tabella eventi analytics
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        event_name TEXT NOT NULL,
        page_path TEXT,
        user_id TEXT,
        session_id TEXT,
        anon_id TEXT,
        params TEXT, -- JSON string
        user_agent TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(`[Analytics DB] Events table created/verified`);
  } catch (error) {
    console.error(`[Analytics DB] Error creating events table:`, error);
  }

  try {
    // Tabella sessioni
    db.exec(`
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
  } catch (error) {
    console.error(`[Analytics DB] Error creating sessions table:`, error);
  }

  try {
    // Tabella conversioni (per trackare il funnel)
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        user_id TEXT,
        anon_id TEXT,
        conversion_type TEXT NOT NULL, -- 'quiz_parent', 'quiz_student', 'black_page_visit', 'popup_click', 'purchase'
        conversion_value TEXT, -- dettagli specifici
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        page_path TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
    `);
    console.log(`[Analytics DB] Conversions table created/verified`);
  } catch (error) {
    console.error(`[Analytics DB] Error creating conversions table:`, error);
  }

  try {
    // Tabella statistiche giornaliere (per performance)
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY, -- YYYY-MM-DD
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
  } catch (error) {
    console.error(`[Analytics DB] Error creating daily stats table:`, error);
  }

  try {
    // Indici per performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
      CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON conversions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversions_type ON conversions(conversion_type);
    `);
    console.log(`[Analytics DB] Database indices created/verified`);
  } catch (error) {
    console.error(`[Analytics DB] Error creating database indices:`, error);
  }
};

// Inizializza database
initDB();

// Funzioni di utilità
export const analyticsDB = {
  // Inserisci evento
  insertEvent: db.prepare(`
    INSERT INTO events (event_name, page_path, user_id, session_id, anon_id, params, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  // Inserisci sessione
  insertSession: db.prepare(`
    INSERT INTO sessions (id, user_id, anon_id, landing_page, referrer, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  // Aggiorna sessione
  updateSession: db.prepare(`
    UPDATE sessions 
    SET ended_at = CURRENT_TIMESTAMP, pages_visited = ?, duration_seconds = ?
    WHERE id = ?
  `),

  // Inserisci conversione
  insertConversion: db.prepare(`
    INSERT INTO conversions (session_id, user_id, anon_id, conversion_type, conversion_value, page_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  // Ottieni o crea statistiche giornaliere
  getDailyStats: db.prepare(`
    SELECT * FROM daily_stats WHERE date = ?
  `),

  // Aggiorna statistiche giornaliere
  updateDailyStats: db.prepare(`
    INSERT OR REPLACE INTO daily_stats 
    (date, unique_visitors, total_pageviews, new_sessions, quiz_parent_clicks, quiz_student_clicks, black_page_visits, popup_clicks, conversions, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `),

  // Query analytics
  getEventsByDateRange: db.prepare(`
    SELECT * FROM events 
    WHERE timestamp BETWEEN ? AND ?
    ORDER BY timestamp DESC
  `),

  getConversionFunnel: db.prepare(`
    SELECT 
      conversion_type,
      COUNT(*) as count,
      DATE(timestamp) as date
    FROM conversions 
    WHERE timestamp >= ?
    GROUP BY conversion_type, DATE(timestamp)
    ORDER BY date DESC, conversion_type
  `),

  getTopPages: db.prepare(`
    SELECT 
      page_path,
      COUNT(*) as visits,
      COUNT(DISTINCT session_id) as unique_visitors
    FROM events 
    WHERE event_name = 'page_view' AND timestamp >= ?
    GROUP BY page_path
    ORDER BY visits DESC
    LIMIT 20
  `),

  getSessionStats: db.prepare(`
    SELECT 
      DATE(started_at) as date,
      COUNT(*) as sessions,
      COUNT(DISTINCT COALESCE(user_id, anon_id)) as unique_visitors,
      AVG(duration_seconds) as avg_duration,
      AVG(pages_visited) as avg_pages
    FROM sessions 
    WHERE started_at >= ?
    GROUP BY DATE(started_at)
    ORDER BY date DESC
  `),

  // Query aggiuntive per la dashboard
  getDailyStatsRange: db.prepare(`
    SELECT * FROM daily_stats 
    WHERE date BETWEEN ? AND ?
    ORDER BY date DESC
  `),

  getRecentEvents: db.prepare(`
    SELECT event_name, COUNT(*) as count
    FROM events 
    WHERE timestamp >= ?
    GROUP BY event_name
    ORDER BY count DESC
    LIMIT 10
  `),

  // Query per funnel entries (/start)
  getFunnelEntriesDaily: db.prepare(`
    SELECT DATE(timestamp) as date, COUNT(DISTINCT session_id) as count
    FROM events 
    WHERE event_name = 'page_view' 
    AND page_path LIKE '%/start%'
    AND timestamp >= ?
    GROUP BY DATE(timestamp)
    ORDER BY date
  `),

  // Query per visite totali giornaliere
  getTotalVisitsDaily: db.prepare(`
    SELECT DATE(timestamp) as date, COUNT(*) as count
    FROM events 
    WHERE event_name = 'page_view'
    AND timestamp >= ?
    GROUP BY DATE(timestamp)
    ORDER BY date
  `),

  // Query per visite pagina black giornaliere
  getBlackPageVisitsDaily: db.prepare(`
    SELECT DATE(timestamp) as date, COUNT(DISTINCT session_id) as count
    FROM events 
    WHERE event_name = 'page_view' 
    AND page_path LIKE '%/black%'
    AND timestamp >= ?
    GROUP BY DATE(timestamp)
    ORDER BY date
  `),

  // Query per visite pagina mentor giornaliere
  getMentorPageVisitsDaily: db.prepare(`
    SELECT DATE(timestamp) as date, COUNT(DISTINCT session_id) as count
    FROM events 
    WHERE event_name = 'page_view' 
    AND page_path LIKE '%/mentor%'
    AND timestamp >= ?
    GROUP BY DATE(timestamp)
    ORDER BY date
  `),

  // Query per utilizzo funzionalità giornaliero
  getFunctionalityUsageDaily: db.prepare(`
    SELECT DATE(timestamp) as date, params as functionality, COUNT(DISTINCT session_id) as count
    FROM events 
    WHERE event_name IN ('popup_click', 'conversion')
    AND timestamp >= ?
    GROUP BY DATE(timestamp), params
    ORDER BY date, functionality
  `),

  // Query per utilizzo funzionalità settimanale
  getFunctionalityUsageWeekly: db.prepare(`
    SELECT strftime('%Y-W%W', timestamp) as week, params as functionality, COUNT(DISTINCT session_id) as count
    FROM events 
    WHERE event_name IN ('popup_click', 'conversion')
    AND timestamp >= ?
    GROUP BY strftime('%Y-W%W', timestamp), params
    ORDER BY week, functionality
  `),

  // Query per utilizzo funzionalità mensile
  getFunctionalityUsageMonthly: db.prepare(`
    SELECT strftime('%Y-%m', timestamp) as month, params as functionality, COUNT(DISTINCT session_id) as count
    FROM events 
    WHERE event_name IN ('popup_click', 'conversion')
    AND timestamp >= ?
    GROUP BY strftime('%Y-%m', timestamp), params
    ORDER BY month, functionality
  `),

  // Query per sorgenti pagina black giornaliere
  getBlackPageSourcesDaily: db.prepare(`
    SELECT DATE(e1.timestamp) as date, e1.params as source, COUNT(DISTINCT e1.session_id) as count
    FROM events e1
    JOIN events e2 ON e1.session_id = e2.session_id 
    WHERE e1.event_name = 'popup_click'
    AND e2.event_name = 'page_view' 
    AND e2.page_path LIKE '%/black%'
    AND e2.timestamp > e1.timestamp
    AND e2.timestamp - e1.timestamp < 300000
    AND e1.timestamp >= ?
    GROUP BY DATE(e1.timestamp), e1.params
    ORDER BY date, source
  `),

  // Query per sorgenti pagina black settimanali
  getBlackPageSourcesWeekly: db.prepare(`
    SELECT strftime('%Y-W%W', e1.timestamp) as week, e1.params as source, COUNT(DISTINCT e1.session_id) as count
    FROM events e1
    JOIN events e2 ON e1.session_id = e2.session_id 
    WHERE e1.event_name = 'popup_click'
    AND e2.event_name = 'page_view' 
    AND e2.page_path LIKE '%/black%'
    AND e2.timestamp > e1.timestamp
    AND e2.timestamp - e1.timestamp < 300000
    AND e1.timestamp >= ?
    GROUP BY strftime('%Y-W%W', e1.timestamp), e1.params
    ORDER BY week, source
  `),

  // Query per sorgenti pagina black mensili
  getBlackPageSourcesMonthly: db.prepare(`
    SELECT strftime('%Y-%m', e1.timestamp) as month, e1.params as source, COUNT(DISTINCT e1.session_id) as count
    FROM events e1
    JOIN events e2 ON e1.session_id = e2.session_id 
    WHERE e1.event_name = 'popup_click'
    AND e2.event_name = 'page_view' 
    AND e2.page_path LIKE '%/black%'
    AND e2.timestamp > e1.timestamp
    AND e2.timestamp - e1.timestamp < 300000
    AND e1.timestamp >= ?
    GROUP BY strftime('%Y-%m', e1.timestamp), e1.params
    ORDER BY month, source
  `),

  // Query per statistiche quiz - Start studente vs genitore
  getQuizStartStats: db.prepare(`
    SELECT 
      CASE 
        WHEN page_path LIKE '%/start-studente%' THEN 'student'
        WHEN page_path LIKE '%/start-genitore%' THEN 'parent'
        ELSE 'other'
      END as quiz_type,
      COUNT(DISTINCT session_id) as count
    FROM events 
    WHERE event_name = 'page_view' 
    AND (page_path LIKE '%/start-studente%' OR page_path LIKE '%/start-genitore%')
    AND timestamp >= ?
    GROUP BY quiz_type
  `),

  // Query per completion rate quiz
  getQuizCompletionStats: db.prepare(`
    SELECT 
      CASE 
        WHEN e1.page_path LIKE '%/start-studente%' THEN 'student'
        WHEN e1.page_path LIKE '%/start-genitore%' THEN 'parent'
        ELSE 'other'
      END as quiz_type,
      COUNT(DISTINCT e1.session_id) as started,
      COUNT(DISTINCT e2.session_id) as completed
    FROM events e1
    LEFT JOIN events e2 ON e1.session_id = e2.session_id 
      AND e2.event_name = 'conversion'
      AND e2.params LIKE '%quiz_completed%'
      AND e2.timestamp > e1.timestamp
    WHERE e1.event_name = 'page_view'
    AND (e1.page_path LIKE '%/start-studente%' OR e1.page_path LIKE '%/start-genitore%')
    AND e1.timestamp >= ?
    GROUP BY quiz_type
  `),

  // Query per click sui piani assegnati
  getPlanClickStats: db.prepare(`
    SELECT 
      CASE 
        WHEN e1.page_path LIKE '%/start-studente%' THEN 'student'
        WHEN e1.page_path LIKE '%/start-genitore%' THEN 'parent'
        ELSE 'other'
      END as quiz_type,
      COUNT(DISTINCT e2.session_id) as plan_clicks
    FROM events e1
    JOIN events e2 ON e1.session_id = e2.session_id 
    WHERE e1.event_name = 'page_view'
    AND (e1.page_path LIKE '%/start-studente%' OR e1.page_path LIKE '%/start-genitore%')
    AND e2.event_name = 'conversion'
    AND e2.params LIKE '%plan_click%'
    AND e2.timestamp > e1.timestamp
    AND e1.timestamp >= ?
    GROUP BY quiz_type
  `),

  // Query per utenti più attivi per email
  getActiveUsersByEmail: db.prepare(`
    SELECT 
      COALESCE(s.user_id, 'anonymous') as email,
      COUNT(DISTINCT e.session_id) as total_visits,
      MAX(e.timestamp) as last_visit,
      CASE WHEN EXISTS(
        SELECT 1 FROM events e2 
        WHERE e2.session_id = e.session_id 
        AND e2.page_path LIKE '%/black%'
      ) THEN 1 ELSE 0 END as is_black_user
    FROM events e
    LEFT JOIN sessions s ON e.session_id = s.id
    WHERE e.event_name = 'page_view'
    AND e.timestamp >= ?
    GROUP BY COALESCE(s.user_id, e.session_id)
    HAVING total_visits > 1
    ORDER BY total_visits DESC, last_visit DESC
    LIMIT 50
  `),

  // Query per log visite utenti Black con email (include anche anonimi per debug)
  getBlackUserVisitLogs: db.prepare(`
    SELECT 
      COALESCE(s.user_id, 'anonymous_' || SUBSTR(e.session_id, 1, 8)) as email,
      COUNT(DISTINCT e.session_id) as page_visits,
      MAX(e.timestamp) as last_visit,
      CASE WHEN s.user_id IS NOT NULL THEN 1 ELSE 0 END as is_authenticated
    FROM events e
    LEFT JOIN sessions s ON e.session_id = s.id
    WHERE e.event_name = 'page_view'
    AND e.page_path LIKE '%/black%'
    AND e.timestamp >= ?
    GROUP BY COALESCE(s.user_id, e.session_id)
    ORDER BY 
      CASE WHEN s.user_id IS NOT NULL THEN 1 ELSE 0 END DESC,
      COUNT(DISTINCT e.session_id) DESC, 
      MAX(e.timestamp) DESC
    LIMIT 50
  `),

  // Query per Buy Clicks sulla pagina Black
  getBlackBuyClicks: db.prepare(`
    SELECT COUNT(*) as buy_clicks
    FROM events 
    WHERE event_name = 'subscribe_click'
    AND session_id IN (
      SELECT DISTINCT session_id FROM events 
      WHERE page_path LIKE '%/black%' 
      AND event_name = 'page_view'
    )
    AND timestamp >= ?
  `),

  getBlackBuyClicksDaily: db.prepare(`
    SELECT DATE(timestamp) as date, COUNT(*) as count
    FROM events 
    WHERE event_name = 'subscribe_click'
    AND session_id IN (
      SELECT DISTINCT session_id FROM events 
      WHERE page_path LIKE '%/black%' 
      AND event_name = 'page_view'
    )
    AND timestamp >= ?
    GROUP BY DATE(timestamp)
    ORDER BY date
  `),

  getBlackBuyClicksByPlan: db.prepare(`
    SELECT 
      JSON_EXTRACT(params, '$.plan') as plan,
      JSON_EXTRACT(params, '$.price') as price,
      COUNT(*) as clicks
    FROM events 
    WHERE event_name = 'subscribe_click'
    AND session_id IN (
      SELECT DISTINCT session_id FROM events 
      WHERE page_path LIKE '%/black%' 
      AND event_name = 'page_view'
    )
    AND timestamp >= ?
    GROUP BY JSON_EXTRACT(params, '$.plan'), JSON_EXTRACT(params, '$.price')
    ORDER BY clicks DESC
  `)
};

export default db;