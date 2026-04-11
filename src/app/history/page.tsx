// src/app/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { getEntries, type EntryRow } from '@/app/actions/entries'
import { EntryCard } from '@/app/components/EntryCard'
import { EntryDetailModal } from '@/app/components/EntryDetailModal'

const BG = 'linear-gradient(160deg, #0a1628 0%, #1c3450 50%, #0054a7 100%)'

export default function HistoryPage() {
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EntryRow | null>(null)

  useEffect(() => {
    getEntries().then(setEntries).finally(() => setLoading(false))
  }, [])

  return (
    <main
      className="min-h-dvh flex flex-col px-4 pt-12 pb-24"
      style={{ background: BG }}
    >
      <h1 className="text-xs tracking-[0.35em] uppercase mb-6" style={{ color: '#0075c2' }}>
        ジャーナル履歴
      </h1>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          読み込み中…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center">
          まだ記録がありません。<br />録音タブから始めましょう。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onClick={setSelected} />
          ))}
        </div>
      )}

      <EntryDetailModal entry={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
