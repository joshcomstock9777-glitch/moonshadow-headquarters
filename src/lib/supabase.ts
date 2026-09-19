import { createClient } from '@supabase/supabase-js'

function requireClientEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Headquarters configuration error: ${name} is required.`)
  }
  return value.trim()
}

const supabaseUrl = requireClientEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = requireClientEnv('VITE_SUPABASE_ANON_KEY')

if (!/^https:\/\/[^/]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  throw new Error('Headquarters configuration error: VITE_SUPABASE_URL must be a Supabase HTTPS project URL.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
