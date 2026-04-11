// src/app/components/ChatBubble.tsx
'use client'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  tone?: 'normal' | 'warning'
}

export function ChatBubble({ role, content, tone }: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background: 'rgba(0,84,167,0.2)',
                border: '1px solid rgba(0,84,167,0.3)',
                color: '#e2e8f0',
              }
            : {
                background: 'rgba(0,84,167,0.07)',
                border: `1px solid ${tone === 'warning' ? 'rgba(235,97,104,0.5)' : 'rgba(0,84,167,0.2)'}`,
                color: '#cbd5e1',
              }
        }
      >
        {!isUser && (
          <p style={{ fontSize: '11px', color: tone === 'warning' ? '#eb6168' : '#d6003A', marginBottom: '4px', fontWeight: 'bold', letterSpacing: '0.1em' }}>T</p>
        )}
        {content}
      </div>
    </div>
  )
}
