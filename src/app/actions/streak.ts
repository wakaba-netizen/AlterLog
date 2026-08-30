// src/app/actions/streak.ts
'use server'

import { getSupabaseClient } from '@/lib/supabase'
import { computeStreak, type StreakData } from '@/app/lib/streak'

// 録音データの作成日時からストリーク情報を計算して返す
export async function getStreakData(): Promise<StreakData> {
  const supabase = getSupabaseClient()
  // created_at のみを新しい順に取得（1年以上遡れるよう十分な件数）
  const { data, error } = await supabase
    .from('entries')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(400)

  if (error) throw new Error(`ストリーク取得失敗: ${error.message}`)

  const timestamps = (data ?? []).map(r => (r as { created_at: string }).created_at)
  return computeStreak(timestamps)
}
