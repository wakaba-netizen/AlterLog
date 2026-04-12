// src/app/page.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Waveform } from '@/app/components/Waveform'
import { RecordButton } from '@/app/components/RecordButton'
import { LoadingScreen } from '@/app/components/LoadingScreen'
import { ResultScreen } from '@/app/components/ResultScreen'
import { useAudioRecorder } from '@/app/hooks/useAudioRecorder'
import { transcribeAndAnalyze, type AnalysisResult } from '@/app/actions/analyze'
import { getCTA } from '@/app/utils/cta'

type AppState = 'idle' | 'recording' | 'loading' | 'result'

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canStop, setCanStop] = useState(false)
  const canStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      setCanStop(false)
      await startRecording()
      setAppState('recording')
      // 1.5秒後に停止を許可（誤タップ防止）
      canStopTimerRef.current = setTimeout(() => setCanStop(true), 1500)
    } else if (appState === 'recording' && canStop) {
      if (canStopTimerRef.current) clearTimeout(canStopTimerRef.current)
      stopRecording()
      setAppState('loading') // audioBlob will arrive via useEffect above
    }
  }, [appState, canStop, startRecording, stopRecording])

  const handleReset = useCallback(() => {
    if (canStopTimerRef.current) clearTimeout(canStopTimerRef.current)
    resetRecorder()
    setResult(null)
    setError(null)
    setCanStop(false)
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
      <main style={{ minHeight: '100dvh', position: 'relative' }}>
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
      <span className="text-xs tracking-[0.35em] uppercase select-none" style={{ color: '#eb6168' }}>
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
      <p className="text-sm text-center leading-relaxed min-h-[40px] flex items-center" style={{ color: '#7aafd4' }}>
        {error
          ? <span style={{ color: '#eb6168' }}>{error}</span>
          : isRecording && !canStop
          ? '🎙️ 録音中… (少し待ってから止めてね)'
          : isRecording
          ? '話し終わったら、もう一度タップ'
          : getCTA()}
      </p>
    </main>
  )
}
