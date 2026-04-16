// src/app/page.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Waveform } from '@/app/components/Waveform'
import { RecordButton } from '@/app/components/RecordButton'
import { LoadingScreen } from '@/app/components/LoadingScreen'
import { ResultScreen } from '@/app/components/ResultScreen'
import { useAudioRecorder, MAX_RECORDING_SECONDS } from '@/app/hooks/useAudioRecorder'
import { transcribeAndAnalyze, type AnalysisResult } from '@/app/actions/analyze'
import { getCTA } from '@/app/utils/cta'

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

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
    elapsedSeconds,
    startRecording,
    stopRecording,
    reset: resetRecorder,
  } = useAudioRecorder()

  const remainingSeconds = MAX_RECORDING_SECONDS - elapsedSeconds
  const isNearLimit = isRecording && remainingSeconds <= 30

  // Trigger analysis when audioBlob becomes available after stopping
  useEffect(() => {
    if (!audioBlob || appState !== 'loading') return

    const run = async () => {
      // 空Blobチェック（録音データなし）
      if (audioBlob.size < 5000) {
        setError('録音が短すぎます。タップして話し始め、話し終わったらもう一度タップしてください')
        setAppState('idle')
        return
      }
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
      style={{ background: BG, minHeight: '100dvh', paddingTop: '48px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}
      className="flex flex-col items-center justify-between"
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
      <p style={{
        fontSize: '14px',
        textAlign: 'center',
        lineHeight: 1.6,
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#7aafd4',
      }}>
        {error
          ? <span style={{ color: '#eb6168' }}>{error}</span>
          : isRecording && isNearLimit
          ? <span style={{ color: '#eb6168' }}>⚠️ あと{remainingSeconds}秒で自動停止</span>
          : isRecording && !canStop
          ? <span style={{ color: '#a8d8ff' }}>🎙️ 録音中… <b style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatTime(elapsedSeconds)}</b></span>
          : isRecording
          ? <span style={{ color: '#a8d8ff' }}>話し終わったら、もう一度タップ　<b style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatTime(elapsedSeconds)}</b></span>
          : getCTA()}
      </p>
    </main>
  )
}
