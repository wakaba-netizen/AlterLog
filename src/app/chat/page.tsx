// src/app/chat/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { sendChatMessage, getChatHistory, type ChatMessage } from '@/app/actions/chat'
import { ChatBubble } from '@/app/components/ChatBubble'

const BG = 'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)'
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
  const [warningFlash, setWarningFlash] = useState(false)
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
      {/* Header */}
      <div style={{ padding: '48px 24px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '18px', color: '#d6003A', fontWeight: 'bold', letterSpacing: '0.15em', margin: 0 }}>T</p>
        <a
          href="/knowledge"
          style={{ fontSize: '12px', color: '#0075c2', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(0,117,194,0.1)', textDecoration: 'none' }}
        >
          📚 学習フィルター
        </a>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && !sending && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#64748b', fontSize: '14px', padding: '64px 32px' }}>
            本音を話せ。<br />Tが真実を映し出す。
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
          placeholder="Tに話しかける…"
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
