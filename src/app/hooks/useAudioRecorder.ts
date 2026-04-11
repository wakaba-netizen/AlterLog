// src/app/hooks/useAudioRecorder.ts
'use client'

import { useState, useRef, useCallback } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  audioBlob: Blob | null
  analyserNode: AnalyserNode | null
  error: string | null
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
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecorderState>(INITIAL_STATE)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])

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

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        audioContextRef.current?.close()
        setState({ isRecording: false, audioBlob: blob, analyserNode: null, error: null })
      }

      mediaRecorder.start(100)
      setState({ isRecording: true, audioBlob: null, analyserNode: analyser, error: null })
    } catch {
      setState({ ...INITIAL_STATE, error: 'マイクへのアクセスが拒否されました' })
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return { ...state, startRecording, stopRecording, reset }
}
