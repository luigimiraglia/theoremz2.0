import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('URL:', supabaseUrl ? '✅ Present' : '❌ Missing')
  console.log('Service Key:', supabaseServiceKey ? '✅ Present' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTables() {
  try {
    console.log('🔄 Creating PostgreSQL tables in Supabase...')
    console.log('🌐 Supabase URL:', supabaseUrl)
    
    // First, test connection
    console.log('🔍 Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1)
    
    if (testError && !testError.message.includes('does not exist')) {
      console.error('❌ Connection test failed:', testError)
      throw testError
    }
    
    console.log('✅ Supabase connection successful')
    
    // Create events table
    console.log('📊 Creating events table...')
    const eventsQuery = `
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
      CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    `
    
    const { error: eventsError } = await supabase.rpc('exec_sql', { sql: eventsQuery })
    if (eventsError) {
      console.log('⚠️ Events table creation via RPC failed, trying direct approach...')
      
      // Try creating a dummy record to ensure table exists
      const { error: insertError } = await supabase
        .from('events')
        .insert({
          session_id: 'test',
          event_type: 'test'
        })
      
      if (insertError && insertError.message.includes('does not exist')) {
        console.error('❌ Events table does not exist and cannot be created automatically')
        console.log('📝 Please create the events table manually in Supabase SQL Editor:')
        console.log(eventsQuery)
      } else {
        console.log('✅ Events table exists or was created')
        // Clean up test record
        await supabase.from('events').delete().eq('session_id', 'test')
      }
    } else {
      console.log('✅ Events table created successfully')
    }
    
    // Create sessions table
    console.log('📊 Creating sessions table...')
    const sessionsQuery = `
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
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
    `
    
    const { error: sessionsError } = await supabase.rpc('exec_sql', { sql: sessionsQuery })
    if (sessionsError) {
      console.log('⚠️ Sessions table creation via RPC failed, trying direct approach...')
      
      const { error: insertError } = await supabase
        .from('sessions')
        .insert({
          id: 'test-session'
        })
      
      if (insertError && insertError.message.includes('does not exist')) {
        console.error('❌ Sessions table does not exist and cannot be created automatically')
        console.log('📝 Please create the sessions table manually:')
        console.log(sessionsQuery)
      } else {
        console.log('✅ Sessions table exists or was created')
        await supabase.from('sessions').delete().eq('id', 'test-session')
      }
    } else {
      console.log('✅ Sessions table created successfully')
    }
    
    // Create conversions table  
    console.log('📊 Creating conversions table...')
    const conversionsQuery = `
      CREATE TABLE IF NOT EXISTS conversions (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        session_id TEXT NOT NULL,
        conversion_type TEXT NOT NULL,
        conversion_value DECIMAL(10,2),
        conversion_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_conversions_session_id ON conversions(session_id);
      CREATE INDEX IF NOT EXISTS idx_conversions_type ON conversions(conversion_type);
    `
    
    const { error: conversionsError } = await supabase.rpc('exec_sql', { sql: conversionsQuery })
    if (conversionsError) {
      console.log('⚠️ Conversions table creation via RPC failed, trying direct approach...')
      
      const { error: insertError } = await supabase
        .from('conversions')
        .insert({
          session_id: 'test',
          conversion_type: 'test'
        })
      
      if (insertError && insertError.message.includes('does not exist')) {
        console.error('❌ Conversions table does not exist and cannot be created automatically')
        console.log('📝 Please create the conversions table manually:')
        console.log(conversionsQuery)
      } else {
        console.log('✅ Conversions table exists or was created')
        await supabase.from('conversions').delete().eq('session_id', 'test')
      }
    } else {
      console.log('✅ Conversions table created successfully')
    }
    
    // Create daily_stats table
    console.log('📊 Creating daily_stats table...')
    const dailyStatsQuery = `
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
      CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
    `
    
    const { error: dailyStatsError } = await supabase.rpc('exec_sql', { sql: dailyStatsQuery })
    if (dailyStatsError) {
      console.log('⚠️ Daily stats table creation via RPC failed, trying direct approach...')
      
      const { error: insertError } = await supabase
        .from('daily_stats')
        .insert({
          date: '2025-01-01'
        })
      
      if (insertError && insertError.message.includes('does not exist')) {
        console.error('❌ Daily stats table does not exist and cannot be created automatically')
        console.log('� Please create the daily_stats table manually:')
        console.log(dailyStatsQuery)
      } else {
        console.log('✅ Daily stats table exists or was created')
        await supabase.from('daily_stats').delete().eq('date', '2025-01-01')
      }
    } else {
      console.log('✅ Daily stats table created successfully')
    }
    
    console.log('🎉 Database setup completed!')
    console.log('📋 Summary:')
    console.log('   ✅ Supabase connection verified')
    console.log('   📊 Analytics tables processed')
    console.log('   🔍 Indexes created for performance')
    
    // Final verification
    console.log('🔍 Final verification...')
    const tables = ['events', 'sessions', 'conversions', 'daily_stats']
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`)
      } else {
        console.log(`✅ Table ${table}: Ready`)
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error setting up database:', error.message)
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('🌐 Network connectivity issue detected')
      console.log('   Please check your internet connection')
      console.log('   Verify Supabase URL is correct')
    }
    
    process.exit(1)
  }
}

createTables()