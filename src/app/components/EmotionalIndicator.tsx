// src/app/components/EmotionalIndicator.tsx
'use client'

import React, { useMemo } from 'react'
import type { Theme } from './ThemeEngine'
import { THEME_INDICATOR_COLORS } from './ThemeEngine'

interface EmotionalIndicatorProps {
  theme: Theme
  /** passive_ratio 0–100 */
  passiveRatio: number
  /** fact_ratio 0–100 */
  factRatio: number
}

/**
 * 画面上部中央に表示する48px円形の感情状態ゲージ。
 * - 外周SVGアーク: factRatio の高さを表示（時計回り）
 * - 内側小円: passive_ratioの逆数（低いほど良い）を表示
 * - memo化でテーマ変更以外の親re-renderを無視する
 */
export const EmotionalIndicator = React.memo(function EmotionalIndicator({
  theme,
  passiveRatio,
  factRatio,
}: EmotionalIndicatorProps) {
  const colors = THEME_INDICATOR_COLORS[theme]

  // SVGアーク計算（factRatio → stroke-dasharray）
  const svgProps = useMemo(() => {
    const radius = 20
    const circumference = 2 * Math.PI * radius
    const arcLength = (factRatio / 100) * circumference
    return { radius, circumference, arcLength }
  }, [factRatio])

  // 内側インジケーター（passiveの逆数 = 自由度）
  const innerScale = useMemo(() => {
    const freedom = Math.max(0, 100 - passiveRatio) / 100
    return 0.3 + freedom * 0.7 // 0.3〜1.0の範囲でスケール
  }, [passiveRatio])

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    position: 'relative',
    width: 48,
    height: 48,
    willChange: 'transform, opacity',
  }), [])

  const innerDotStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: colors.primary,
    transform: `translate(-50%, -50%) scale(${innerScale})`,
    transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1), background 0.8s ease',
    willChange: 'transform',
  }), [colors.primary, innerScale])

  const animClass = theme === 'warning'
    ? 'indicator-throb'
    : theme === 'totonoi'
    ? 'indicator-glow'
    : ''

  return (
    <div style={containerStyle} className={animClass}>
      {/* 外周SVGアーク: fact_ratio */}
      <svg
        width={48}
        height={48}
        style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
      >
        {/* トラック（薄い背景円） */}
        <circle
          cx={24}
          cy={24}
          r={svgProps.radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={3}
        />
        {/* アーク本体 */}
        <circle
          cx={24}
          cy={24}
          r={svgProps.radius}
          fill="none"
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${svgProps.arcLength} ${svgProps.circumference}`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.8s ease' }}
        />
      </svg>

      {/* 内側ドット */}
      <div style={innerDotStyle} />
    </div>
  )
})
