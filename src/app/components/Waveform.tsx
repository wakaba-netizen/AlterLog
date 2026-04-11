// src/app/components/Waveform.tsx
'use client'

import { useEffect, useRef } from 'react'

interface WaveformProps {
  analyserNode: AnalyserNode | null
  isRecording: boolean
}

const BAR_COUNT = 11
// Mountain shape: tallest in the center
const IDLE_HEIGHTS = [12, 20, 32, 44, 56, 72, 56, 44, 32, 20, 12]

export function Waveform({ analyserNode, isRecording }: WaveformProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current)

    if (!isRecording || !analyserNode) {
      // Reset to idle heights with purple color
      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        bar.style.height = `${IDLE_HEIGHTS[i]}px`
        bar.style.background = '#a78bfa'
        bar.style.opacity = '0.5'
      })
      return
    }

    const bufferLength = analyserNode.frequencyBinCount // = fftSize / 2 = 128
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyserNode.getByteFrequencyData(dataArray)

      const segmentSize = Math.floor(bufferLength / BAR_COUNT)

      barsRef.current.forEach((bar, i) => {
        if (!bar) return

        // Average frequency energy for this bar's frequency segment
        let sum = 0
        const start = i * segmentSize
        for (let j = start; j < start + segmentSize; j++) sum += dataArray[j]
        const avg = sum / segmentSize // 0–255
        const n = avg / 255 // 0–1 normalized

        // Height: min 8px, max 72px, idle shape as baseline
        const minH = IDLE_HEIGHTS[i] * 0.3
        const maxH = 72
        const h = minH + n * (maxH - minH)
        bar.style.height = `${h}px`
        bar.style.opacity = (0.4 + n * 0.6).toString()

        // Color: low energy → purple (#a78bfa), high energy → cyan (#38bdf8)
        // Interpolate RGB: purple(167,139,250) → cyan(56,189,248)
        const r = Math.round(167 + n * (56 - 167))
        const g = Math.round(139 + n * (189 - 139))
        const b = Math.round(250 + n * (248 - 250))
        bar.style.background = `rgb(${r},${g},${b})`
      })
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [analyserNode, isRecording])

  return (
    <div
      className="flex items-end justify-center gap-[3px]"
      style={{ height: '80px', width: '180px' }}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el }}
          className="rounded-sm flex-shrink-0 transition-none"
          style={{
            width: '12px',
            height: `${IDLE_HEIGHTS[i]}px`,
            background: '#a78bfa',
            opacity: 0.5,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  )
}
