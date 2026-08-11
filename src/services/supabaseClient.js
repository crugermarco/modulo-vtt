import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseStatus = createClient(
  'https://axcaxcuojkehuasrstog.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4Y2F4Y3VvamtlaHVhc3JzdG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NzkxNDEsImV4cCI6MjA5MjQ1NTE0MX0.oSqxzEMvGOLZnbkmpEWLMeexfyFnG_QkdeS3wwi7bDM'
)

export const subscribeToZabChanges = (callback) => {
  const subscription = supabase
    .channel('zab-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tower_sent' }, (payload) => {
      callback(payload)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(subscription)
  }
}