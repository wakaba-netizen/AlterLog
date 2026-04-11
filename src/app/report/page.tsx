// src/app/report/page.tsx
'use client'

import { useState } from 'react'
import { generateReport, type ReportData } from '@/app/actions/report'
import { MetricsChart } from '@/app/components/MetricsChart'

const BG = 'linear-gradient(160deg, #0a1628 0%, #1c3450 50%, #0054a7 100%)'

export default function ReportPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async (p: 'week' | 'month') => {
    setPeriod(p)
    setLoading(true)
    setReport(null)
    try {
      const data = await generateReport(p)
      setReport(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-dvh flex flex-col px-4 pt-12 pb-24"
      style={{ background: BG }}
    >
      <p className="text-xs tracking-[0.35em] uppercase mb-6" style={{ color: '#0075c2' }}>回顧録</p>

      {/* Period selector */}
      <div
        className="flex rounded-full p-1 mb-6 self-start"
        style={{ background: 'rgba(0,117,194,0.1)' }}
      >
        {(['week', 'month'] as const).map(p => (
          <button
            key={p}
            onClick={() => load(p)}
            disabled={loading}
            className="px-5 py-1.5 rounded-full text-sm transition-all"
            style={{
              background: period === p ? 'rgba(0,117,194,0.3)' : 'transparent',
              color: period === p ? '#0075c2' : '#64748b',
            }}
          >
            {p === 'week' ? '1週間' : '1ヶ月'}
          </button>
        ))}
      </div>

      {!report && !loading && (
        <button
          onClick={() => load(period)}
          className="self-start px-6 py-3 rounded-full text-sm transition-all"
          style={{ background: 'rgba(0,117,194,0.15)', border: '1px solid rgba(0,117,194,0.3)', color: '#0075c2' }}
        >
          レポートを生成
        </button>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          分析中…
        </div>
      )}

      {report && (
        <div className="flex flex-col gap-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '記録数', value: `${report.entryCount}件`, color: '#0075c2' },
              { label: '平均感情', value: `${report.avgEmotionRatio}%`, color: '#f472b6' },
              { label: '被害者', value: `${report.avgPassiveRatio}%`, color: '#fb923c' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(0,84,167,0.06)', border: '1px solid rgba(0,84,167,0.15)' }}
              >
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="font-bold text-lg" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {report.trend.length > 1 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(0,84,167,0.04)', border: '1px solid rgba(0,84,167,0.1)' }}
            >
              <p className="text-xs text-slate-500 mb-3">思考パターン推移</p>
              <MetricsChart data={report.trend} />
            </div>
          )}

          {/* Summary */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(0,84,167,0.08)', border: '1px solid rgba(0,84,167,0.2)' }}
          >
            <p className="text-xs mb-2" style={{ color: '#0075c2' }}>この期間の総括</p>
            <p className="text-slate-200 text-sm leading-relaxed">{report.summary}</p>
          </div>

          {/* Growth Points */}
          {report.growthPoints.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">成長ポイント</p>
              <div className="flex flex-col gap-2">
                {report.growthPoints.map((point, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-green-400 text-sm mt-0.5">✓</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Challenge */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}
          >
            <p className="text-xs text-orange-400 mb-2">次のチャレンジ</p>
            <p className="text-slate-200 text-sm leading-relaxed">{report.nextChallenge}</p>
          </div>
        </div>
      )}
    </main>
  )
}
