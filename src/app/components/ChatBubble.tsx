// src/app/components/ChatBubble.tsx
'use client'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  tone?: 'normal' | 'warning'
  personaLabel?: string
  personaAccent?: string
}

export function ChatBubble({ role, content, tone, personaLabel, personaAccent }: ChatBubbleProps) {
  const isUser = role === 'user'
  const label = personaLabel ?? 'T'
  const accent = personaAccent ?? (tone === 'warning' ? '#eb6168' : '#eb6168')

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={
          isUser
            ? {
                maxWidth: '85%',
                borderRadius: '16px',
                padding: '10px 16px',
                fontSize: '14px',
                lineHeight: '1.6',
                background: 'rgba(0,84,167,0.2)',
                border: '1px solid rgba(0,84,167,0.3)',
                color: '#e2e8f0',
              }
            : {
                maxWidth: '85%',
                borderRadius: '16px',
                padding: '10px 16px',
                fontSize: '14px',
                lineHeight: '1.6',
                background: 'rgba(0,84,167,0.07)',
                border: `1px solid ${tone === 'warning' ? 'rgba(235,97,104,0.5)' : 'rgba(0,84,167,0.2)'}`,
                color: '#cbd5e1',
              }
        }
      >
        {!isUser && (
          <p style={{ fontSize: '11px', color: accent, marginBottom: '4px', fontWeight: 'bold', letterSpacing: '0.1em' }}>
            {label}
          </p>
        )}
        {content}
      </div>
    </div>
  )
}
