import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdjxrusqywiraonfwujq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkanhydXNxeXdpcmFvbmZ3dWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTUwMjQsImV4cCI6MjA2NjkzMTAyNH0.JhZuVdWlMUhOsQEhfySWBAlauVWkjLM-FRFNftf4L9A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})