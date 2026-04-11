// src/app/actions/entries.ts
'use server'

import { getSupabaseClient } from '@/lib/supabase'

export interface EntryRow {
  id: string
  created_at: string
  transcript: string
  fact_ratio: number
  emotion_ratio: number
  passive_ratio: number
  thinking_profile: string
  ai_comment: string
}

export async function getEntries(limit = 100): Promise<EntryRow[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`ログ取得失敗: ${error.message}`)
  return (data ?? []) as EntryRow[]
}

export async function getEntryById(id: string): Promise<EntryRow | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as EntryRow
}
