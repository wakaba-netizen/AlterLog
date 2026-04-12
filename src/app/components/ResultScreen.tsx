// src/app/components/ResultScreen.tsx
'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import React from 'react'
import type { AnalysisResult } from '@/app/actions/analyze'
import { detectTheme, type Theme } from './ThemeEngine'
import { AnimationLayer } from './AnimationLayer'
import { EmotionalIndicator } from './EmotionalIndicator'

interface ResultScreenProps {
  result: AnalysisResult
  onReset: () => void
}

interface MetricBarProps {
  label: string
  value: number
  color: string
}

const MetricBar = React.memo(function MetricBar({ label, value, color }: MetricBarProps) {
  const trackStyle = useMemo<React.CSSProperties>(() => ({
    flex: 1,
    height: 8,
    borderRadius: 9999,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  }), [])

  const fillStyle = useMemo<React.CSSProperties>(() => ({
    height: '100%',
    borderRadius: 9999,
    width: `${value}%`,
    background: color,
    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'width',
  }), [value, color])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: '#7aafd4', fontSize: 12, width: 96, flexShrink: 0 }}>{label}</span>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
      <span style={{ color, fontSize: 12, fontFamily: 'monospace', width: 32, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  )
})

export function ResultScreen({ result, onReset }: ResultScreenProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('normal')
  const voidFlashRef = useRef<HTMLDivElement>(null)

  // マウント時に1回だけテーマを検出・適用
  useEffect(() => {
    const detected = detectTheme(result.passive_ratio, result.fact_ratio)

    if (detected === 'totonoi') {
      // normal → totonoi: voidフラッシュなし（直接遷移）
      setTheme('totonoi')
    } else if (detected === 'warning') {
      setTheme('warning')
    }
    // normalはデフォルトなので何もしない
  }, [result.passive_ratio, result.fact_ratio])

  /**
   * warning → totonoi への手動再評価ボタン用
   * （将来実装: Tとのチャット後に再分析などで呼ばれる想定）
   * 今は使わないが、VoidFlash遷移ロジックのリファレンスとして残す
   */
  const triggerVoidTransition = useCallback(() => {
    const el = voidFlashRef.current
    if (!el) return

    // ① CSSクラス付与でフラッシュ開始（stateを触らない）
    el.style.display = 'block'
    el.classList.add('theme-void-flash')

    // ② フラッシュ完了（150ms）後にstateを更新
    const timer = setTimeout(() => {
      el.classList.remove('theme-void-flash')
      el.style.display = 'none'
      setTheme('totonoi') // ← ここだけstateを変える
    }, 150)

    return () => clearTimeout(timer)
  }, [])

  // 将来: warning状態でユーザーが再分析 → triggerVoidTransition() を呼ぶ
  void triggerVoidTransition // lint警告回避

  const contentStyle = useMemo<React.CSSProperties>(() => ({
    position: 'fixed',
    inset: 0,
    bottom: 64, // BottomNav分
    zIndex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '40px 24px',
    gap: 32,
  }), [])

  const cardStyle = useMemo<React.CSSProperties>(() => ({
    borderRadius: 16,
    background: 'rgba(255,255,255,0.04)',
    padding: 20,
    border: theme === 'warning'
      ? '1px solid rgba(235,97,104,0.25)'
      : '1px solid rgba(0,84,167,0.2)',
    transition: 'border-color 0.8s ease',
  }), [theme])

  const profileGradient = useMemo<React.CSSProperties>(() => ({
    fontSize: 'clamp(1.8rem, 7vw, 3rem)',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 1.2,
    background: theme === 'warning'
      ? 'linear-gradient(135deg, #eb6168, #d6003a)'
      : 'linear-gradient(135deg, #0054a7, #0075c2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    transition: 'background 0.8s ease',
  }), [theme])

  return (
    <>
      {/* 背景エフェクト層（zIndex: 0） */}
      <AnimationLayer theme={theme} />

      {/* Void Flash オーバーレイ（warning→totonoi 遷移時のみ表示） */}
      <div
        ref={voidFlashRef}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: '#ffffff',
          pointerEvents: 'none',
        }}
      />

      {/* コンテンツ層（zIndex: 1） */}
      <div style={contentStyle}>

        {/* 感情インジケーター + プロファイルタイトル */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 16 }}>
          <EmotionalIndicator
            theme={theme}
            passiveRatio={result.passive_ratio}
            factRatio={result.fact_ratio}
          />
          <p style={{ color: '#0075c2', fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', textAlign: 'center' }}>
            今日の思考プロファイル
          </p>
          <h1 role="heading" style={profileGradient}>
            {result.thinking_profile}
          </h1>
        </div>

        {/* Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MetricBar label="事実"         value={result.fact_ratio}    color="#0075c2" />
          <MetricBar label="感情"         value={result.emotion_ratio}  color="#eb6168" />
          <MetricBar label="被害者モード"  value={result.passive_ratio}  color="#fb923c" />
        </div>

        {/* AI Comment */}
        <div style={cardStyle}>
          <p style={{ color: '#0075c2', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
            AlterLogの診断
          </p>
          <p style={{ color: '#c8e0f4', fontSize: 14, lineHeight: 1.7 }}>{result.ai_comment}</p>
        </div>

        {/* Transcript (collapsible) */}
        <div>
          <button
            onClick={() => setTranscriptOpen((o) => !o)}
            style={{ color: '#5a9abf', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            原文を見る {transcriptOpen ? '▲' : '▼'}
          </button>
          {transcriptOpen && (
            <p style={{ marginTop: 12, fontSize: 12, lineHeight: 1.7, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, color: '#a8c8e0' }}>
              {result.transcript}
            </p>
          )}
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          role="button"
          aria-label="もう一度話す"
          style={{
            width: '100%',
            padding: '16px 0',
            borderRadius: 16,
            fontSize: 14,
            fontWeight: 500,
            border: theme === 'warning'
              ? '1px solid rgba(235,97,104,0.3)'
              : '1px solid rgba(0,84,167,0.3)',
            color: theme === 'warning' ? '#eb6168' : '#0075c2',
            background: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.8s ease, color 0.8s ease',
          }}
        >
          もう一度話す
        </button>

      </div>
    </>
  )
}
