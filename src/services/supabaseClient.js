import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const subscribeToZabChanges = (callback) => {
  const subscription = supabase
    .channel('zab-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tower_sent' }, (payload) => {
      callback(payload)
    })
    .subscribe()

  return () => { supabase.removeChannel(subscription) }
}