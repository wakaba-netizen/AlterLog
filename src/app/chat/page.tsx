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
    <main style={{
      position: 'fixed',
      inset: 0,
      bottom: '60px',
      display: 'flex',
      flexDirection: 'column',
      background: BG,
    }}>
      {/* Header */}
      <div style={{ padding: '48px 24px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '18px', color: '#a78bfa', fontWeight: 'bold', letterSpacing: '0.15em', margin: 0 }}>T</p>
        <a
          href="/knowledge"
          style={{ fontSize: '12px', color: '#67e8f9', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(103,232,249,0.1)', textDecoration: 'none' }}
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
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {sending && (
          <ChatBubble role="assistant" content="…" />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: '12px 16px', display: 'flex', gap: '8px', borderTop: '1px solid rgba(167,139,250,0.1)' }}>
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
            background: 'rgba(167,139,250,0.1)',
            border: '1px solid rgba(167,139,250,0.2)',
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
            background: 'rgba(167,139,250,0.3)',
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
