// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase env vars are not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local')
  }
  return createClient(url, key)
}
