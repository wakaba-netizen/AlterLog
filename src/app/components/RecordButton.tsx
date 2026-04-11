// src/app/components/RecordButton.tsx
'use client'

interface RecordButtonProps {
  isRecording: boolean
  onToggle: () => void
  disabled?: boolean
}

export function RecordButton({ isRecording, onToggle, disabled }: RecordButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={isRecording ? '録音停止' : '録音開始'}
      className="relative flex items-center justify-center rounded-full
                 transition-all duration-300 active:scale-95 disabled:opacity-40"
      style={{
        width: 96,
        height: 96,
        border: `2px solid ${isRecording ? 'rgba(239,68,68,0.7)' : 'rgba(167,139,250,0.5)'}`,
        background: isRecording ? 'rgba(239,68,68,0.12)' : 'rgba(167,139,250,0.12)',
      }}
    >
      {/* Outer ripple (idle only) */}
      {!isRecording && (
        <span
          className="absolute inset-0 rounded-full border border-purple-400/20"
          style={{ animation: 'alterlog-ripple 2s ease-out infinite' }}
        />
      )}

      {/* Inner icon */}
      {isRecording ? (
        // Stop icon: red pulsing square
        <span
          className="rounded-sm bg-red-400"
          style={{ width: 28, height: 28, animation: 'alterlog-pulse 1s ease-in-out infinite' }}
        />
      ) : (
        // Record icon: purple breathing circle
        <span
          className="rounded-full bg-purple-400"
          style={{ width: 32, height: 32, animation: 'alterlog-breathe 2.5s ease-in-out infinite' }}
        />
      )}
    </button>
  )
}
