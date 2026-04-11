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
