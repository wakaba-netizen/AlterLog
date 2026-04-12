// src/app/components/LoadingScreen.tsx
'use client'

const IDLE_HEIGHTS = [12, 20, 32, 44, 56, 72, 56, 44, 32, 20, 12]

const STEPS = [
  { label: '音声を受け取った',         done: true,  active: false },
  { label: '言葉を解析中...',          done: false, active: true  },
  { label: '思考パターンを読み取る',    done: false, active: false },
]

export function LoadingScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '48px', padding: '0 32px' }}>
      {/* Slow breathing waveform */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3px', height: 80 }} aria-hidden="true">
        {IDLE_HEIGHTS.map((h, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: h,
              borderRadius: '2px',
              background: '#0075c2',
              animation: `alterlog-breathe-bar 3s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Main message */}
      <p style={{
        color: '#a8c8e0',
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: 300,
        letterSpacing: '0.05em',
        animation: 'alterlog-fade 2s ease-in-out infinite',
      }}>
        君の言葉を、僕が咀嚼している…
      </p>

      {/* Progress steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px' }}>
        {STEPS.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
            <span style={{
              color: step.done ? '#4db8ff' : step.active ? '#c8e0f4' : '#3a6a9a',
            }}>
              {step.done ? '✓' : step.active ? '●' : '○'}
            </span>
            <span style={{
              color: step.done ? '#5a9abf' : step.active ? '#c8e0f4' : '#3a6a9a',
              textDecoration: step.done ? 'line-through' : 'none',
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
