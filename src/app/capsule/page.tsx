'use client'

import { useState, useEffect } from 'react'
import {
  getCapsules, createCapsule, openCapsule,
  type TimeCapsule
} from '@/app/actions/capsule'

const BG = 'linear-gradient(160deg, #0a1628 0%, #1c3450 50%, #0054a7 100%)'

function CapsuleCard({
  capsule,
  onOpen,
}: {
  capsule: TimeCapsule
  onOpen: (c: TimeCapsule) => void
}) {
  const now = new Date()
  const openAt = new Date(capsule.open_at)
  const canOpen = now >= openAt
  const daysLeft = Math.ceil((openAt.getTime() - now.getTime()) / 86400000)

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: canOpen && !capsule.is_opened
          ? 'rgba(0,117,194,0.12)'
          : 'rgba(0,84,167,0.04)',
        border: `1px solid ${canOpen && !capsule.is_opened ? 'rgba(0,117,194,0.5)' : 'rgba(0,84,167,0.1)'}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-purple-300 font-medium text-sm mb-1">{capsule.title}</p>
          <p className="text-xs text-slate-500">
            {openAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} に開封
          </p>
        </div>
        <span className="text-2xl">{capsule.is_opened ? '📬' : canOpen ? '💌' : '🔒'}</span>
      </div>

      {capsule.is_opened && (
        <p className="mt-3 text-slate-300 text-sm leading-relaxed border-t border-white/10 pt-3">
          {capsule.content}
        </p>
      )}

      {!capsule.is_opened && canOpen && (
        <button
          onClick={() => onOpen(capsule)}
          className="mt-3 w-full py-2 rounded-xl text-sm transition-all"
          style={{ background: 'rgba(0,117,194,0.2)', color: '#0075c2' }}
        >
          開封する
        </button>
      )}

      {!capsule.is_opened && !canOpen && (
        <p className="mt-2 text-xs text-slate-500">あと {daysLeft} 日</p>
      )}
    </div>
  )
}

export default function CapsulePage() {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [openAt, setOpenAt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCapsules().then(setCapsules)
  }, [])

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !openAt) return
    setSaving(true)
    try {
      const newCapsule = await createCapsule(title, content, new Date(openAt).toISOString())
      setCapsules(prev => [...prev, newCapsule].sort((a, b) => a.open_at.localeCompare(b.open_at)))
      setTitle('')
      setContent('')
      setOpenAt('')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleOpen = async (capsule: TimeCapsule) => {
    const updated = await openCapsule(capsule.id)
    setCapsules(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  // デフォルト開封日：6ヶ月後
  const defaultOpenAt = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  })()

  return (
    <main
      className="min-h-dvh flex flex-col px-4 pt-12 pb-24"
      style={{ background: BG }}
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs tracking-[0.35em] uppercase" style={{ color: '#0075c2' }}>タイムカプセル</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(0,117,194,0.15)', color: '#0075c2' }}
        >
          + 手紙を書く
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-4 mb-6 flex flex-col gap-3"
          style={{ background: 'rgba(0,84,167,0.08)', border: '1px solid rgba(0,84,167,0.2)' }}
        >
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="タイトル（例：半年後の自分へ）"
            className="rounded-xl px-3 py-2 text-sm text-slate-200 outline-none w-full"
            style={{ background: 'rgba(0,84,167,0.1)', border: '1px solid rgba(0,84,167,0.2)' }}
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="未来の自分へのメッセージ…"
            rows={4}
            className="rounded-xl px-3 py-2 text-sm text-slate-200 outline-none w-full resize-none"
            style={{ background: 'rgba(0,84,167,0.1)', border: '1px solid rgba(0,84,167,0.2)' }}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">開封日</label>
            <input
              type="date"
              value={openAt || defaultOpenAt}
              onChange={e => setOpenAt(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="flex-1 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
              style={{ background: 'rgba(0,84,167,0.1)', border: '1px solid rgba(0,84,167,0.2)' }}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim() || !content.trim()}
            className="py-2.5 rounded-xl text-sm text-white disabled:opacity-40 transition-opacity"
            style={{ background: 'rgba(0,84,167,0.4)' }}
          >
            {saving ? '保存中…' : '封印する'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {capsules.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">
            まだタイムカプセルがありません。<br />未来の自分への手紙を書いてみましょう。
          </p>
        ) : (
          capsules.map(c => (
            <CapsuleCard key={c.id} capsule={c} onOpen={handleOpen} />
          ))
        )}
      </div>
    </main>
  )
}
