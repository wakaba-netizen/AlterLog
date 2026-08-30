// src/app/components/StreakHeader.tsx
'use client'

import { useState, useEffect } from 'react'
import { getStreakData } from '@/app/actions/streak'
import type { StreakData, WeekDay } from '@/app/lib/streak'

const ACCENT = '#4db8ff'
const RED = '#eb6168'

function Badge({ day }: { day: WeekDay }) {
  // 状態ごとの円形バッジのスタイルを決定
  let circle: React.CSSProperties
  let inner: React.ReactNode = null

  if (day.done) {
    // 達成：塗りつぶし＋チェック
    circle = { background: ACCENT, border: `1px solid ${ACCENT}` }
    inner = <span style={{ color: '#001525', fontSize: '15px', fontWeight: 700, lineHeight: 1 }}>✓</span>
  } else if (day.isToday) {
    // 本日未達成：赤く点滅するリング
    circle = {
      background: 'rgba(235,97,104,0.12)',
      border: `2px solid ${RED}`,
      animation: 'streak-today-pulse 1.6s ease-in-out infinite',
    }
    inner = <span style={{ color: RED, fontSize: '13px', fontWeight: 700, lineHeight: 1 }}>!</span>
  } else if (day.isFuture) {
    // 未来：薄く表示
    circle = { background: 'transparent', border: '1px solid rgba(122,175,212,0.2)' }
  } else {
    // 過去の未達成：グレーアウト
    circle = { background: 'transparent', border: '1px dashed rgba(122,175,212,0.3)' }
  }

  const labelColor = day.isToday && !day.done ? RED : day.done ? ACCENT : '#5a7a94'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1 }}>
      <div style={{
        width: '30px',
        height: '30px',
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: day.isFuture ? 0.5 : 1,
        ...circle,
      }}>
        {inner}
      </div>
      <span style={{ fontSize: '11px', color: labelColor, fontWeight: day.isToday ? 700 : 400 }}>
        {day.label}
      </span>
    </div>
  )
}

export function StreakHeader() {
  const [data, setData] = useState<StreakData | null>(null)

  useEffect(() => {
    getStreakData().then(setData).catch(() => setData(null))
  }, [])

  // 読み込み中は高さだけ確保してレイアウトのガタつきを防ぐ
  if (!data) return <div style={{ height: '92px', width: '100%' }} />

  return (
    <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ストリークカウンター */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px', lineHeight: 1, filter: data.streak > 0 ? 'none' : 'grayscale(1) opacity(0.5)' }}>🔥</span>
        <span style={{ fontSize: '17px', fontWeight: 700, color: data.streak > 0 ? '#ffb454' : '#5a7a94' }}>
          {data.streak}日連続
        </span>
        {!data.todayDone && (
          <span style={{ fontSize: '12px', color: RED, marginLeft: '4px' }}>
            ・今日はまだ
          </span>
        )}
      </div>

      {/* 今週のチェックリスト（月〜日） */}
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        {data.week.map(day => <Badge key={day.key} day={day} />)}
      </div>
    </div>
  )
}
