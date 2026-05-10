// src/app/chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { sendChatMessage, getChatHistory, type ChatMessage } from '@/app/actions/chat'
import { PERSONA_LABELS, type Persona } from '@/app/lib/personas'
import { ChatBubble } from '@/app/components/ChatBubble'

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'

const PERSONA_COLORS: Record<Persona, { accent: string; bg: string; placeholder: string; greeting: string }> = {
  T:        { accent: '#eb6168', bg: 'rgba(235,97,104,0.1)',  placeholder: 'Tに話しかける…',    greeting: '本音を話せ。\nTが真実を映し出す。' },
  chikirin: { accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  placeholder: 'ちきりんに話しかける…', greeting: 'なぜ、そう思うの？\nその前提、本当に正しい？' },
  maezawa:  { accent: '#a855f7', bg: 'rgba(168,85,247,0.1)',  placeholder: '前澤に話しかける…',  greeting: 'それ、面白い？\nやるかやらないか、それだけ。' },
}

const PERSONAS: Persona[] = ['T', 'chikirin', 'maezawa']

function getSessionKey(persona: Persona) {
  return `alterlog_chat_session_${persona}`
}

export default function ChatPage() {
  const [persona, setPersona] = useState<Persona>('T')

  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return uuidv4()
    const key = getSessionKey('T')
    return sessionStorage.getItem(key) || (() => {
      const id = uuidv4()
      sessionStorage.setItem(key, id)
      return id
    })()
  })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [warningFlash, setWarningFlash] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ペルソナ切り替え時：セッションを切り替え、履歴をリロード
  const switchPersona = (next: Persona) => {
    if (next === persona) return
    setPersona(next)
    setMessages([])
    const key = getSessionKey(next)
    const existing = sessionStorage.getItem(key)
    const id = existing || (() => {
      const newId = uuidv4()
      sessionStorage.setItem(key, newId)
      return newId
    })()
    setSessionId(id)
    getChatHistory(id).then(setMessages)
  }

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
      const reply = await sendChatMessage(sessionId, text, persona)
      setMessages(prev => [...prev, reply])
      // 警告フラッシュ演出
      if (reply.tone === 'warning') {
        setWarningFlash(true)
        setTimeout(() => setWarningFlash(false), 1200)
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

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
      {/* 警告フラッシュオーバーレイ */}
      {warningFlash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(235, 97, 104, 0.18)',
          zIndex: 100,
          pointerEvents: 'none',
          animation: 'none',
          transition: 'opacity 0.3s',
        }} />
      )}
      {/* ペルソナタブバー：画面最上部に固定、白文字で確実に見える */}
      <div style={{
        flexShrink: 0,
        paddingTop: '44px', // iOS safe area / ステータスバー分
        background: '#000d1e',
        borderBottom: `2px solid ${PERSONA_COLORS[persona].accent}`,
      }}>
        <div style={{ display: 'flex' }}>
          {PERSONAS.map(p => {
            const active = persona === p
            return (
              <button
                key={p}
                onClick={() => switchPersona(p)}
                style={{
                  flex: 1,
                  padding: '14px 4px',
                  fontSize: '15px',
                  fontWeight: active ? 700 : 400,
                  border: 'none',
                  background: active ? PERSONA_COLORS[p].bg : 'transparent',
                  color: active ? PERSONA_COLORS[p].accent : '#ffffff',
                  cursor: 'pointer',
                  opacity: active ? 1 : 0.5,
                  letterSpacing: '0.03em',
                }}
              >
                {PERSONA_LABELS[p]}
              </button>
            )
          })}
          <a
            href="/knowledge"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 16px',
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
            {PERSONA_COLORS[persona].greeting.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} tone={msg.tone} />
        ))}
        {sending && (
          <ChatBubble role="assistant" content="…" />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '12px 16px', display: 'flex', gap: '8px', borderTop: '1px solid rgba(0,84,167,0.2)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={PERSONA_COLORS[persona].placeholder}
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
