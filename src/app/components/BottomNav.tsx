// src/app/components/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/',        icon: '🎙️', label: '録音' },
  { href: '/history', icon: '📋', label: '履歴' },
  { href: '/chat',    icon: '🔮', label: 'T' },
  { href: '/report',  icon: '📊', label: 'レポート' },
  { href: '/capsule', icon: '💌', label: '手紙' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        height: '60px',
        background: '#0d1225',
        borderTop: '2px solid #a78bfa',
      }}
    >
      {TABS.map(({ href, icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              textDecoration: 'none',
              color: active ? '#a78bfa' : '#94a3b8',
            }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: '10px', letterSpacing: '0.05em' }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
