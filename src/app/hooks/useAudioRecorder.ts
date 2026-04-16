// src/app/hooks/useAudioRecorder.ts
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export const MAX_RECORDING_SECONDS = 300 // 5分

export interface AudioRecorderState {
  isRecording: boolean
  audioBlob: Blob | null
  analyserNode: AnalyserNode | null
  error: string | null
  elapsedSeconds: number
}

export interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>
  stopRecording: () => void
  reset: () => void
}

const INITIAL_STATE: AudioRecorderState = {
  isRecording: false,
  audioBlob: null,
  analyserNode: null,
  error: null,
  elapsedSeconds: 0,
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecorderState>(INITIAL_STATE)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const elapsedRef = useRef<number>(0)

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null }
  }, [])

  const stopRecording = useCallback(() => {
    clearTimers()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [clearTimers])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      audioContext.createMediaStreamSource(stream).connect(analyser)
      audioContextRef.current = audioContext

      // Safari/iOS uses audio/mp4, Chrome/Android uses audio/webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      elapsedRef.current = 0

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        clearTimers()
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        audioContextRef.current?.close()
        setState({ isRecording: false, audioBlob: blob, analyserNode: null, error: null, elapsedSeconds: elapsedRef.current })
      }

      mediaRecorder.start(100)
      setState({ isRecording: true, audioBlob: null, analyserNode: analyser, error: null, elapsedSeconds: 0 })

      // 経過秒数カウンター（1秒ごと）
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setState(prev => ({ ...prev, elapsedSeconds: elapsedRef.current }))
      }, 1000)

      // 5分で自動停止
      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, MAX_RECORDING_SECONDS * 1000)

    } catch {
      setState({ ...INITIAL_STATE, error: 'マイクへのアクセスが拒否されました' })
    }
  }, [clearTimers])

  const reset = useCallback(() => {
    clearTimers()
    setState(INITIAL_STATE)
  }, [clearTimers])

  // アンマウント時にクリーンアップ
  useEffect(() => () => clearTimers(), [clearTimers])

  return { ...state, startRecording, stopRecording, reset }
}
