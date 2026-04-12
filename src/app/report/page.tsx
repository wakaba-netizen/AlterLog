// src/app/report/page.tsx
'use client'

import { useState } from 'react'
import { generateReport, type ReportData } from '@/app/actions/report'
import { MetricsChart } from '@/app/components/MetricsChart'

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'

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
      <p className="text-xs tracking-[0.35em] uppercase mb-6" style={{ color: '#4db8ff' }}>回顧録</p>

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
              color: period === p ? '#4db8ff' : '#5a9abf',
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
          style={{ background: 'rgba(0,117,194,0.15)', border: '1px solid rgba(0,117,194,0.3)', color: '#4db8ff' }}
        >
          レポートを生成
        </button>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#5a9abf' }}>
          分析中…
        </div>
      )}

      {report && (
        <div className="flex flex-col gap-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '記録数', value: `${report.entryCount}件`, color: '#0075c2', alarm: false },
              { label: '平均感情', value: `${report.avgEmotionRatio}%`, color: '#eb6168', alarm: false },
              { label: '被害者モード', value: `${report.avgPassiveRatio}%`, color: report.passiveAlarm ? '#eb6168' : '#fb923c', alarm: report.passiveAlarm },
            ].map(({ label, value, color, alarm }) => (
              <div
                key={label}
                className="rounded-2xl p-3 text-center"
                style={{
                  background: alarm ? 'rgba(235,97,104,0.1)' : 'rgba(0,84,167,0.06)',
                  border: alarm ? '1px solid rgba(235,97,104,0.4)' : '1px solid rgba(0,84,167,0.15)',
                }}
              >
                <p className="text-xs mb-1" style={{ color: alarm ? '#eb6168' : '#5a9abf' }}>{label}</p>
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
              <p className="text-xs mb-3" style={{ color: '#5a9abf' }}>思考パターン推移</p>
              <MetricsChart data={report.trend} />
            </div>
          )}

          {/* Summary */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(0,84,167,0.08)', border: '1px solid rgba(0,84,167,0.2)' }}
          >
            <p className="text-xs mb-2" style={{ color: '#4db8ff' }}>この期間の総括</p>
            <p className="text-sm leading-relaxed" style={{ color: '#c8e0f4' }}>{report.summary}</p>
          </div>

          {/* Growth Points */}
          {report.growthPoints.length > 0 && (
            <div>
              <p className="text-xs mb-2" style={{ color: report.passiveAlarm ? '#eb6168' : '#5a9abf' }}>
                {report.passiveAlarm ? '⚡ 直視すべき課題' : '📌 直視すべき課題'}
              </p>
              <div className="flex flex-col gap-2">
                {report.growthPoints.map((point, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-sm mt-0.5" style={{ color: report.passiveAlarm ? '#eb6168' : '#7ec9af' }}>
                      {report.passiveAlarm ? '⚡' : '→'}
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: '#a8c8e0' }}>{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Challenge */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: report.passiveAlarm ? 'rgba(235,97,104,0.1)' : 'rgba(251,146,60,0.08)',
              border: report.passiveAlarm ? '1px solid rgba(235,97,104,0.4)' : '1px solid rgba(251,146,60,0.2)',
            }}
          >
              <p className="text-xs mb-2" style={{ color: report.passiveAlarm ? '#eb6168' : '#fb923c' }}>
                {report.passiveAlarm ? '🔥 Tからの最後通告' : '🎯 Tからの指令'}
              </p>
            <p className="text-sm leading-relaxed" style={{ color: '#c8e0f4' }}>{report.nextChallenge}</p>
          </div>
        </div>
      )}
    </main>
  )
}
