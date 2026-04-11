// src/app/knowledge/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  fetchUrlContent, saveKnowledgeSource, synthesizeKnowledge,
  getKnowledgeSources, type KnowledgeSource, type KnowledgeInsight
} from '@/app/actions/knowledge'

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'

export default function KnowledgePage() {
  const [url, setUrl] = useState('')
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<KnowledgeInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  useEffect(() => {
    getKnowledgeSources().then(setSources)
  }, [])

  const handleAddUrl = async () => {
    const trimmed = url.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      const content = await fetchUrlContent(trimmed)
      const saved = await saveKnowledgeSource('url', trimmed, content, trimmed)
      setSources(prev => [saved, ...prev])
      setUrl('')
    } finally {
      setLoading(false)
    }
  }

  const handleSynthesize = async (id: string) => {
    setInsightLoading(true)
    setInsight(null)
    try {
      const result = await synthesizeKnowledge(id)
      setInsight(result)
    } finally {
      setInsightLoading(false)
    }
  }

  return (
    <main
      className="min-h-dvh flex flex-col px-4 pt-12 pb-24"
      style={{ background: BG }}
    >
      <p className="text-xs tracking-[0.35em] uppercase mb-6" style={{ color: '#0075c2' }}>学習フィルター</p>

      {/* URL Input */}
      <div className="flex gap-2 mb-6">
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
          placeholder="記事やWebページのURL"
          disabled={loading}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none disabled:opacity-40"
          style={{
            background: 'rgba(0,84,167,0.1)',
            border: '1px solid rgba(0,84,167,0.2)',
          }}
        />
        <button
          onClick={handleAddUrl}
          disabled={!url.trim() || loading}
          className="px-4 py-2.5 rounded-xl text-sm disabled:opacity-30 transition-opacity"
          style={{ background: 'rgba(0,117,194,0.2)', color: '#0075c2' }}
        >
          {loading ? '…' : '追加'}
        </button>
      </div>

      {/* Insight */}
      {insightLoading && (
        <div className="text-slate-500 text-sm text-center py-4">分析中…</div>
      )}

      {insight && (
        <div
          className="rounded-2xl p-4 mb-6 flex flex-col gap-3"
          style={{ background: 'rgba(235,97,104,0.08)', border: '1px solid rgba(235,97,104,0.3)' }}
        >
          <p className="font-bold" style={{ color: '#eb6168' }}>{insight.lessonTitle}</p>
          <div>
            <p className="text-xs text-slate-500 mb-1">教訓</p>
            <p className="text-slate-200 text-sm leading-relaxed">{insight.lesson}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">あなたへの繋がり</p>
            <p className="text-slate-200 text-sm leading-relaxed">{insight.connection}</p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(0,84,167,0.1)' }}
          >
            <p className="text-xs mb-1" style={{ color: '#0075c2' }}>明日からのアクション</p>
            <p className="text-slate-200 text-sm">{insight.action}</p>
          </div>
        </div>
      )}

      {/* Sources List */}
      <div className="flex flex-col gap-3">
        {sources.map(s => (
          <div
            key={s.id}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(0,84,167,0.1)', border: '1px solid rgba(0,84,167,0.1)' }}
          >
            <p className="text-slate-300 text-sm mb-1 truncate">{s.source}</p>
            <p className="text-slate-500 text-xs mb-3 line-clamp-2">{s.content.slice(0, 100)}…</p>
            <button
              onClick={() => handleSynthesize(s.id)}
              disabled={insightLoading}
              className="text-xs px-3 py-1.5 rounded-full disabled:opacity-30"
              style={{ background: 'rgba(235,97,104,0.1)', color: '#eb6168' }}
            >
              今の自分に合わせて分析
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
