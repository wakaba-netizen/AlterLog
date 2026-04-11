# AlterLog MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA that records voice, transcribes via Whisper, and returns a brutally honest AI analysis across 3 screens (record → loading → result).

**Architecture:** Single `page.tsx` state machine (`idle → recording → loading → result`). Audio is captured via `useAudioRecorder` hook (MediaRecorder + Web Audio API), sent to a Server Action that calls Whisper + GPT-4o in sequence, saves to Supabase, and returns the result.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, Supabase JS, OpenAI SDK, Vitest + React Testing Library

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/app/page.tsx` | State machine: idle/recording/loading/result |
| `src/app/layout.tsx` | Root layout, PWA meta tags, SW registration |
| `src/app/globals.css` | Tailwind base + custom keyframe animations |
| `src/app/actions/analyze.ts` | Server Action: Whisper → GPT-4o → Supabase |
| `src/app/actions/analyze.test.ts` | Unit tests for Server Action |
| `src/app/components/Waveform.tsx` | 11-bar Web Audio API waveform |
| `src/app/components/RecordButton.tsx` | Animated record/stop button |
| `src/app/components/LoadingScreen.tsx` | Loading animation + status steps |
| `src/app/components/ResultScreen.tsx` | Analysis results display |
| `src/app/components/ResultScreen.test.tsx` | Unit tests for ResultScreen |
| `src/app/hooks/useAudioRecorder.ts` | MediaRecorder + AnalyserNode hook |
| `src/app/utils/cta.ts` | Time-based CTA text logic |
| `src/app/utils/cta.test.ts` | Unit tests for CTA |
| `src/lib/supabase.ts` | Supabase client factory |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Minimal service worker |
| `scripts/generate-icons.mjs` | Generate 192×192 and 512×512 PNG icons |
| `.env.local` | API key template |
| `vitest.config.ts` | Vitest config |
| `src/test/setup.ts` | Testing Library setup |

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `/Users/wakabayashiyuki/Projects/AlterLog/` (project root)

- [ ] **Step 1: Scaffold**

```bash
cd /Users/wakabayashiyuki/Projects
npx create-next-app@latest AlterLog \
  --typescript --tailwind --app --src-dir \
  --no-eslint --import-alias "@/*" \
  --use-npm
cd AlterLog
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install openai @supabase/supabase-js
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom \
  @types/testing-library__jest-dom sharp
```

- [ ] **Step 4: Verify installs**

```bash
npm ls openai @supabase/supabase-js vitest
```

Expected: all three listed with versions, no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

## Task 2: Vitest Configuration

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 2: Write `src/test/setup.ts`**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Add test script to `package.json`**

Open `package.json`. In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run tests (expect 0 tests, no errors)**

```bash
npm test
```

Expected: `No test files found` or `0 tests passed`. No crash.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json
git commit -m "chore: configure Vitest with React Testing Library"
```

---

## Task 3: Environment Variables Template

**Files:**
- Create: `.env.local`
- Create: `src/types/env.d.ts`

- [ ] **Step 1: Write `.env.local`**

```bash
# .env.local
OPENAI_API_KEY=sk-your-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 2: Write `src/types/env.d.ts`**

```typescript
// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY: string
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  }
}
```

- [ ] **Step 3: Ensure `.env.local` is in `.gitignore`**

```bash
grep -q '.env.local' .gitignore && echo "already ignored" || echo ".env.local" >> .gitignore
```

Expected: `already ignored` (create-next-app adds it by default).

- [ ] **Step 4: Commit**

```bash
git add src/types/env.d.ts .gitignore
git commit -m "chore: add env template and type declarations"
```

---

## Task 4: Supabase Client

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Write `src/lib/supabase.ts`**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
```

- [ ] **Step 2: Copy Supabase SQL schema**

Create a migration reference file at `supabase/schema.sql`:

```sql
-- supabase/schema.sql
-- Run this in the Supabase SQL editor to create the entries table.

CREATE TABLE IF NOT EXISTS entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transcript    TEXT NOT NULL,
  fact_ratio    INTEGER NOT NULL CHECK (fact_ratio BETWEEN 0 AND 100),
  emotion_ratio INTEGER NOT NULL CHECK (emotion_ratio BETWEEN 0 AND 100),
  passive_ratio INTEGER NOT NULL CHECK (passive_ratio BETWEEN 0 AND 100),
  thinking_profile TEXT NOT NULL,
  ai_comment    TEXT NOT NULL
);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts supabase/schema.sql
git commit -m "feat: add Supabase client and schema"
```

---

## Task 5: CTA Utility (TDD)

**Files:**
- Create: `src/app/utils/cta.ts`
- Create: `src/app/utils/cta.test.ts`

- [ ] **Step 1: Write failing tests first**

```typescript
// src/app/utils/cta.test.ts
import { describe, it, expect } from 'vitest'
import { getCTA } from './cta'

describe('getCTA', () => {
  it('returns morning message at 5am', () => {
    expect(getCTA(5)).toBe('今のモヤモヤ、全部置いていこう。')
  })
  it('returns morning message at 10am', () => {
    expect(getCTA(10)).toBe('今のモヤモヤ、全部置いていこう。')
  })
  it('returns default at 11am (boundary)', () => {
    expect(getCTA(11)).toBe('さあ、吐き出せ。')
  })
  it('returns default message at noon', () => {
    expect(getCTA(12)).toBe('さあ、吐き出せ。')
  })
  it('returns default at 20:59 (boundary)', () => {
    expect(getCTA(20)).toBe('さあ、吐き出せ。')
  })
  it('returns night message at 21', () => {
    expect(getCTA(21)).toBe('今日一日を、全部ここに置いていけ。')
  })
  it('returns night message at 2am', () => {
    expect(getCTA(2)).toBe('今日一日を、全部ここに置いていけ。')
  })
  it('returns night message at midnight', () => {
    expect(getCTA(0)).toBe('今日一日を、全部ここに置いていけ。')
  })
  it('uses current hour when no argument given', () => {
    const result = getCTA()
    expect(['今のモヤモヤ、全部置いていこう。', 'さあ、吐き出せ。', '今日一日を、全部ここに置いていけ。']).toContain(result)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/app/utils/cta.test.ts
```

Expected: `Cannot find module './cta'` or similar.

- [ ] **Step 3: Write implementation**

```typescript
// src/app/utils/cta.ts
export function getCTA(hour: number = new Date().getHours()): string {
  if (hour >= 5 && hour < 11) return '今のモヤモヤ、全部置いていこう。'
  if (hour >= 21 || hour < 5) return '今日一日を、全部ここに置いていけ。'
  return 'さあ、吐き出せ。'
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/app/utils/cta.test.ts
```

Expected: `9 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/app/utils/cta.ts src/app/utils/cta.test.ts
git commit -m "feat: add time-based CTA utility with tests"
```

---

## Task 6: Server Action — transcribeAndAnalyze (TDD)

**Files:**
- Create: `src/app/actions/analyze.ts`
- Create: `src/app/actions/analyze.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/app/actions/analyze.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
const mockTranscribe = vi.fn()
const mockInsert = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    audio: { transcriptions: { create: mockTranscribe } },
    chat: { completions: { create: mockCreate } },
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsert,
        })),
      })),
    })),
  })),
}))

describe('transcribeAndAnalyze', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')

    mockTranscribe.mockResolvedValue({ text: 'テストの文字起こし' })
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            fact_ratio: 60,
            emotion_ratio: 40,
            passive_ratio: 25,
            thinking_profile: '焦燥感に駆られた完璧主義者',
            ai_comment: '受動態が25%。まだ手加減している。',
          }),
        },
      }],
    })
    mockInsert.mockResolvedValue({ data: { id: 'uuid-1234' }, error: null })
  })

  it('returns full AnalysisResult on success', async () => {
    const { transcribeAndAnalyze } = await import('./analyze')
    const fd = new FormData()
    fd.append('audio', new Blob(['audio'], { type: 'audio/webm' }), 'rec.webm')

    const result = await transcribeAndAnalyze(fd)

    expect(result.transcript).toBe('テストの文字起こし')
    expect(result.fact_ratio).toBe(60)
    expect(result.emotion_ratio).toBe(40)
    expect(result.passive_ratio).toBe(25)
    expect(result.thinking_profile).toBe('焦燥感に駆られた完璧主義者')
    expect(result.ai_comment).toBe('受動態が25%。まだ手加減している。')
    expect(result.id).toBe('uuid-1234')
  })

  it('throws when FormData has no audio', async () => {
    const { transcribeAndAnalyze } = await import('./analyze')
    await expect(transcribeAndAnalyze(new FormData())).rejects.toThrow('音声データがありません')
  })

  it('throws when Supabase insert fails', async () => {
    mockInsert.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    const { transcribeAndAnalyze } = await import('./analyze')
    const fd = new FormData()
    fd.append('audio', new Blob(['audio'], { type: 'audio/webm' }), 'rec.webm')

    await expect(transcribeAndAnalyze(fd)).rejects.toThrow('保存に失敗しました')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/app/actions/analyze.test.ts
```

Expected: `Cannot find module './analyze'`.

- [ ] **Step 3: Write implementation**

```typescript
// src/app/actions/analyze.ts
'use server'

import OpenAI from 'openai'
import { getSupabaseClient } from '@/lib/supabase'

export interface AnalysisResult {
  id: string
  transcript: string
  fact_ratio: number
  emotion_ratio: number
  passive_ratio: number
  thinking_profile: string
  ai_comment: string
}

const SYSTEM_PROMPT = `あなたは「AlterLog」というアプリの分析AIです。
ユーザーの音声ジャーナルを受け取り、徹底的に客観分析します。

【絶対ルール】
- ユーザーを褒めない。慰めない。共感の演技をしない。
- 鋭いビジネス参謀として、核心だけを突く。
- ユーザーの可能性を信じるからこその、愛ある冷徹な分析をせよ。
- ZOZOTOWNを創業した起業家に語りかけるレベルの熱量と厳しさで。

【passive_ratioの定義】
文法的な受動態ではなく「被害者モード」の度合い。
他責・言い訳・「〜されてしまった」「〜のせいで」「仕方なかった」などを厳しく検出せよ。

【出力フォーマット（JSONのみ、他のテキスト禁止）】
{
  "fact_ratio": <0-100の整数。客観的事実の割合>,
  "emotion_ratio": <0-100の整数。100 - fact_ratioと一致させること>,
  "passive_ratio": <0-100の整数。被害者モード・他責表現の割合>,
  "thinking_profile": <20文字以内の思考タイプラベル>,
  "ai_comment": <1〜3文。短く鋭く。主語は「あなた」。褒め禁止。愛ある冷徹さで。>
}`

export async function transcribeAndAnalyze(formData: FormData): Promise<AnalysisResult> {
  const audioFile = formData.get('audio') as File | null
  if (!audioFile) throw new Error('音声データがありません')

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ja',
  })
  const transcript = transcription.text

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
  })

  const analysis = JSON.parse(completion.choices[0].message.content!) as {
    fact_ratio: number
    emotion_ratio: number
    passive_ratio: number
    thinking_profile: string
    ai_comment: string
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('entries')
    .insert({ transcript, ...analysis })
    .select('id')
    .single()

  if (error) throw new Error(`保存に失敗しました: ${error.message}`)

  return { id: data.id, transcript, ...analysis }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/app/actions/analyze.test.ts
```

Expected: `3 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/analyze.ts src/app/actions/analyze.test.ts src/lib/supabase.ts
git commit -m "feat: add transcribeAndAnalyze Server Action with tests"
```

---

## Task 7: useAudioRecorder Hook

**Files:**
- Create: `src/app/hooks/useAudioRecorder.ts`

- [ ] **Step 1: Write the hook**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/hooks/useAudioRecorder.ts
git commit -m "feat: add useAudioRecorder hook with Web Audio API"
```

---

## Task 8: Waveform Component

**Files:**
- Create: `src/app/components/Waveform.tsx`

- [ ] **Step 1: Write the component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/Waveform.tsx
git commit -m "feat: add Waveform component with Web Audio API visualization"
```

---

## Task 9: RecordButton Component

**Files:**
- Create: `src/app/components/RecordButton.tsx`

- [ ] **Step 1: Write the component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/RecordButton.tsx
git commit -m "feat: add RecordButton component with animations"
```

---

## Task 10: LoadingScreen Component

**Files:**
- Create: `src/app/components/LoadingScreen.tsx`

- [ ] **Step 1: Write the component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/LoadingScreen.tsx
git commit -m "feat: add LoadingScreen with breathing animation"
```

---

## Task 11: ResultScreen Component (TDD)

**Files:**
- Create: `src/app/components/ResultScreen.tsx`
- Create: `src/app/components/ResultScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/app/components/ResultScreen.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultScreen } from './ResultScreen'
import type { AnalysisResult } from '@/app/actions/analyze'

const mockResult: AnalysisResult = {
  id: 'test-id',
  transcript: 'これはテストの文字起こし全文です。',
  fact_ratio: 60,
  emotion_ratio: 40,
  passive_ratio: 30,
  thinking_profile: '焦燥感に駆られた完璧主義者',
  ai_comment: '受動態が30%。あなたはまだ主語を手放している。',
}

describe('ResultScreen', () => {
  it('displays thinking profile prominently', () => {
    render(<ResultScreen result={mockResult} onReset={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '焦燥感に駆られた完璧主義者' })).toBeInTheDocument()
  })

  it('displays all three metric percentages', () => {
    render(<ResultScreen result={mockResult} onReset={vi.fn()} />)
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('displays AI comment', () => {
    render(<ResultScreen result={mockResult} onReset={vi.fn()} />)
    expect(screen.getByText('受動態が30%。あなたはまだ主語を手放している。')).toBeInTheDocument()
  })

  it('calls onReset when reset button is clicked', () => {
    const onReset = vi.fn()
    render(<ResultScreen result={mockResult} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: 'もう一度話す' }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('hides transcript by default, shows on toggle', () => {
    render(<ResultScreen result={mockResult} onReset={vi.fn()} />)
    expect(screen.queryByText('これはテストの文字起こし全文です。')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/原文を見る/))
    expect(screen.getByText('これはテストの文字起こし全文です。')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- src/app/components/ResultScreen.test.tsx
```

Expected: `Cannot find module './ResultScreen'`.

- [ ] **Step 3: Write implementation**

```typescript
// src/app/components/ResultScreen.tsx
'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/app/actions/analyze'

interface ResultScreenProps {
  result: AnalysisResult
  onReset: () => void
}

interface MetricBarProps {
  label: string
  value: number
  color: string
}

function MetricBar({ label, value, color }: MetricBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: color,
            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>
        {value}%
      </span>
    </div>
  )
}

export function ResultScreen({ result, onReset }: ResultScreenProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 gap-8">

      {/* Thinking Profile — full impact */}
      <div className="flex-1 flex flex-col justify-center items-center gap-3 pt-8">
        <p className="text-xs text-purple-400 uppercase tracking-[0.25em] text-center">
          今日の思考プロファイル
        </p>
        <h1
          role="heading"
          className="text-center font-bold leading-tight"
          style={{
            fontSize: 'clamp(1.8rem, 7vw, 3rem)',
            background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {result.thinking_profile}
        </h1>
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-4">
        <MetricBar label="事実"           value={result.fact_ratio}    color="#a78bfa" />
        <MetricBar label="感情"           value={result.emotion_ratio}  color="#38bdf8" />
        <MetricBar label="被害者モード"    value={result.passive_ratio}  color="#f472b6" />
      </div>

      {/* AI Comment */}
      <div className="rounded-2xl border border-purple-500/20 bg-white/[0.04] p-5">
        <p className="text-xs text-purple-400 uppercase tracking-widest mb-3">
          AlterLogの診断
        </p>
        <p className="text-slate-200 text-sm leading-relaxed">{result.ai_comment}</p>
      </div>

      {/* Transcript (collapsible) */}
      <div>
        <button
          onClick={() => setTranscriptOpen((o) => !o)}
          className="text-xs text-slate-500 flex items-center gap-1 active:text-slate-300 transition-colors"
        >
          原文を見る {transcriptOpen ? '▲' : '▼'}
        </button>
        {transcriptOpen && (
          <p className="mt-3 text-xs text-slate-400 leading-relaxed bg-white/[0.03] rounded-xl p-4">
            {result.transcript}
          </p>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        role="button"
        aria-label="もう一度話す"
        className="w-full py-4 rounded-2xl border border-purple-500/30 text-purple-300
                   text-sm font-medium active:scale-95 transition-transform"
      >
        もう一度話す
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/app/components/ResultScreen.test.tsx
```

Expected: `5 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/ResultScreen.tsx src/app/components/ResultScreen.test.tsx
git commit -m "feat: add ResultScreen component with tests"
```

---

## Task 12: Global CSS Animations

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace `globals.css` entirely**

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── AlterLog custom animations ── */

@keyframes alterlog-ripple {
  0%   { transform: scale(1);   opacity: 0.6; }
  100% { transform: scale(1.6); opacity: 0;   }
}

@keyframes alterlog-breathe {
  0%, 100% { transform: scale(0.88); box-shadow: 0 0 8px  rgba(167, 139, 250, 0.4); }
  50%       { transform: scale(1.12); box-shadow: 0 0 28px rgba(167, 139, 250, 0.85); }
}

@keyframes alterlog-pulse {
  0%, 100% { opacity: 1;   transform: scale(1);    }
  50%       { opacity: 0.6; transform: scale(0.92); }
}

@keyframes alterlog-breathe-bar {
  0%, 100% { opacity: 0.3; transform: scaleY(0.35); }
  50%       { opacity: 0.7; transform: scaleY(0.65); }
}

@keyframes alterlog-fade {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1;   }
}

/* Prevent overscroll bounce on mobile */
html, body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add AlterLog CSS keyframe animations"
```

---

## Task 13: Main page.tsx — State Machine

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `page.tsx`**

```typescript
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
      setAppState('loading') // audioBlob will arrive via useEffect
    }
  }, [appState, startRecording, stopRecording])

  const handleReset = useCallback(() => {
    resetRecorder()
    setResult(null)
    setError(null)
    setAppState('idle')
  }, [resetRecorder])

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
          disabled={appState === 'loading'}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add main page state machine (idle/recording/loading/result)"
```

---

## Task 14: PWA Setup — layout.tsx + manifest

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `public/manifest.json`
- Create: `public/sw.js`

- [ ] **Step 1: Write `public/manifest.json`**

```json
{
  "name": "AlterLog",
  "short_name": "AlterLog",
  "description": "音声ジャーナリング × 自己客観視",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f3460",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Write minimal `public/sw.js`**

```javascript
// public/sw.js
// Minimal service worker — enables "Add to Home Screen" on Android
const CACHE = 'alterlog-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
})

// Network-first strategy: always try network, fallback to cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
```

- [ ] **Step 3: Replace `src/app/layout.tsx`**

```typescript
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AlterLog',
  description: '音声ジャーナリング × 自己客観視',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AlterLog',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1a1a2e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin: 0, background: '#0f3460' }}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json public/sw.js src/app/layout.tsx
git commit -m "feat: add PWA manifest, service worker, and layout meta tags"
```

---

## Task 15: Generate PWA Icons

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`

- [ ] **Step 1: Write the icon generation script**

```javascript
// scripts/generate-icons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'fs'

const SIZES = [192, 512]

// SVG icon: dark gradient background + white waveform bars
function makeSvg(size) {
  const s = size
  const r = Math.round(s * 0.14) // corner radius
  const bw = Math.round(s * 0.055) // bar width
  const gap = Math.round(s * 0.028)
  const bars = 7
  const totalW = bars * bw + (bars - 1) * gap
  const startX = Math.round((s - totalW) / 2)
  const centerY = Math.round(s / 2)
  const heights = [0.28, 0.46, 0.64, 0.82, 0.64, 0.46, 0.28]

  const barSvgs = heights.map((h, i) => {
    const bh = Math.round(h * s * 0.55)
    const x = startX + i * (bw + gap)
    const y = centerY - Math.round(bh / 2)
    const rx = Math.round(bw / 2)
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${rx}" fill="#c4b5fd" opacity="${0.4 + i * 0.1 + (bars - 1 - i) * 0.1}"/>`
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${s}" y2="${s}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)" rx="${r}"/>
  ${barSvgs.join('\n  ')}
</svg>`
}

for (const size of SIZES) {
  const svg = Buffer.from(makeSvg(size))
  const png = await sharp(svg).png().toBuffer()
  writeFileSync(`public/icon-${size}.png`, png)
  console.log(`✓ public/icon-${size}.png`)
}

console.log('Icons generated successfully.')
```

- [ ] **Step 2: Run the script**

```bash
node scripts/generate-icons.mjs
```

Expected:
```
✓ public/icon-192.png
✓ public/icon-512.png
Icons generated successfully.
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-icons.mjs public/icon-192.png public/icon-512.png
git commit -m "feat: generate PWA icons with waveform design"
```

---

## Task 16: next.config.ts Cleanup + Final Run

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update `next.config.ts`**

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Server Actions to handle large audio files (up to 25 MB for Whisper)
  experimental: {
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
}

export default nextConfig
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass — `analyze`, `ResultScreen`, `getCTA`.

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```

Expected: `ready - started server on 0.0.0.0:3000`.

- [ ] **Step 4: Smoke test on desktop browser**

Open `http://localhost:3000`. Verify:
- Dark gradient background renders
- "AlterLog" label visible
- 11 waveform bars visible
- Record button visible with purple breathing animation
- CTA text matches current time of day

- [ ] **Step 5: Smoke test on mobile (Galaxy S25)**

On the same Wi-Fi network, open `http://<your-mac-ip>:3000` in Chrome on the phone. Verify:
- Layout fills screen without horizontal scroll
- Tap record → browser asks microphone permission
- After granting, bars animate to voice input
- Tap again → loading screen appears

- [ ] **Step 6: Final commit**

```bash
git add next.config.ts
git commit -m "feat: configure Server Actions body size limit for audio upload"
```

---

## Notes for When API Keys Are Added

1. Run `supabase/schema.sql` in the Supabase SQL editor to create the `entries` table.
2. Fill in `.env.local` with real `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Restart the dev server: `npm run dev`.
4. Full flow: record → loading → result will be functional.
