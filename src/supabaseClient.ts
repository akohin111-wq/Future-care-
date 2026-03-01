import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oonxwqdayfnlfetdiufx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbnh3cWRheWZubGZldGRpdWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTkwMjcsImV4cCI6MjA4NzA5NTAyN30.s6dHWxURD6NLLZuVK3F0lGXkrE_F-10VA61DFWmz8pk';

export const supabase = createClient(supabaseUrl, supabaseKey);
