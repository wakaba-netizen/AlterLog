// src/app/components/EntryCard.tsx
'use client'

import type { EntryRow } from '@/app/actions/entries'

interface EntryCardProps {
  entry: EntryRow
  onClick: (entry: EntryRow) => void
}

export function EntryCard({ entry, onClick }: EntryCardProps) {
  const date = new Date(entry.created_at)
  const dateStr = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

  const emotionColor =
    entry.emotion_ratio >= 70 ? '#f87171'
    : entry.emotion_ratio >= 40 ? '#fb923c'
    : '#34d399'

  return (
    <button
      onClick={() => onClick(entry)}
      className="w-full text-left rounded-2xl p-4 transition-all active:scale-98"
      style={{
        background: 'rgba(0,84,167,0.06)',
        border: '1px solid rgba(0,84,167,0.2)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{dateStr} {timeStr}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${emotionColor}22`, color: emotionColor }}
        >
          感情 {entry.emotion_ratio}%
        </span>
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: '#0075c2' }}>{entry.thinking_profile}</p>
      <p className="text-slate-400 text-xs line-clamp-2">{entry.transcript}</p>
    </button>
  )
}
