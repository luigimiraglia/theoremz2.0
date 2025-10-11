const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkDatabaseData() {
  console.log('🔍 Checking database data...');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check events table structure first
    const { data: eventsStructure, error: eventsStructureError } = await supabase
      .rpc('get_table_columns', { table_name: 'events' })
      .single();

    console.log('\n🔍 Events table structure:');
    
    // Simple check by trying different column names
    const eventColumns = ['timestamp', 'created_at', 'event_time'];
    let eventsTimeColumn = null;
    
    for (const col of eventColumns) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(col)
          .limit(1);
        if (!error) {
          eventsTimeColumn = col;
          break;
        }
      } catch (e) {
        // Continue to next column
      }
    }

    // Check events table
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .order(eventsTimeColumn || 'id', { ascending: false })
      .limit(5);

    console.log('\n📊 Recent events:');
    if (eventsError) {
      console.error('Error:', eventsError);
    } else {
      console.log(`Found ${events.length} events:`);
      if (events.length > 0) {
        console.log('Sample event:', JSON.stringify(events[0], null, 2));
        
        // Group events by type
        const eventTypes = {};
        events.forEach(event => {
          eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
        });
        console.log('Event types breakdown:', eventTypes);
        
        // Group by page_url for page_view events
        const pageViews = events.filter(e => e.event_type === 'page_view');
        const pageUrls = {};
        pageViews.forEach(event => {
          const url = event.page_url || 'unknown';
          pageUrls[url] = (pageUrls[url] || 0) + 1;
        });
        console.log('Page views by URL:', pageUrls);
      }
    }

    // Check daily_stats
    const { data: dailyStats, error: statsError } = await supabase
      .from('daily_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(5);

    console.log('\n📈 Daily stats:');
    if (statsError) {
      console.error('Error:', statsError);
    } else {
      console.log(`Found ${dailyStats.length} daily stat records:`);
      if (dailyStats.length > 0) {
        console.log('Sample daily stat:', JSON.stringify(dailyStats[0], null, 2));
      }
    }

    // Get date range for last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get summary for last 7 days - just check what columns exist
    const { data: weekStats, error: weekError } = await supabase
      .from('daily_stats')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    console.log(`\n📅 Last 7 days summary (${startDateStr} to ${endDateStr}):`);
    if (weekError) {
      console.error('Error:', weekError);
    } else {
      console.log(`Found ${weekStats.length} records:`);
      if (weekStats.length > 0) {
        console.log('Available columns:', Object.keys(weekStats[0]));
        console.log('Sample record:', JSON.stringify(weekStats[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Database check error:', error);
  }
}

checkDatabaseData();