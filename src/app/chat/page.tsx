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
