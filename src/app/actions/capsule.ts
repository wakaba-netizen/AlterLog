'use server'

import { getSupabaseClient } from '@/lib/supabase'

export interface TimeCapsule {
  id: string
  created_at: string
  open_at: string
  title: string
  content: string
  is_opened: boolean
}

export async function createCapsule(
  title: string,
  content: string,
  openAt: string
): Promise<TimeCapsule> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('time_capsules')
    .insert({ title, content, open_at: openAt })
    .select()
    .single()

  if (error) throw new Error(`タイムカプセル作成失敗: ${error.message}`)
  return data as TimeCapsule
}

export async function getCapsules(): Promise<TimeCapsule[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('time_capsules')
    .select('*')
    .order('open_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as TimeCapsule[]
}

export async function openCapsule(id: string): Promise<TimeCapsule> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('time_capsules')
    .update({ is_opened: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as TimeCapsule
}
