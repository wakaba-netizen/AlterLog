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
    <div className="flex flex-col items-center justify-center min-h-screen gap-12 px-8">
      {/* Slow breathing waveform */}
      <div className="flex items-end justify-center gap-[3px]" style={{ height: 80 }} aria-hidden="true">
        {IDLE_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: 12,
              height: h,
              background: '#a78bfa',
              animation: `alterlog-breathe-bar 3s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Main message */}
      <p
        className="text-slate-300 text-center text-lg font-light tracking-wide"
        style={{ animation: 'alterlog-fade 2s ease-in-out infinite' }}
      >
        君の言葉を、僕が咀嚼している…
      </p>

      {/* Progress steps */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-xs">
            <span className={
              step.done   ? 'text-purple-400' :
              step.active ? 'text-slate-200'  : 'text-slate-600'
            }>
              {step.done ? '✓' : step.active ? '●' : '○'}
            </span>
            <span className={
              step.done   ? 'text-slate-400 line-through' :
              step.active ? 'text-slate-200'               : 'text-slate-600'
            }>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
