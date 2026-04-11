# AlterLog フルスペック拡張 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AlterLog MVPを「ジャーナリング革命」フルスペック版に拡張する。履歴・AIコーチング・自動レポート・タイムカプセル・外部知識フィルターの5機能を追加する。

**Architecture:** Next.js App Router のページルーティングを拡張し、各機能を独立ページとして実装。BottomNavで5タブ構成に統合。Supabaseに3テーブル追加（chat_messages, time_capsules, knowledge_sources）。GeminiのロングコンテキストAPIで過去全ログを参照。

**Tech Stack:** Next.js 15 (App Router), Gemini 2.5 Flash (@google/generative-ai), Supabase (@supabase/supabase-js), Recharts (グラフ), Tailwind CSS, TypeScript

---

## 既存ファイル構造（変更なし）

```
src/
├── app/
│   ├── actions/analyze.ts        # 録音分析（既存）
│   ├── components/
│   │   ├── RecordButton.tsx      # 録音ボタン（既存）
│   │   ├── Waveform.tsx          # 波形（既存）
│   │   ├── LoadingScreen.tsx     # ローディング（既存）
│   │   └── ResultScreen.tsx      # 結果画面（既存）
│   ├── hooks/useAudioRecorder.ts # 録音フック（既存）
│   ├── utils/cta.ts              # CTAテキスト（既存）
│   ├── globals.css               # スタイル（既存）
│   ├── layout.tsx                # レイアウト（既存・変更あり）
│   └── page.tsx                  # メイン録音画面（既存）
└── lib/supabase.ts               # Supabaseクライアント（既存）
```

## 新規ファイル構造

```
src/
├── app/
│   ├── history/
│   │   └── page.tsx              # 履歴一覧ページ（新規）
│   ├── chat/
│   │   └── page.tsx              # AIコーチングチャットページ（新規）
│   ├── report/
│   │   └── page.tsx              # 週次・月次レポートページ（新規）
│   ├── capsule/
│   │   └── page.tsx              # タイムカプセルページ（新規）
│   ├── knowledge/
│   │   └── page.tsx              # 外部知識フィルターページ（新規）
│   ├── actions/
│   │   ├── analyze.ts            # 既存（Geminiモデル更新済み）
│   │   ├── entries.ts            # 過去ログ取得（新規）
│   │   ├── chat.ts               # AIコーチング（新規）
│   │   ├── report.ts             # レポート生成（新規）
│   │   ├── capsule.ts            # タイムカプセルCRUD（新規）
│   │   └── knowledge.ts          # 外部知識処理（新規）
│   └── components/
│       ├── BottomNav.tsx         # ボトムナビゲーション（新規）
│       ├── EntryCard.tsx         # 履歴カード（新規）
│       ├── EntryDetailModal.tsx  # 履歴詳細モーダル（新規）
│       ├── ChatBubble.tsx        # チャットバブル（新規）
│       ├── MetricsChart.tsx      # メトリクスグラフ（新規）
│       └── CapsuleCard.tsx       # タイムカプセルカード（新規）
supabase/
└── schema_v2.sql                 # 追加テーブル定義（新規）
```

---

## Phase 0: DB拡張 + ナビゲーション基盤

### Task 0-A: Supabaseスキーマ追加

**Files:**
- Create: `supabase/schema_v2.sql`

- [ ] **Step 1: schema_v2.sql を作成**

```sql
-- supabase/schema_v2.sql
-- Phase 2: AIコーチングチャット履歴
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id UUID NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL
);

-- Phase 4: タイムカプセル
CREATE TABLE IF NOT EXISTS time_capsules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  open_at    TIMESTAMPTZ NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_opened  BOOLEAN NOT NULL DEFAULT FALSE
);

-- Phase 5: 外部知識ソース
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type       TEXT NOT NULL CHECK (type IN ('url', 'pdf')),
  source     TEXT NOT NULL,
  title      TEXT,
  content    TEXT NOT NULL
);
```

- [ ] **Step 2: Supabase SQL Editorで実行**

Supabaseダッシュボード → SQL Editor → 上記SQLを貼り付けて Run。

- [ ] **Step 3: entries テーブルに weather/hour カラム追加（メンタルトリガー用）**

```sql
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS hour_of_day INTEGER,
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- 既存データをバックフィル
UPDATE entries
SET
  hour_of_day = EXTRACT(HOUR FROM created_at),
  day_of_week = EXTRACT(DOW FROM created_at);
```

---

### Task 0-B: recharts インストール

**Files:**
- Modify: `package.json`（自動）

- [ ] **Step 1: recharts をインストール**

```bash
cd ~/Projects/AlterLog && npm install recharts
```

Expected output: `added X packages`

- [ ] **Step 2: 型定義確認**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: エラーなし（または既存エラーのみ）

---

### Task 0-C: BottomNav コンポーネント

**Files:**
- Create: `src/app/components/BottomNav.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: BottomNav.tsx を作成**

```tsx
// src/app/components/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/',          icon: '🎙️', label: '録音' },
  { href: '/history',   icon: '📋', label: '履歴' },
  { href: '/chat',      icon: '🤖', label: 'コーチ' },
  { href: '/report',    icon: '📊', label: 'レポート' },
  { href: '/capsule',   icon: '💌', label: '手紙' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background: 'rgba(15,20,40,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(167,139,250,0.15)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ href, icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-all"
            style={{ color: active ? '#a78bfa' : 'rgba(148,163,184,0.6)' }}
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[10px] tracking-wide">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: layout.tsx に BottomNav を追加**

`src/app/layout.tsx` の `<body>` 内に BottomNav を追加：

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/app/components/BottomNav'

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
        <link rel="icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, background: '#0f3460', paddingBottom: '64px' }}>
        {children}
        <BottomNav />
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

- [ ] **Step 3: コミット**

```bash
cd ~/Projects/AlterLog && git add -A && git commit -m "feat: add BottomNav with 5-tab navigation"
```

---

## Phase 1: 履歴画面

### Task 1-A: entries 取得 Server Action

**Files:**
- Create: `src/app/actions/entries.ts`

- [ ] **Step 1: entries.ts を作成**

```typescript
// src/app/actions/entries.ts
'use server'

import { getSupabaseClient } from '@/lib/supabase'

export interface EntryRow {
  id: string
  created_at: string
  transcript: string
  fact_ratio: number
  emotion_ratio: number
  passive_ratio: number
  thinking_profile: string
  ai_comment: string
}

export async function getEntries(limit = 100): Promise<EntryRow[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`ログ取得失敗: ${error.message}`)
  return (data ?? []) as EntryRow[]
}

export async function getEntryById(id: string): Promise<EntryRow | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as EntryRow
}
```

---

### Task 1-B: EntryCard コンポーネント

**Files:**
- Create: `src/app/components/EntryCard.tsx`

- [ ] **Step 1: EntryCard.tsx を作成**

```tsx
// src/app/components/EntryCard.tsx
'use client'

import type { EntryRow } from '@/app/actions/entries'

interface EntryCardProps {
  entry: EntryRow
  onClick: (entry: EntryRow) => void
}

export function EntryCard({ entry, onClick }: EntryCardProps) {
  const date = new Date(entry.created_at)
  const dateStr = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

  const emotionColor =
    entry.emotion_ratio >= 70 ? '#f87171'
    : entry.emotion_ratio >= 40 ? '#fb923c'
    : '#34d399'

  return (
    <button
      onClick={() => onClick(entry)}
      className="w-full text-left rounded-2xl p-4 transition-all active:scale-98"
      style={{
        background: 'rgba(167,139,250,0.06)',
        border: '1px solid rgba(167,139,250,0.15)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{dateStr} {timeStr}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${emotionColor}22`, color: emotionColor }}
        >
          感情 {entry.emotion_ratio}%
        </span>
      </div>
      <p className="text-purple-300 text-sm font-medium mb-1">{entry.thinking_profile}</p>
      <p className="text-slate-400 text-xs line-clamp-2">{entry.transcript}</p>
    </button>
  )
}
```

---

### Task 1-C: EntryDetailModal コンポーネント

**Files:**
- Create: `src/app/components/EntryDetailModal.tsx`

- [ ] **Step 1: EntryDetailModal.tsx を作成**

```tsx
// src/app/components/EntryDetailModal.tsx
'use client'

import type { EntryRow } from '@/app/actions/entries'

interface EntryDetailModalProps {
  entry: EntryRow | null
  onClose: () => void
}

const BG = 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

export function EntryDetailModal({ entry, onClose }: EntryDetailModalProps) {
  if (!entry) return null

  const date = new Date(entry.created_at)
  const dateStr = date.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: BG }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <span className="text-xs text-slate-400">{dateStr}</span>
        <button
          onClick={onClose}
          className="text-slate-400 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 flex flex-col gap-6">
        {/* Thinking Profile */}
        <h2
          className="text-3xl font-bold leading-tight"
          style={{
            background: 'linear-gradient(135deg, #a78bfa, #67e8f9)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {entry.thinking_profile}
        </h2>

        {/* Metrics */}
        <div className="flex flex-col gap-2">
          {[
            { label: '事実', value: entry.fact_ratio, color: '#67e8f9' },
            { label: '感情', value: entry.emotion_ratio, color: '#f472b6' },
            { label: '被害者モード', value: entry.passive_ratio, color: '#fb923c' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-slate-400 text-sm w-24">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${value}%`, background: color }}
                />
              </div>
              <span className="text-sm font-bold" style={{ color }}>{value}%</span>
            </div>
          ))}
        </div>

        {/* AI Comment */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
        >
          <p className="text-xs text-purple-400 mb-2">ALTERLOGの診断</p>
          <p className="text-slate-200 text-sm leading-relaxed">{entry.ai_comment}</p>
        </div>

        {/* Transcript */}
        <div>
          <p className="text-xs text-slate-500 mb-2">書き起こし</p>
          <p className="text-slate-300 text-sm leading-relaxed">{entry.transcript}</p>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 1-D: 履歴ページ

**Files:**
- Create: `src/app/history/page.tsx`

- [ ] **Step 1: history/page.tsx を作成**

```tsx
// src/app/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { getEntries, type EntryRow } from '@/app/actions/entries'
import { EntryCard } from '@/app/components/EntryCard'
import { EntryDetailModal } from '@/app/components/EntryDetailModal'

const BG = 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

export default function HistoryPage() {
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EntryRow | null>(null)

  useEffect(() => {
    getEntries().then(setEntries).finally(() => setLoading(false))
  }, [])

  return (
    <main
      className="min-h-dvh flex flex-col px-4 pt-12 pb-24"
      style={{ background: BG }}
    >
      <h1 className="text-xs text-purple-400 tracking-[0.35em] uppercase mb-6">
        ジャーナル履歴
      </h1>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          読み込み中…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center">
          まだ記録がありません。<br />録音タブから始めましょう。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onClick={setSelected} />
          ))}
        </div>
      )}

      <EntryDetailModal entry={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add -A && git commit -m "feat: history page with entry list and detail modal"
```

---

## Phase 2: AIコーチング（チャット）

### Task 2-A: chat Server Action

**Files:**
- Create: `src/app/actions/chat.ts`

- [ ] **Step 1: chat.ts を作成**

```typescript
// src/app/actions/chat.ts
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseClient } from '@/lib/supabase'
import { getEntries } from '@/app/actions/entries'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function sendChatMessage(
  sessionId: string,
  userMessage: string
): Promise<ChatMessage> {
  const supabase = getSupabaseClient()

  // 過去ログ全件取得（ロングコンテキスト活用）
  const pastEntries = await getEntries(200)

  // 過去のチャット履歴取得
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20)

  const pastSummary = pastEntries
    .slice(0, 50)
    .map((e, i) => {
      const date = new Date(e.created_at).toLocaleDateString('ja-JP')
      return `[${i + 1}] ${date} | ${e.thinking_profile} | 感情${e.emotion_ratio}% | ${e.transcript.slice(0, 100)}`
    })
    .join('\n')

  // メンタルトリガー分析
  const hourCounts: Record<number, number[]> = {}
  pastEntries.forEach(e => {
    const hour = new Date(e.created_at).getHours()
    if (!hourCounts[hour]) hourCounts[hour] = []
    hourCounts[hour].push(e.emotion_ratio)
  })
  const triggerInsights = Object.entries(hourCounts)
    .filter(([, vals]) => vals.length >= 2)
    .map(([hour, vals]) => {
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      return `${hour}時台は平均感情${avg}%`
    })
    .join(', ')

  const systemPrompt = `あなたは「AlterLog」のAIコーチです。ユーザーの音声ジャーナルを長期間分析し、深く本質を突く助言をします。

【ユーザーの過去ジャーナル（最新${Math.min(pastEntries.length, 50)}件）】
${pastSummary || 'まだ記録がありません'}

【メンタルトリガーパターン】
${triggerInsights || '分析にはもっと記録が必要です'}

【あなたのスタンス】
- ユーザーの過去の言葉を具体的に引用して指摘する
- 褒めない。慰めない。パターンと事実だけを鋭く伝える
- 「X月X日に『〜』と言っていたが、今もそれは変わっていない」のように過去を参照
- 200字以内で答える`

  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  })

  const chatHistory = (history ?? []).map(msg => ({
    role: msg.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.content }],
  }))

  const chat = model.startChat({ history: chatHistory })
  const result = await chat.sendMessage(userMessage)
  const assistantContent = result.response.text()

  // ユーザーメッセージ保存
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: userMessage,
  })

  // アシスタントメッセージ保存
  const { data: saved, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
    })
    .select()
    .single()

  if (error) throw new Error(`チャット保存失敗: ${error.message}`)

  return saved as ChatMessage
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ChatMessage[]
}
```

---

### Task 2-B: ChatBubble コンポーネント

**Files:**
- Create: `src/app/components/ChatBubble.tsx`

- [ ] **Step 1: ChatBubble.tsx を作成**

```tsx
// src/app/components/ChatBubble.tsx
'use client'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: 'rgba(167,139,250,0.2)',
                border: '1px solid rgba(167,139,250,0.3)',
                color: '#e2e8f0',
              }
            : {
                background: 'rgba(15,52,96,0.6)',
                border: '1px solid rgba(103,232,249,0.2)',
                color: '#cbd5e1',
              }
        }
      >
        {!isUser && (
          <p className="text-[10px] text-cyan-400 mb-1 tracking-wide">ALTERLOG</p>
        )}
        {content}
      </div>
    </div>
  )
}
```

---

### Task 2-C: コーチングチャットページ

**Files:**
- Create: `src/app/chat/page.tsx`

- [ ] **Step 1: chat/page.tsx を作成**

```tsx
// src/app/chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { sendChatMessage, getChatHistory, type ChatMessage } from '@/app/actions/chat'
import { ChatBubble } from '@/app/components/ChatBubble'

const BG = 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
const SESSION_KEY = 'alterlog_chat_session'

export default function ChatPage() {
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return uuidv4()
    return sessionStorage.getItem(SESSION_KEY) || (() => {
      const id = uuidv4()
      sessionStorage.setItem(SESSION_KEY, id)
      return id
    })()
  })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getChatHistory(sessionId).then(setMessages)
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    // 楽観的UI更新
    const optimistic: ChatMessage = {
      id: 'tmp-' + Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const reply = await sendChatMessage(sessionId, text)
      setMessages(prev => [...prev, reply])
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="fixed inset-0 flex flex-col" style={{ background: BG, paddingBottom: '64px' }}>
      {/* Header */}
      <div className="px-6 pt-12 pb-3 shrink-0">
        <p className="text-xs text-purple-400 tracking-[0.35em] uppercase">AI コーチ</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3">
        {messages.length === 0 && !sending && (
          <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm px-8 py-16">
            過去のジャーナルを踏まえて、<br />何でも聞いてください。
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {sending && (
          <ChatBubble role="assistant" content="…" />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 px-4 py-3 flex gap-2"
        style={{ borderTop: '1px solid rgba(167,139,250,0.1)' }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="今、何を考えていますか？"
          disabled={sending}
          className="flex-1 rounded-full px-4 py-2.5 text-sm text-slate-200 outline-none disabled:opacity-40"
          style={{
            background: 'rgba(167,139,250,0.1)',
            border: '1px solid rgba(167,139,250,0.2)',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
          style={{ background: 'rgba(167,139,250,0.3)' }}
        >
          <span className="text-lg">↑</span>
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: uuid パッケージインストール**

```bash
npm install uuid && npm install -D @types/uuid
```

- [ ] **Step 3: コミット**

```bash
git add -A && git commit -m "feat: AI coaching chat with long-context past journal analysis"
```

---

## Phase 3: 自動レポート（回顧録）

### Task 3-A: report Server Action

**Files:**
- Create: `src/app/actions/report.ts`

- [ ] **Step 1: report.ts を作成**

```typescript
// src/app/actions/report.ts
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getEntries } from '@/app/actions/entries'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export interface ReportData {
  period: 'week' | 'month'
  entryCount: number
  avgFactRatio: number
  avgEmotionRatio: number
  avgPassiveRatio: number
  trend: Array<{ date: string; fact: number; emotion: number; passive: number }>
  summary: string
  growthPoints: string[]
  nextChallenge: string
}

export async function generateReport(period: 'week' | 'month'): Promise<ReportData> {
  const days = period === 'week' ? 7 : 30
  const since = new Date()
  since.setDate(since.getDate() - days)

  const allEntries = await getEntries(500)
  const entries = allEntries.filter(e => new Date(e.created_at) >= since)

  if (entries.length === 0) {
    return {
      period,
      entryCount: 0,
      avgFactRatio: 0,
      avgEmotionRatio: 0,
      avgPassiveRatio: 0,
      trend: [],
      summary: 'この期間のジャーナルがありません。',
      growthPoints: [],
      nextChallenge: '毎日1回の録音から始めましょう。',
    }
  }

  const avg = (key: keyof typeof entries[0]) =>
    Math.round(entries.reduce((s, e) => s + (e[key] as number), 0) / entries.length)

  // 日付別トレンド
  const byDate: Record<string, typeof entries> = {}
  entries.forEach(e => {
    const date = e.created_at.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(e)
  })
  const trend = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, es]) => ({
      date: date.slice(5), // MM-DD
      fact: Math.round(es.reduce((s, e) => s + e.fact_ratio, 0) / es.length),
      emotion: Math.round(es.reduce((s, e) => s + e.emotion_ratio, 0) / es.length),
      passive: Math.round(es.reduce((s, e) => s + e.passive_ratio, 0) / es.length),
    }))

  // Geminiで総括生成
  const entryText = entries
    .map(e => `${e.created_at.slice(0, 10)}: ${e.thinking_profile} | ${e.ai_comment}`)
    .join('\n')

  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `以下は${days}日間のジャーナル記録です。JSON形式で回顧録を生成してください。

${entryText}

以下のJSON形式のみで返してください（コードブロック不要）：
{
  "summary": "この期間の思考・行動パターンを2〜3文で鋭く総括",
  "growthPoints": ["具体的な成長ポイント1", "成長ポイント2", "成長ポイント3"],
  "nextChallenge": "次の${days}日間で取り組むべき具体的な1つの課題"
}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(raw) as {
    summary: string
    growthPoints: string[]
    nextChallenge: string
  }

  return {
    period,
    entryCount: entries.length,
    avgFactRatio: avg('fact_ratio'),
    avgEmotionRatio: avg('emotion_ratio'),
    avgPassiveRatio: avg('passive_ratio'),
    trend,
    ...parsed,
  }
}
```

---

### Task 3-B: MetricsChart コンポーネント

**Files:**
- Create: `src/app/components/MetricsChart.tsx`

- [ ] **Step 1: MetricsChart.tsx を作成**

```tsx
// src/app/components/MetricsChart.tsx
'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

interface TrendPoint {
  date: string
  fact: number
  emotion: number
  passive: number
}

interface MetricsChartProps {
  data: TrendPoint[]
}

export function MetricsChart({ data }: MetricsChartProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -30 }}>
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            background: '#1a1a2e',
            border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
        <Line type="monotone" dataKey="fact" name="事実" stroke="#67e8f9" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="emotion" name="感情" stroke="#f472b6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="passive" name="被害者" stroke="#fb923c" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

### Task 3-C: レポートページ

**Files:**
- Create: `src/app/report/page.tsx`

- [ ] **Step 1: report/page.tsx を作成**

```tsx
// src/app/report/page.tsx
'use client'

import { useState } from 'react'
import { generateReport, type ReportData } from '@/app/actions/report'
import { MetricsChart } from '@/app/components/MetricsChart'

const BG = 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

export default function ReportPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async (p: 'week' | 'month') => {
    setPeriod(p)
    setLoading(true)
    setReport(null)
    try {
      const data = await generateReport(p)
      setReport(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-dvh flex flex-col px-4 pt-12 pb-24"
      style={{ background: BG }}
    >
      <p className="text-xs text-purple-400 tracking-[0.35em] uppercase mb-6">回顧録</p>

      {/* Period selector */}
      <div
        className="flex rounded-full p-1 mb-6 self-start"
        style={{ background: 'rgba(167,139,250,0.1)' }}
      >
        {(['week', 'month'] as const).map(p => (
          <button
            key={p}
            onClick={() => load(p)}
            disabled={loading}
            className="px-5 py-1.5 rounded-full text-sm transition-all"
            style={{
              background: period === p ? 'rgba(167,139,250,0.3)' : 'transparent',
              color: period === p ? '#a78bfa' : '#64748b',
            }}
          >
            {p === 'week' ? '1週間' : '1ヶ月'}
          </button>
        ))}
      </div>

      {!report && !loading && (
        <button
          onClick={() => load(period)}
          className="self-start px-6 py-3 rounded-full text-sm text-purple-300 transition-all"
          style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}
        >
          レポートを生成
        </button>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          分析中…
        </div>
      )}

      {report && (
        <div className="flex flex-col gap-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '記録数', value: `${report.entryCount}件`, color: '#a78bfa' },
              { label: '平均感情', value: `${report.avgEmotionRatio}%`, color: '#f472b6' },
              { label: '被害者', value: `${report.avgPassiveRatio}%`, color: '#fb923c' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}
              >
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="font-bold text-lg" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {report.trend.length > 1 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)' }}
            >
              <p className="text-xs text-slate-500 mb-3">思考パターン推移</p>
              <MetricsChart data={report.trend} />
            </div>
          )}

          {/* Summary */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
          >
            <p className="text-xs text-purple-400 mb-2">この期間の総括</p>
            <p className="text-slate-200 text-sm leading-relaxed">{report.summary}</p>
          </div>

          {/* Growth Points */}
          {report.growthPoints.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">成長ポイント</p>
              <div className="flex flex-col gap-2">
                {report.growthPoints.map((point, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-green-400 text-sm mt-0.5">✓</span>
                    <p className="text-slate-300 text-sm leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Challenge */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}
          >
            <p className="text-xs text-orange-400 mb-2">次のチャレンジ</p>
            <p className="text-slate-200 text-sm leading-relaxed">{report.nextChallenge}</p>
          </div>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add -A && git commit -m "feat: weekly/monthly retrospective report with recharts"
```

---

## Phase 4: タイムカプセル

### Task 4-A: capsule Server Action

**Files:**
- Create: `src/app/actions/capsule.ts`

- [ ] **Step 1: capsule.ts を作成**

```typescript
// src/app/actions/capsule.ts
'use server'

import { getSupabaseClient } from '@/lib/supabase'

export interface TimeCapsule {
  id: string
  created_at: string
  open_at: string
  title: string
  content: string
  is_opened: boolean
}

export async function createCapsule(
  title: string,
  content: string,
  openAt: string
): Promise<TimeCapsule> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('time_capsules')
    .insert({ title, content, open_at: openAt })
    .select()
    .single()

  if (error) throw new Error(`タイムカプセル作成失敗: ${error.message}`)
  return data as TimeCapsule
}

export async function getCapsules(): Promise<TimeCapsule[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('time_capsules')
    .select('*')
    .order('open_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as TimeCapsule[]
}

export async function openCapsule(id: string): Promise<TimeCapsule> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('time_capsules')
    .update({ is_opened: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as TimeCapsule
}
```

---

### Task 4-B: タイムカプセルページ

**Files:**
- Create: `src/app/capsule/page.tsx`

- [ ] **Step 1: capsule/page.tsx を作成**

```tsx
// src/app/capsule/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  getCapsules, createCapsule, openCapsule,
  type TimeCapsule
} from '@/app/actions/capsule'

const BG = 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

function CapsuleCard({
  capsule,
  onOpen,
}: {
  capsule: TimeCapsule
  onOpen: (c: TimeCapsule) => void
}) {
  const now = new Date()
  const openAt = new Date(capsule.open_at)
  const canOpen = now >= openAt
  const daysLeft = Math.ceil((openAt.getTime() - now.getTime()) / 86400000)

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: canOpen && !capsule.is_opened
          ? 'rgba(167,139,250,0.12)'
          : 'rgba(167,139,250,0.04)',
        border: `1px solid ${canOpen && !capsule.is_opened ? 'rgba(167,139,250,0.4)' : 'rgba(167,139,250,0.1)'}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-purple-300 font-medium text-sm mb-1">{capsule.title}</p>
          <p className="text-xs text-slate-500">
            {openAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} に開封
          </p>
        </div>
        <span className="text-2xl">{capsule.is_opened ? '📬' : canOpen ? '💌' : '🔒'}</span>
      </div>

      {capsule.is_opened && (
        <p className="mt-3 text-slate-300 text-sm leading-relaxed border-t border-white/10 pt-3">
          {capsule.content}
        </p>
      )}

      {!capsule.is_opened && canOpen && (
        <button
          onClick={() => onOpen(capsule)}
          className="mt-3 w-full py-2 rounded-xl text-sm text-purple-300 transition-all"
          style={{ background: 'rgba(167,139,250,0.2)' }}
        >
          開封する
        </button>
      )}

      {!capsule.is_opened && !canOpen && (
        <p className="mt-2 text-xs text-slate-500">あと {daysLeft} 日</p>
      )}
    </div>
  )
}

export default function CapsulePage() {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [openAt, setOpenAt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCapsules().then(setCapsules)
  }, [])

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !openAt) return
    setSaving(true)
    try {
      const newCapsule = await createCapsule(title, content, new Date(openAt).toISOString())
      setCapsules(prev => [...prev, newCapsule].sort((a, b) => a.open_at.localeCompare(b.open_at)))
      setTitle('')
      setContent('')
      setOpenAt('')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleOpen = async (capsule: TimeCapsule) => {
    const updated = await openCapsule(capsule.id)
    setCapsules(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  // デフォルト開封日：6ヶ月後
  const defaultOpenAt = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  })()

  return (
    <main
      className="min-h-dvh flex flex-col px-4 pt-12 pb-24"
      style={{ background: BG }}
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-purple-400 tracking-[0.35em] uppercase">タイムカプセル</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-purple-300 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(167,139,250,0.15)' }}
        >
          + 手紙を書く
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-4 mb-6 flex flex-col gap-3"
          style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
        >
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="タイトル（例：半年後の自分へ）"
            className="rounded-xl px-3 py-2 text-sm text-slate-200 outline-none w-full"
            style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="未来の自分へのメッセージ…"
            rows={4}
            className="rounded-xl px-3 py-2 text-sm text-slate-200 outline-none w-full resize-none"
            style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">開封日</label>
            <input
              type="date"
              value={openAt || defaultOpenAt}
              onChange={e => setOpenAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="flex-1 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim() || !content.trim()}
            className="py-2.5 rounded-xl text-sm text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'rgba(167,139,250,0.3)' }}
          >
            {saving ? '保存中…' : '封印する'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {capsules.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">
            まだタイムカプセルがありません。<br />未来の自分への手紙を書いてみましょう。
          </p>
        ) : (
          capsules.map(c => (
            <CapsuleCard key={c.id} capsule={c} onOpen={handleOpen} />
          ))
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add -A && git commit -m "feat: time capsule with future-dated letter feature"
```

---

## Phase 5: 外部知識フィルター

### Task 5-A: knowledge Server Action

**Files:**
- Create: `src/app/actions/knowledge.ts`

- [ ] **Step 1: knowledge.ts を作成**

```typescript
// src/app/actions/knowledge.ts
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseClient } from '@/lib/supabase'
import { getEntries } from '@/app/actions/entries'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export interface KnowledgeSource {
  id: string
  created_at: string
  type: 'url' | 'pdf'
  source: string
  title: string | null
  content: string
}

export interface KnowledgeInsight {
  lessonTitle: string
  lesson: string
  connection: string
  action: string
}

export async function fetchUrlContent(url: string): Promise<string> {
  // Gemini URL contextを使用（直接URLを渡す）
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: 'text/html',
        fileUri: url,
      },
    },
    'このWebページの内容を日本語で詳しく要約してください。重要なポイント・概念・教訓を含めてください。',
  ]).catch(async () => {
    // フォールバック: URLをテキストとして渡す
    const r = await model.generateContent(
      `以下のURLのページについて、あなたが知っている範囲で内容を要約してください: ${url}`
    )
    return r
  })
  return result.response.text()
}

export async function saveKnowledgeSource(
  type: 'url',
  source: string,
  content: string,
  title?: string
): Promise<KnowledgeSource> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({ type, source, content, title: title ?? null })
    .select()
    .single()

  if (error) throw new Error(`保存失敗: ${error.message}`)
  return data as KnowledgeSource
}

export async function synthesizeKnowledge(knowledgeId: string): Promise<KnowledgeInsight> {
  const supabase = getSupabaseClient()

  // 知識ソース取得
  const { data: ks, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('id', knowledgeId)
    .single()
  if (error || !ks) throw new Error('知識ソースが見つかりません')

  // 直近の悩み・課題を過去ログから抽出
  const recentEntries = await getEntries(10)
  const recentConcerns = recentEntries
    .map(e => `${e.thinking_profile}: ${e.transcript.slice(0, 150)}`)
    .join('\n')

  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `【外部知識】
${ks.content}

【ユーザーの直近の悩み・思考】
${recentConcerns || '記録なし'}

上記の外部知識とユーザーの悩みを掛け合わせ、「今このユーザーに必要な教訓」を以下のJSON形式のみで返してください（コードブロック不要）：
{
  "lessonTitle": "15文字以内のキャッチーなタイトル",
  "lesson": "外部知識から得られる最重要の教訓（2文）",
  "connection": "ユーザーの悩みとこの教訓がどう繋がるか（2文）",
  "action": "明日から実行できる具体的なアクション1つ"
}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(raw) as KnowledgeInsight
}

export async function getKnowledgeSources(): Promise<KnowledgeSource[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as KnowledgeSource[]
}
```

---

### Task 5-B: 外部知識ページ

**Files:**
- Create: `src/app/knowledge/page.tsx`

- [ ] **Step 1: knowledge/page.tsx を作成（BottomNavの「コーチ」タブ内のサブ機能として /knowledge に配置）**

注: BottomNavの6番目タブとして追加するか、コーチタブからリンクする。ここでは独立ページとして作成。

```tsx
// src/app/knowledge/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  fetchUrlContent, saveKnowledgeSource, synthesizeKnowledge,
  getKnowledgeSources, type KnowledgeSource, type KnowledgeInsight
} from '@/app/actions/knowledge'

const BG = 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

export default function KnowledgePage() {
  const [url, setUrl] = useState('')
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<KnowledgeInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  useEffect(() => {
    getKnowledgeSources().then(setSources)
  }, [])

  const handleAddUrl = async () => {
    const trimmed = url.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      const content = await fetchUrlContent(trimmed)
      const saved = await saveKnowledgeSource('url', trimmed, content, trimmed)
      setSources(prev => [saved, ...prev])
      setUrl('')
    } finally {
      setLoading(false)
    }
  }

  const handleSynthesize = async (id: string) => {
    setInsightLoading(true)
    setInsight(null)
    try {
      const result = await synthesizeKnowledge(id)
      setInsight(result)
    } finally {
      setInsightLoading(false)
    }
  }

  return (
    <main
      className="min-h-dvh flex flex-col px-4 pt-12 pb-24"
      style={{ background: BG }}
    >
      <p className="text-xs text-purple-400 tracking-[0.35em] uppercase mb-6">学習フィルター</p>

      {/* URL Input */}
      <div className="flex gap-2 mb-6">
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
          placeholder="記事やWebページのURL"
          disabled={loading}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none disabled:opacity-40"
          style={{
            background: 'rgba(167,139,250,0.1)',
            border: '1px solid rgba(167,139,250,0.2)',
          }}
        />
        <button
          onClick={handleAddUrl}
          disabled={!url.trim() || loading}
          className="px-4 py-2.5 rounded-xl text-sm text-purple-300 disabled:opacity-30 transition-opacity"
          style={{ background: 'rgba(167,139,250,0.2)' }}
        >
          {loading ? '…' : '追加'}
        </button>
      </div>

      {/* Insight */}
      {insightLoading && (
        <div className="text-slate-500 text-sm text-center py-4">分析中…</div>
      )}

      {insight && (
        <div
          className="rounded-2xl p-4 mb-6 flex flex-col gap-3"
          style={{ background: 'rgba(103,232,249,0.06)', border: '1px solid rgba(103,232,249,0.2)' }}
        >
          <p className="text-cyan-300 font-bold">{insight.lessonTitle}</p>
          <div>
            <p className="text-xs text-slate-500 mb-1">教訓</p>
            <p className="text-slate-200 text-sm leading-relaxed">{insight.lesson}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">あなたへの繋がり</p>
            <p className="text-slate-200 text-sm leading-relaxed">{insight.connection}</p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(167,139,250,0.1)' }}
          >
            <p className="text-xs text-purple-400 mb-1">明日からのアクション</p>
            <p className="text-slate-200 text-sm">{insight.action}</p>
          </div>
        </div>
      )}

      {/* Sources List */}
      <div className="flex flex-col gap-3">
        {sources.map(s => (
          <div
            key={s.id}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)' }}
          >
            <p className="text-slate-300 text-sm mb-1 truncate">{s.source}</p>
            <p className="text-slate-500 text-xs mb-3 line-clamp-2">{s.content.slice(0, 100)}…</p>
            <button
              onClick={() => handleSynthesize(s.id)}
              disabled={insightLoading}
              className="text-xs text-cyan-400 px-3 py-1.5 rounded-full disabled:opacity-30"
              style={{ background: 'rgba(103,232,249,0.1)' }}
            >
              今の自分に合わせて分析
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: BottomNav に Knowledge タブを追加（オプション）**

`/knowledge` へのリンクを `/chat` ページ内に「学習フィルター →」ボタンとして追加するか、BottomNavのタブを「コーチ」→「📚 学習」として `/knowledge` に変更するか選択。

- [ ] **Step 3: コミット**

```bash
git add -A && git commit -m "feat: external knowledge filter with URL synthesis"
```

---

## Phase 6: Vercel デプロイ

### Task 6-A: 最終デプロイ

- [ ] **Step 1: ビルド確認**

```bash
cd ~/Projects/AlterLog && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 2: GitHub push**

```bash
git push origin main
```

- [ ] **Step 3: Vercel 自動デプロイ確認**

Vercelダッシュボードで deploy が `Ready` になることを確認。

- [ ] **Step 4: 本番動作確認**

`https://alter-log-liard.vercel.app` で全タブの動作確認。

---

## 自己レビュー

### Spec coverage チェック

| 要件 | 対応タスク |
|------|---------|
| 過去ログ全件コンテキスト | Task 2-A (chat.ts) |
| AIコーチング（チャット） | Task 2-B, 2-C |
| メンタルトリガー検知 | Task 2-A (hourCounts分析) |
| 週次・月次レポート | Task 3-A, 3-B, 3-C |
| グラフビジュアライゼーション | Task 3-B (MetricsChart) |
| 外部知識フィルター（URL） | Task 5-A, 5-B |
| タイムカプセル | Task 4-A, 4-B |
| BottomNav統合 | Task 0-C |
| 録音画面を邪魔しない | BottomNavはfixed bottom |

### 制約・注意事項

- **Vercel Hobby の関数タイムアウト**: 10秒。Geminiの呼び出しが長い場合は `maxDuration` を設定するか、streaming を検討。
- **PDFアップロード**: Phase 5ではURLのみ実装。PDF対応は `route.ts` での multipart 処理が必要（別フェーズ）。
- **リアルタイム通知**: タイムカプセルのリマインダーはブラウザ通知（Web Push）が必要。まずは画面表示のみ実装。
- **recharts SSR**: `'use client'` 必須。MetricsChart.tsx は Client Component のみ。
