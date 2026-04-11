// src/app/components/EntryDetailModal.tsx
'use client'

import type { EntryRow } from '@/app/actions/entries'

interface EntryDetailModalProps {
  entry: EntryRow | null
  onClose: () => void
}

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'

export function EntryDetailModal({ entry, onClose }: EntryDetailModalProps) {
  if (!entry) return null

  const date = new Date(entry.created_at)
  const dateStr = date.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <span className="text-xs" style={{ color: '#5a9abf' }}>{dateStr}</span>
        <button
          onClick={onClose}
          className="text-2xl leading-none"
          style={{ color: '#7aafd4' }}
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 flex flex-col gap-6">
        {/* Thinking Profile */}
        <h2
          className="text-3xl font-bold leading-tight"
          style={{
            background: 'linear-gradient(135deg, #0054a7, #0075c2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {entry.thinking_profile}
        </h2>

        {/* Metrics */}
        <div className="flex flex-col gap-2">
          {[
            { label: '事実', value: entry.fact_ratio, color: '#0075c2' },
            { label: '感情', value: entry.emotion_ratio, color: '#f472b6' },
            { label: '被害者モード', value: entry.passive_ratio, color: '#fb923c' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm w-24" style={{ color: '#7aafd4' }}>{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${value}%`, background: color }}
                />
              </div>
              <span className="text-sm font-bold" style={{ color }}>{value}%</span>
            </div>
          ))}
        </div>

        {/* AI Comment */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(0,84,167,0.08)', border: '1px solid rgba(0,84,167,0.2)' }}
        >
          <p className="text-xs mb-2" style={{ color: '#4db8ff' }}>ALTERLOGの診断</p>
          <p className="text-sm leading-relaxed" style={{ color: '#c8e0f4' }}>{entry.ai_comment}</p>
        </div>

        {/* Transcript */}
        <div>
          <p className="text-xs mb-2" style={{ color: '#5a9abf' }}>書き起こし</p>
          <p className="text-sm leading-relaxed" style={{ color: '#a8c8e0' }}>{entry.transcript}</p>
        </div>
      </div>
    </div>
  )
}
