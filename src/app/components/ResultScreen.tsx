// src/app/components/ResultScreen.tsx
'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/app/actions/analyze'

interface ResultScreenProps {
  result: AnalysisResult
  onReset: () => void
}

interface MetricBarProps {
  label: string
  value: number
  color: string
}

function MetricBar({ label, value, color }: MetricBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: color,
            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>
        {value}%
      </span>
    </div>
  )
}

export function ResultScreen({ result, onReset }: ResultScreenProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 gap-8">

      {/* Thinking Profile — full impact */}
      <div className="flex-1 flex flex-col justify-center items-center gap-3 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-center" style={{ color: '#0075c2' }}>
          今日の思考プロファイル
        </p>
        <h1
          role="heading"
          className="text-center font-bold leading-tight"
          style={{
            fontSize: 'clamp(1.8rem, 7vw, 3rem)',
            background: 'linear-gradient(135deg, #0054a7, #0075c2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {result.thinking_profile}
        </h1>
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-4">
        <MetricBar label="事実"           value={result.fact_ratio}    color="#0075c2" />
        <MetricBar label="感情"           value={result.emotion_ratio}  color="#eb6168" />
        <MetricBar label="被害者モード"    value={result.passive_ratio}  color="#fb923c" />
      </div>

      {/* AI Comment */}
      <div className="rounded-2xl bg-white/[0.04] p-5" style={{ border: '1px solid rgba(0,84,167,0.2)' }}>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#0075c2' }}>
          AlterLogの診断
        </p>
        <p className="text-slate-200 text-sm leading-relaxed">{result.ai_comment}</p>
      </div>

      {/* Transcript (collapsible) */}
      <div>
        <button
          onClick={() => setTranscriptOpen((o) => !o)}
          className="text-xs text-slate-500 flex items-center gap-1 active:text-slate-300 transition-colors"
        >
          原文を見る {transcriptOpen ? '▲' : '▼'}
        </button>
        {transcriptOpen && (
          <p className="mt-3 text-xs text-slate-400 leading-relaxed bg-white/[0.03] rounded-xl p-4">
            {result.transcript}
          </p>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        role="button"
        aria-label="もう一度話す"
        className="w-full py-4 rounded-2xl text-sm font-medium active:scale-95 transition-transform"
        style={{ border: '1px solid rgba(0,84,167,0.3)', color: '#0075c2' }}
      >
        もう一度話す
      </button>
    </div>
  )
}
