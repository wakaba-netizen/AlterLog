// src/app/knowledge/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  fetchUrlContent, saveKnowledgeSource, saveTextKnowledge,
  synthesizeKnowledge, getKnowledgeSources,
  type KnowledgeSource, type KnowledgeInsight
} from '@/app/actions/knowledge'

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'

export default function KnowledgePage() {
  const [url, setUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [textTitle, setTextTitle] = useState('')
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [urlLoading, setUrlLoading] = useState(false)
  const [textLoading, setTextLoading] = useState(false)
  const [insight, setInsight] = useState<KnowledgeInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'url' | 'text'>('text')

  useEffect(() => {
    getKnowledgeSources().then(setSources)
  }, [])

  const handleAddUrl = async () => {
    const trimmed = url.trim()
    if (!trimmed || urlLoading) return
    setUrlLoading(true)
    try {
      const content = await fetchUrlContent(trimmed)
      const saved = await saveKnowledgeSource('url', trimmed, content, trimmed)
      setSources(prev => [saved, ...prev])
      setUrl('')
    } finally {
      setUrlLoading(false)
    }
  }

  const handleAddText = async () => {
    const trimmed = rawText.trim()
    if (!trimmed || textLoading) return
    setTextLoading(true)
    try {
      const saved = await saveTextKnowledge(trimmed, textTitle.trim() || undefined)
      setSources(prev => [saved, ...prev])
      setRawText('')
      setTextTitle('')
    } finally {
      setTextLoading(false)
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
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 16px 96px',
        background: BG,
      }}
    >
      <p style={{ color: '#4db8ff', fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 24 }}>
        学習フィルター
      </p>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          borderRadius: 9999,
          padding: 4,
          background: 'rgba(0,84,167,0.1)',
          marginBottom: 20,
          alignSelf: 'flex-start',
        }}
      >
        {(['text', 'url'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? 'rgba(0,117,194,0.35)' : 'transparent',
              color: activeTab === tab ? '#4db8ff' : '#5a9abf',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'text' ? '📝 テキスト注入' : '🔗 URLから追加'}
          </button>
        ))}
      </div>

      {/* TEXT INPUT PANEL */}
      {activeTab === 'text' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <p style={{ color: '#a8c8e0', fontSize: 13, fontWeight: 600, margin: 0 }}>
            テキストで知識を注入する
          </p>

          {/* Title input (optional) */}
          <input
            value={textTitle}
            onChange={e => setTextTitle(e.target.value)}
            placeholder="タイトル（空白ならAIが自動生成）"
            style={{
              background: 'rgba(0,84,167,0.08)',
              border: '1px solid rgba(0,84,167,0.2)',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 14,
              color: '#c8e0f4',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />

          {/* Large textarea */}
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="ここにNotebookLMの書き出しや、書籍の要約などをペーストしてください"
            rows={10}
            style={{
              background: 'rgba(0,84,167,0.08)',
              border: '1px solid rgba(0,84,167,0.2)',
              borderRadius: 12,
              padding: '16px',
              fontSize: 14,
              color: '#c8e0f4',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              lineHeight: 1.7,
              minHeight: 200,
            }}
          />

          <p style={{ color: '#3a6a9a', fontSize: 11, margin: 0 }}>
            {rawText.length > 0 ? `${rawText.length.toLocaleString()}文字` : 'NotebookLM・書籍要約・議事録など何でもOK'}
          </p>

          {/* Submit button — large for Galaxy S25 */}
          <button
            onClick={handleAddText}
            disabled={!rawText.trim() || textLoading}
            style={{
              width: '100%',
              padding: '18px 0',
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 700,
              background: rawText.trim() && !textLoading
                ? 'linear-gradient(135deg, rgba(0,84,167,0.4), rgba(0,117,194,0.4))'
                : 'rgba(0,84,167,0.1)',
              border: '1px solid rgba(0,117,194,0.4)',
              color: rawText.trim() && !textLoading ? '#4db8ff' : '#3a6a9a',
              cursor: rawText.trim() && !textLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              letterSpacing: '0.05em',
            }}
          >
            {textLoading ? '⚡ Tの武器庫に登録中…' : '⚡ Tの武器庫に注入する'}
          </button>
        </div>
      )}

      {/* URL INPUT PANEL */}
      {activeTab === 'url' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <p style={{ color: '#a8c8e0', fontSize: 13, fontWeight: 600, margin: 0 }}>
            URLから知識を追加する
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
              placeholder="記事やWebページのURL"
              disabled={urlLoading}
              style={{
                flex: 1,
                background: 'rgba(0,84,167,0.08)',
                border: '1px solid rgba(0,84,167,0.2)',
                borderRadius: 12,
                padding: '14px 16px',
                fontSize: 14,
                color: '#c8e0f4',
                outline: 'none',
              }}
            />
            <button
              onClick={handleAddUrl}
              disabled={!url.trim() || urlLoading}
              style={{
                padding: '14px 20px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                background: 'rgba(0,117,194,0.2)',
                color: '#0075c2',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {urlLoading ? '…' : '追加'}
            </button>
          </div>
        </div>
      )}

      {/* Insight result */}
      {insightLoading && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#5a9abf', fontSize: 14 }}>
          分析中…
        </div>
      )}

      {insight && (
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'rgba(235,97,104,0.08)',
            border: '1px solid rgba(235,97,104,0.3)',
          }}
        >
          <p style={{ fontWeight: 700, color: '#eb6168', margin: 0 }}>{insight.lessonTitle}</p>
          <div>
            <p style={{ fontSize: 11, color: '#5a9abf', margin: '0 0 4px 0' }}>教訓</p>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: '#c8e0f4', margin: 0 }}>{insight.lesson}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#5a9abf', margin: '0 0 4px 0' }}>あなたへの繋がり</p>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: '#c8e0f4', margin: 0 }}>{insight.connection}</p>
          </div>
          <div style={{ background: 'rgba(0,84,167,0.1)', borderRadius: 12, padding: 12 }}>
            <p style={{ fontSize: 11, color: '#4db8ff', margin: '0 0 4px 0' }}>明日からのアクション</p>
            <p style={{ fontSize: 14, color: '#c8e0f4', margin: 0 }}>{insight.action}</p>
          </div>
        </div>
      )}

      {/* Sources list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sources.length === 0 && (
          <p style={{ color: '#3a6a9a', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            まだ知識が登録されていません。<br />Tの武器庫を満たしていこう。
          </p>
        )}
        {sources.map(s => (
          <div
            key={s.id}
            style={{
              borderRadius: 16,
              padding: 16,
              background: s.type === 'text'
                ? 'rgba(0,117,194,0.08)'
                : 'rgba(0,84,167,0.06)',
              border: s.type === 'text'
                ? '1px solid rgba(0,117,194,0.25)'
                : '1px solid rgba(0,84,167,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: s.type === 'text' ? '#4db8ff' : '#5a9abf' }}>
                {s.type === 'text' ? '★ 直接投入' : '🔗 URL'}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#a8c8e0', margin: '0 0 4px 0', fontWeight: 600 }}>
              {s.title || s.source}
            </p>
            <p style={{ fontSize: 12, color: '#5a9abf', margin: '0 0 12px 0' }}>
              {s.content.slice(0, 80)}…
            </p>
            <button
              onClick={() => handleSynthesize(s.id)}
              disabled={insightLoading}
              style={{
                fontSize: 12,
                padding: '8px 16px',
                borderRadius: 9999,
                background: 'rgba(235,97,104,0.1)',
                color: '#eb6168',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              今の自分に合わせて分析
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
