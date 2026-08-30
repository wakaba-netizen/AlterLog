// src/app/lib/streak.ts
// ジャーナリングの継続判定・ストリーク（連続達成日数）計算（純粋関数）
// すべて日本時間（Asia/Tokyo）基準で日付を判定する。

export interface WeekDay {
  key: string      // 'YYYY-MM-DD'（JST）
  label: string    // 曜日ラベル（月〜日）
  done: boolean    // その日に録音があったか
  isToday: boolean
  isFuture: boolean
}

export interface StreakData {
  streak: number       // 現在の連続達成日数
  todayDone: boolean   // 本日分の録音が済んでいるか
  week: WeekDay[]      // 今週（月〜日）のチェックリスト
}

// Date → JSTの 'YYYY-MM-DD' 文字列
export function jstDateKey(d: Date): string {
  // en-CA ロケールは YYYY-MM-DD 形式を返す
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

// 'YYYY-MM-DD' に delta 日を加算した 'YYYY-MM-DD' を返す
// UTCメソッドのみで計算するためタイムゾーンずれは起きない
export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

// JSTでの曜日（月=0 … 日=6）
function jstMondayIndex(d: Date): number {
  const short = d.toLocaleDateString('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short' })
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const idx = order.indexOf(short)
  return idx < 0 ? 0 : idx
}

const WEEK_LABELS = ['月', '火', '水', '木', '金', '土', '日']

// 録音日時（ISO文字列）の配列 + 現在時刻 から StreakData を計算
export function computeStreak(timestamps: string[], now: Date = new Date()): StreakData {
  // 録音があった日（JST）の集合
  const doneSet = new Set(timestamps.map(t => jstDateKey(new Date(t))))

  const todayKey = jstDateKey(now)
  const todayDone = doneSet.has(todayKey)

  // 連続日数：本日達成済みなら本日から、未達成なら昨日から遡る
  //（未達成でも「本日はまだ終わっていないだけ」なので連続は途切れていない扱い）
  let streak = 0
  let cursor = todayDone ? todayKey : addDays(todayKey, -1)
  while (doneSet.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }

  // 今週（月〜日）
  const mondayKey = addDays(todayKey, -jstMondayIndex(now))
  const week: WeekDay[] = WEEK_LABELS.map((label, i) => {
    const key = addDays(mondayKey, i)
    return {
      key,
      label,
      done: doneSet.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    }
  })

  return { streak, todayDone, week }
}
