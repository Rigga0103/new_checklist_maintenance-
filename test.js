const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://shgloxculzfaghlirxxy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ2xveGN1bHpmYWdobGlyeHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjE3OTAsImV4cCI6MjA4NTgzNzc5MH0.waONkQ1YEqQHI3Lyubf4P9etzjyF3dgkPRtJB2LAXr8');

async function test() {
    const { data, error } = await supabase.from('holidays').select('*').limit(1);
    console.log('Holidays:', error || data);
    const { data: d2, error: e2 } = await supabase.from('working_days').select('*').limit(1);
    console.log('Working Days:', e2 || d2);
    const { data: d3, error: e3 } = await supabase.from('holiday').select('*').limit(1);
    console.log('Holiday:', e3 || d3);
    const { data: d4, error: e4 } = await supabase.from('working_day').select('*').limit(1);
    console.log('Working Day:', e4 || d4);
}

test();
