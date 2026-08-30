// src/app/page.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Waveform } from '@/app/components/Waveform'
import { RecordButton } from '@/app/components/RecordButton'
import { LoadingScreen } from '@/app/components/LoadingScreen'
import { ResultScreen } from '@/app/components/ResultScreen'
import { useAudioRecorder, MAX_RECORDING_SECONDS, WARNING_BEFORE_SECONDS } from '@/app/hooks/useAudioRecorder'
import { transcribeAndAnalyze, analyzeImageJournal, type AnalysisResult } from '@/app/actions/analyze'
import { getCTA } from '@/app/utils/cta'
import { resizeImage } from '@/app/utils/image'
import { StreakHeader } from '@/app/components/StreakHeader'

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

type AppState = 'idle' | 'recording' | 'loading' | 'result' | 'image-preview'

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canStop, setCanStop] = useState(false)
  const canStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 画像ジャーナリング用
  const [pendingOcr, setPendingOcr] = useState<string | null>(null)     // OCR用（高解像度）
  const [pendingThumb, setPendingThumb] = useState<string | null>(null) // 履歴保存用（縮小）
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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
  const isNearLimit = isRecording && remainingSeconds <= WARNING_BEFORE_SECONDS

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
    setPendingOcr(null)
    setPendingThumb(null)
    setAppState('idle')
  }, [resetRecorder])

  // 画像ファイルが選択されたとき：リサイズしてプレビュー画面へ
  const handleImageSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイルを再選択できるようにクリア
    if (!file) return
    setError(null)
    try {
      // OCR用は高解像度、保存用サムネイルは軽量に
      const [ocr, thumb] = await Promise.all([
        resizeImage(file, 1600, 0.85),
        resizeImage(file, 600, 0.6),
      ])
      setPendingOcr(ocr)
      setPendingThumb(thumb)
      setAppState('image-preview')
    } catch {
      setError('画像を読み込めませんでした。別の画像でお試しください')
    }
  }, [])

  // プレビューした画像を分析
  const handleAnalyzeImage = useCallback(async () => {
    if (!pendingOcr) return
    setAppState('loading')
    try {
      const formData = new FormData()
      formData.append('ocrImage', pendingOcr)
      if (pendingThumb) formData.append('thumbnail', pendingThumb)
      const analysisResult = await analyzeImageJournal(formData)
      setResult(analysisResult)
      setAppState('result')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '分析に失敗しました'
      setError(msg)
      setAppState('image-preview')
    }
  }, [pendingOcr, pendingThumb])

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

  if (appState === 'image-preview' && pendingThumb) {
    return (
      <main
        style={{ background: BG, minHeight: '100dvh', paddingTop: '48px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}
        className="flex flex-col items-center"
      >
        <span className="text-xs tracking-[0.35em] uppercase select-none mb-6" style={{ color: '#eb6168' }}>
          手書きジャーナル
        </span>

        {/* プレビュー */}
        <div style={{
          flex: 1,
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingThumb}
            alt="手書きジャーナルのプレビュー"
            style={{
              maxWidth: '100%',
              maxHeight: '52vh',
              borderRadius: '16px',
              border: '1px solid rgba(0,84,167,0.3)',
              objectFit: 'contain',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#eb6168', fontSize: '13px', textAlign: 'center', margin: '12px 0' }}>{error}</p>
        )}

        {/* アクション */}
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={handleAnalyzeImage}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '9999px',
              border: 'none',
              background: '#eb6168',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            この内容で分析する
          </button>
          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '9999px',
              border: '1px solid rgba(0,84,167,0.3)',
              background: 'transparent',
              color: '#7aafd4',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            やめる
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      style={{ background: BG, minHeight: '100dvh', paddingTop: '48px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}
      className="flex flex-col items-center justify-between"
    >
      {/* Logo + 継続ステータス */}
      <div className="flex flex-col items-center gap-5 w-full">
        <span className="text-xs tracking-[0.35em] uppercase select-none" style={{ color: '#eb6168' }}>
          AlterLog
        </span>
        <StreakHeader />
      </div>

      {/* Center: waveform + button */}
      <div className="flex flex-col items-center gap-10">
        <Waveform analyserNode={analyserNode} isRecording={isRecording} />
        <RecordButton
          isRecording={isRecording}
          onToggle={handleToggleRecord}
          disabled={isLoading}
        />
      </div>

      {/* 下部：CTA text + 手書き投稿 */}
      <div className="flex flex-col items-center gap-4 w-full">
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
          ? <span style={{ color: '#eb6168' }}>⚠️ あと<b style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatTime(remainingSeconds)}</b>で自動停止</span>
          : isRecording && !canStop
          ? <span style={{ color: '#a8d8ff' }}>🎙️ 録音中… <b style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatTime(elapsedSeconds)}</b></span>
          : isRecording
          ? <span style={{ color: '#a8d8ff' }}>話し終わったら、もう一度タップ　<b style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatTime(elapsedSeconds)}</b></span>
          : getCTA()}
      </p>

      {/* 手書きジャーナル（画像）— 録音中は非表示 */}
      {!isRecording && (
        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px' }}>
          <button
            onClick={() => cameraInputRef.current?.click()}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '9999px',
              border: '1px solid rgba(0,84,167,0.3)',
              background: 'rgba(0,84,167,0.08)',
              color: '#7aafd4',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            📷 手書きを撮影
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '9999px',
              border: '1px solid rgba(0,84,167,0.3)',
              background: 'rgba(0,84,167,0.08)',
              color: '#7aafd4',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            🖼 画像を選択
          </button>
        </div>
      )}

      {/* 隠しファイル入力 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelected}
        style={{ display: 'none' }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        style={{ display: 'none' }}
      />
      </div>
    </main>
  )
}
