// src/app/page.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { Waveform } from '@/app/components/Waveform'
import { RecordButton } from '@/app/components/RecordButton'
import { LoadingScreen } from '@/app/components/LoadingScreen'
import { ResultScreen } from '@/app/components/ResultScreen'
import { useAudioRecorder } from '@/app/hooks/useAudioRecorder'
import { transcribeAndAnalyze, type AnalysisResult } from '@/app/actions/analyze'
import { getCTA } from '@/app/utils/cta'

type AppState = 'idle' | 'recording' | 'loading' | 'result'

const BG = 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    isRecording,
    audioBlob,
    analyserNode,
    startRecording,
    stopRecording,
    reset: resetRecorder,
  } = useAudioRecorder()

  // Trigger analysis when audioBlob becomes available after stopping
  useEffect(() => {
    if (!audioBlob || appState !== 'loading') return

    const run = async () => {
      try {
        const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
        const formData = new FormData()
        formData.append('audio', audioBlob, `recording.${ext}`)
        const analysisResult = await transcribeAndAnalyze(formData)
        setResult(analysisResult)
        setAppState('result')
      } catch (err) {
        const msg = err instanceof Error ? err.message : '分析に失敗しました'
        setError(msg)
        setAppState('idle')
      }
    }

    run()
  }, [audioBlob, appState])

  const handleToggleRecord = useCallback(async () => {
    if (appState === 'idle') {
      setError(null)
      await startRecording()
      setAppState('recording')
    } else if (appState === 'recording') {
      stopRecording()
      setAppState('loading') // audioBlob will arrive via useEffect above
    }
  }, [appState, startRecording, stopRecording])

  const handleReset = useCallback(() => {
    resetRecorder()
    setResult(null)
    setError(null)
    setAppState('idle')
  }, [resetRecorder])

  const isLoading = appState === 'loading'

  if (appState === 'loading') {
    return (
      <main style={{ background: BG, minHeight: '100dvh' }}>
        <LoadingScreen />
      </main>
    )
  }

  if (appState === 'result' && result) {
    return (
      <main style={{ background: BG, minHeight: '100dvh' }}>
        <ResultScreen result={result} onReset={handleReset} />
      </main>
    )
  }

  return (
    <main
      style={{ background: BG, minHeight: '100dvh' }}
      className="flex flex-col items-center justify-between py-12 px-6"
    >
      {/* Logo */}
      <span className="text-xs text-purple-400 tracking-[0.35em] uppercase select-none">
        AlterLog
      </span>

      {/* Center: waveform + button */}
      <div className="flex flex-col items-center gap-10">
        <Waveform analyserNode={analyserNode} isRecording={isRecording} />
        <RecordButton
          isRecording={isRecording}
          onToggle={handleToggleRecord}
          disabled={isLoading}
        />
      </div>

      {/* CTA text */}
      <p className="text-slate-400 text-sm text-center leading-relaxed min-h-[40px] flex items-center">
        {error
          ? <span className="text-red-400">{error}</span>
          : isRecording
          ? '話し終わったら、もう一度タップ'
          : getCTA()}
      </p>
    </main>
  )
}
