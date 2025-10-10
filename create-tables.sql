-- Analytics database schema for PostgreSQL (Supabase)
-- Create all necessary tables for the analytics system

-- Events table for tracking user interactions
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    page_url TEXT,
    referrer TEXT
);

-- Sessions table for tracking user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    page_views INTEGER DEFAULT 0,
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    landing_page TEXT,
    exit_page TEXT,
    duration_seconds INTEGER DEFAULT 0
);

-- Conversions table for tracking goal completions
CREATE TABLE IF NOT EXISTS conversions (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    session_id TEXT NOT NULL,
    conversion_type TEXT NOT NULL,
    conversion_value DECIMAL(10,2),
    conversion_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Daily stats table for aggregated analytics data
CREATE TABLE IF NOT EXISTS daily_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_visitors INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    avg_session_duration DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_conversions_session_id ON conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversions_type ON conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON conversions(created_at);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role access
CREATE POLICY "Service role can manage events" ON events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sessions" ON sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage conversions" ON conversions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage daily_stats" ON daily_stats
    FOR ALL USING (auth.role() = 'service_role');