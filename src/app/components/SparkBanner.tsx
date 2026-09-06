// src/app/components/SparkBanner.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLatestSpark, markSparkSeen, type SparkView, type SparkLog } from '@/app/actions/spark'

const GOLD = '#f59e0b'
const GOLD_LIGHT = '#ffd77a'

// ノード（過去ログ）カード
function NodeCard({ log, delay }: { log: SparkLog; delay: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: '100%',
      maxWidth: '340px',
      padding: '12px 14px',
      borderRadius: '14px',
      background: 'rgba(245,158,11,0.08)',
      border: `1px solid rgba(245,158,11,0.35)`,
      animation: `spark-node-pop 0.5s ${delay}s cubic-bezier(0.16,1,0.3,1) both`,
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(245,158,11,0.3)',
      }}>
        {log.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={log.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '20px' }}>{log.source === '手書き' ? '📝' : '🎙️'}</span>}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '11px', color: GOLD_LIGHT, marginBottom: '2px' }}>
          {log.date}・{log.source}
        </div>
        <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {log.profile}
        </div>
      </div>
    </div>
  )
}

export function SparkBanner() {
  const router = useRouter()
  const [spark, setSpark] = useState<SparkView | null>(null)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    getLatestSpark().then(setSpark).catch(() => setSpark(null))
  }, [])

  if (!spark || (spark.seen && !open) || (dismissed && !open)) return null

  const openModal = () => {
    setOpen(true)
    if (!spark.seen) markSparkSeen(spark.id).catch(() => {})
  }

  const goToChat = () => {
    // 閃きコンテキストを引き継いでチャットへ
    const starter = `「${spark.logA.date}の${spark.logA.profile}」と「${spark.logB.date}の${spark.logB.profile}」が繋がった閃きについて壁打ちしたい。${spark.spark_text}`
    try { localStorage.setItem('alterlog_spark_prompt', starter) } catch {}
    router.push('/chat')
  }

  return (
    <>
      {/* 浮遊する閃きバナー */}
      {!open && (
        <button
          onClick={openModal}
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '12px 18px',
            borderRadius: '9999px',
            border: `1px solid ${GOLD}`,
            background: 'linear-gradient(100deg, rgba(245,158,11,0.18), rgba(255,215,122,0.10))',
            color: GOLD_LIGHT,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            animation: 'spark-float 3s ease-in-out infinite, spark-glow 2.4s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: '16px' }}>⚡</span>
          偶発的な閃きが発生！タップで開く
        </button>
      )}

      {/* 暗転モーダル＋ノード結合演出 */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,4,10,0.94)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 24px 32px',
            overflowY: 'auto',
            animation: 'spark-overlay-in 0.4s ease both',
          }}
        >
          {/* 閉じる */}
          <button
            onClick={() => { setOpen(false); setDismissed(true) }}
            style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '26px', lineHeight: 1, color: '#7aafd4', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>

          <p style={{ fontSize: '11px', letterSpacing: '0.35em', color: GOLD, marginBottom: '6px' }}>SERENDIPITY</p>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '28px', textAlign: 'center' }}>
            ⚡ 2つの過去が、繋がった
          </h2>

          {/* ノードA */}
          <NodeCard log={spark.logA} delay={0.2} />

          {/* 繋ぐ光の線＋走る粒 */}
          <div style={{ position: 'relative', height: '64px', width: '2px', margin: '2px 0' }}>
            <div style={{
              position: 'absolute', inset: 0, width: '2px',
              background: `linear-gradient(${GOLD}, ${GOLD_LIGHT})`,
              transformOrigin: 'top',
              boxShadow: `0 0 8px ${GOLD}`,
              animation: 'spark-line-grow 0.6s 0.5s cubic-bezier(0.16,1,0.3,1) both',
            }} />
            <div style={{
              position: 'absolute', left: '-3px', width: '8px', height: '8px', borderRadius: '9999px',
              background: GOLD_LIGHT, boxShadow: `0 0 10px 3px ${GOLD}`,
              animation: 'spark-dot-travel 1.4s 1.1s ease-in-out infinite',
            }} />
          </div>

          {/* ノードB */}
          <NodeCard log={spark.logB} delay={0.35} />

          {/* Tのスパーク解説 */}
          <div style={{
            width: '100%', maxWidth: '340px', marginTop: '28px', padding: '18px',
            borderRadius: '16px',
            background: 'rgba(245,158,11,0.08)',
            border: `1px solid rgba(245,158,11,0.4)`,
            animation: 'spark-fade-up 0.6s 1s ease both',
          }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: GOLD, marginBottom: '10px' }}>Tのスパーク解説</p>
            <p style={{ fontSize: '14px', lineHeight: 1.9, color: '#dbeafe' }}>{spark.spark_text}</p>
          </div>

          {/* 壁打ちボタン */}
          <button
            onClick={goToChat}
            style={{
              width: '100%', maxWidth: '340px', marginTop: '16px', padding: '15px',
              borderRadius: '9999px', border: 'none',
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
              color: '#000811', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              animation: 'spark-fade-up 0.6s 1.2s ease both',
            }}
          >
            ⚡ この閃きでTと壁打ちする
          </button>
        </div>
      )}
    </>
  )
}
