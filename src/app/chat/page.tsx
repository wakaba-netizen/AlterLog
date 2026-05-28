// src/app/chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { sendChatMessage, getChatHistory, sendGroupDiscussion, type ChatMessage } from '@/app/actions/chat'
import { PERSONA_LABELS, type Persona } from '@/app/lib/personas'
import { ChatBubble } from '@/app/components/ChatBubble'

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'

type Mode = Persona | 'all'

const PERSONA_COLORS: Record<Persona, { accent: string; bg: string; placeholder: string; greeting: string }> = {
  T:        { accent: '#eb6168', bg: 'rgba(235,97,104,0.1)',  placeholder: '糸井重里に話しかける…', greeting: 'おちつけ。\nやさしく、つよく、おもしろく。' },
  chikirin: { accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  placeholder: 'ちきりんに話しかける…', greeting: 'なぜ、そう思うの？\nその前提、本当に正しい？' },
  maezawa:  { accent: '#a855f7', bg: 'rgba(168,85,247,0.1)',  placeholder: '前澤に話しかける…',  greeting: 'それ、面白い？\nやるかやらないか、それだけ。' },
}

const ALL_CONFIG = {
  accent: '#22d3ee',
  bg: 'rgba(34,211,238,0.1)',
  placeholder: '3人に話しかける…',
  greeting: '3人が一斉に返答します。\n遠慮なく話しかけてください。',
}

const PERSONAS: Persona[] = ['T', 'chikirin', 'maezawa']
const MODES: Mode[] = ['T', 'chikirin', 'maezawa', 'all']

// モード表示設定
function getModeConfig(mode: Mode) {
  if (mode === 'all') return ALL_CONFIG
  return PERSONA_COLORS[mode]
}
function getModeLabel(mode: Mode) {
  if (mode === 'all') return '全員'
  return PERSONA_LABELS[mode]
}

// LocalChatMessage: persona情報付き
interface LocalChatMessage extends ChatMessage {
  personaLabel?: string
  personaAccent?: string
}

function getSessionKey(persona: Persona) {
  return `alterlog_chat_session_${persona}`
}

function getOrCreateSession(persona: Persona): string {
  const key = getSessionKey(persona)
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const id = uuidv4()
  sessionStorage.setItem(key, id)
  return id
}

export default function ChatPage() {
  const [mode, setMode] = useState<Mode>('T')

  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return uuidv4()
    return getOrCreateSession('T')
  })

  const [messages, setMessages] = useState<LocalChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [warningFlash, setWarningFlash] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // モード切り替え
  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setMessages([])
    if (next === 'all') {
      // 全員モードはhistoryを読み込まない（3セッション統合は複雑なので省略）
      return
    }
    const id = getOrCreateSession(next)
    setSessionId(id)
    getChatHistory(id).then(msgs =>
      setMessages(msgs.map(m => ({
        ...m,
        personaLabel: PERSONA_LABELS[next],
        personaAccent: PERSONA_COLORS[next].accent,
      })))
    )
  }

  useEffect(() => {
    if (mode === 'all') return
    getChatHistory(sessionId).then(msgs =>
      setMessages(msgs.map(m => ({
        ...m,
        personaLabel: PERSONA_LABELS[mode as Persona],
        personaAccent: PERSONA_COLORS[mode as Persona].accent,
      })))
    )
  }, [sessionId, mode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const optimisticUser: LocalChatMessage = {
      id: 'tmp-' + Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticUser])

    try {
      if (mode === 'all') {
        // 3人討議モード
        const turns = await sendGroupDiscussion(text)
        const ts = Date.now()

        const PERSONA_CONFIG: Record<string, { label: string; accent: string }> = {
          '糸井重里': { label: '糸井重里', accent: PERSONA_COLORS.T.accent },
          'ちきりん': { label: 'ちきりん', accent: PERSONA_COLORS.chikirin.accent },
          '前澤':     { label: '前澤友作', accent: PERSONA_COLORS.maezawa.accent },
          '最終提案': { label: '💡 最終提案', accent: '#22d3ee' },
        }

        const newMessages = turns.map((turn, i) => {
          const cfg = PERSONA_CONFIG[turn.persona] ?? { label: turn.persona, accent: '#64748b' }
          return {
            id: `group-${ts}-${i}`,
            role: 'assistant' as const,
            content: turn.content,
            created_at: new Date().toISOString(),
            personaLabel: cfg.label,
            personaAccent: cfg.accent,
          }
        })
        setMessages(prev => [...prev, ...newMessages])
      } else {
        const reply = await sendChatMessage(sessionId, text, mode as Persona)
        setMessages(prev => [
          ...prev,
          { ...reply, personaLabel: PERSONA_LABELS[mode as Persona], personaAccent: PERSONA_COLORS[mode as Persona].accent },
        ])
        if (reply.tone === 'warning') {
          setWarningFlash(true)
          setTimeout(() => setWarningFlash(false), 1200)
        }
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticUser.id))
    } finally {
      setSending(false)
    }
  }

  const currentConfig = getModeConfig(mode)

  return (
    <main style={{
      position: 'fixed',
      inset: 0,
      bottom: '60px',
      display: 'flex',
      flexDirection: 'column',
      background: BG,
      overflow: 'hidden',
    }}>
      {/* 警告フラッシュ */}
      {warningFlash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(235, 97, 104, 0.18)',
          zIndex: 100,
          pointerEvents: 'none',
        }} />
      )}

      {/* タブバー */}
      <div style={{
        flexShrink: 0,
        paddingTop: '44px',
        background: '#000d1e',
        borderBottom: `2px solid ${currentConfig.accent}`,
      }}>
        <div style={{ display: 'flex' }}>
          {MODES.map(m => {
            const active = mode === m
            const cfg = getModeConfig(m)
            return (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: '14px 4px',
                  fontSize: m === 'all' ? '13px' : '15px',
                  fontWeight: active ? 700 : 400,
                  border: 'none',
                  background: active ? cfg.bg : 'transparent',
                  color: active ? cfg.accent : '#ffffff',
                  cursor: 'pointer',
                  opacity: active ? 1 : 0.5,
                  letterSpacing: '0.03em',
                }}
              >
                {getModeLabel(m)}
              </button>
            )
          })}
          <a
            href="/knowledge"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 12px',
              fontSize: '13px',
              color: '#4b83c0',
              textDecoration: 'none',
              opacity: 0.8,
            }}
          >
            📚
          </a>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && !sending && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#64748b', fontSize: '14px', padding: '64px 32px' }}>
            {currentConfig.greeting.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            tone={msg.tone}
            personaLabel={msg.personaLabel}
            personaAccent={msg.personaAccent}
          />
        ))}
        {sending && mode !== 'all' && (
          <ChatBubble
            role="assistant"
            content="…"
            personaLabel={PERSONA_LABELS[mode as Persona]}
            personaAccent={PERSONA_COLORS[mode as Persona]?.accent}
          />
        )}
        {sending && mode === 'all' && (
          <ChatBubble
            role="assistant"
            content="3人が討議中…"
            personaLabel="💬 討議中"
            personaAccent="#22d3ee"
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '12px 16px', display: 'flex', gap: '8px', borderTop: '1px solid rgba(0,84,167,0.2)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={currentConfig.placeholder}
          disabled={sending}
          style={{
            flex: 1,
            borderRadius: '9999px',
            padding: '10px 16px',
            fontSize: '14px',
            color: '#e2e8f0',
            outline: 'none',
            background: 'rgba(0,84,167,0.1)',
            border: '1px solid rgba(0,84,167,0.2)',
            opacity: sending ? 0.4 : 1,
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,84,167,0.3)',
            border: 'none',
            cursor: 'pointer',
            opacity: (!input.trim() || sending) ? 0.3 : 1,
            fontSize: '18px',
            color: 'white',
          }}
        >
          ↑
        </button>
      </div>
    </main>
  )
}
