// src/app/components/AnimationLayer.tsx
'use client'

import React, { useMemo } from 'react'
import type { Theme } from './ThemeEngine'
import { THEME_BACKGROUNDS } from './ThemeEngine'

interface AnimationLayerProps {
  theme: Theme
}

/**
 * 画面全体を覆う背景＋エフェクト層。
 * - position: fixed, inset: 0, zIndex: 0
 * - コンテンツ（ResultScreenの中身）はzIndex: 1以上で重ねる
 * - memo化で theme が変わった時だけ再描画
 * - アニメーションはCSSクラスのみで制御（stateを汚染しない）
 */
export const AnimationLayer = React.memo(function AnimationLayer({
  theme,
}: AnimationLayerProps) {
  const baseStyle = useMemo<React.CSSProperties>(() => ({
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    background: THEME_BACKGROUNDS[theme],
    transition: 'background 0.8s ease',
    overflow: 'hidden',
  }), [theme])

  return (
    <div style={baseStyle}>
      {/* warning: ノイズテクスチャ（SVG feTurbulence） */}
      {theme === 'warning' && <WarningNoiseLayer />}

      {/* totonoi: リップル3波 */}
      {theme === 'totonoi' && <TotonoiRippleLayer />}
    </div>
  )
})

/** warning専用: ノイズ + パルス背景レイヤー */
const WarningNoiseLayer = React.memo(function WarningNoiseLayer() {
  return (
    <>
      {/* パルス背景オーバーレイ */}
      <div
        className="theme-warning-pulse"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(235,97,104,0.15) 0%, transparent 70%)',
          willChange: 'opacity',
        }}
      />
      {/* SVGノイズテクスチャ */}
      <div
        className="theme-noise-drift"
        style={{
          position: 'absolute',
          inset: '-10%',
          opacity: 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
    </>
  )
})

/** totonoi専用: 中心から3波リップル */
const TotonoiRippleLayer = React.memo(function TotonoiRippleLayer() {
  // 3つのリップルが0.8s間隔で順番に展開
  const ripples = useMemo(() => [
    { delay: '0s',    color: 'rgba(0, 84, 167, 0.25)' },
    { delay: '0.8s',  color: 'rgba(0, 117, 194, 0.18)' },
    { delay: '1.6s',  color: 'rgba(168, 216, 255, 0.12)' },
  ], [])

  return (
    <>
      {ripples.map((ripple, i) => (
        <div
          key={i}
          className="theme-ripple"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 80,
            height: 80,
            borderRadius: '50%',
            marginTop: -40,
            marginLeft: -40,
            background: ripple.color,
            animationDelay: ripple.delay,
            animationDuration: '2.4s',
            animationIterationCount: 'infinite',
            willChange: 'transform, opacity',
          }}
        />
      ))}
      {/* 中心グロウ */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          marginTop: -60,
          marginLeft: -60,
          background: 'radial-gradient(circle, rgba(0,84,167,0.3) 0%, transparent 70%)',
          animation: 'indicator-glow 2s ease-in-out infinite',
          willChange: 'box-shadow',
        }}
      />
    </>
  )
})
