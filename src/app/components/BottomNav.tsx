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
        background: '#0d1225',
        borderTop: '1px solid rgba(167,139,250,0.4)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: '60px',
      }}
    >
      {TABS.map(({ href, icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-all"
            style={{ color: active ? '#a78bfa' : '#94a3b8' }}
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[10px] tracking-wide">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
