// scripts/sync-obsidian.mjs
// AlterLog（Supabase）のジャーナルを Obsidian の保管庫へ Markdown として書き出す。
// 使い方: node scripts/sync-obsidian.mjs
//
// 書き出し先は下記 VAULT_DIR。1エントリ=1ファイル。再実行すると最新内容で上書き（安全）。

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── 設定 ─────────────────────────────────────────
const VAULT_DIR = '/Users/wakabayashiyuki/Documents/Obsidian Vault/AlterLog'
const ATTACH_DIR = join(VAULT_DIR, 'attachments')
// ────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env.local から Supabase 接続情報を読む
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local')
  const text = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

// JST日付フォーマット
function jstParts(iso) {
  const d = new Date(iso)
  const fmt = (opts) => d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', ...opts })
  const ymd = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' }) // YYYY-MM-DD
  const hm = fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '')
  return { ymd, hm, dateTime: `${ymd} ${fmt({ hour: '2-digit', minute: '2-digit', hour12: false })}` }
}

function sanitize(s) {
  return (s || '').replace(/[\\/:*?"<>|#^[\]]/g, '').trim().slice(0, 40)
}

async function main() {
  const env = loadEnv()
  const url = env.SUPABASE_URL
  const key = env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('.env.local に Supabase の URL / KEY が見つかりません')

  // 全エントリ取得
  const res = await fetch(`${url}/rest/v1/entries?select=*&order=created_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`Supabase取得失敗: ${res.status} ${await res.text()}`)
  const entries = await res.json()

  mkdirSync(VAULT_DIR, { recursive: true })
  mkdirSync(ATTACH_DIR, { recursive: true })

  let written = 0
  let images = 0

  for (const e of entries) {
    const { ymd, hm, dateTime } = jstParts(e.created_at)
    const idShort = String(e.id).slice(0, 8)
    const source = e.image_url ? '手書き' : '音声'
    const profile = sanitize(e.thinking_profile) || 'ジャーナル'
    const baseName = `${ymd}_${hm}_${idShort}`

    // 画像（data URL）があれば添付フォルダに書き出す
    let imageEmbed = ''
    if (e.image_url && e.image_url.startsWith('data:')) {
      const m = e.image_url.match(/^data:(.+?);base64,(.*)$/)
      if (m) {
        const ext = m[1].includes('png') ? 'png' : 'jpg'
        const imgName = `${baseName}.${ext}`
        writeFileSync(join(ATTACH_DIR, imgName), Buffer.from(m[2], 'base64'))
        imageEmbed = `\n## 手書き原本\n![[attachments/${imgName}]]\n`
        images++
      }
    }

    // Markdown 本文（YAMLフロントマター付き）
    const md = `---
date: ${dateTime}
source: ${source}
thinking_profile: "${(e.thinking_profile || '').replace(/"/g, "'")}"
emotion_ratio: ${e.emotion_ratio ?? ''}
fact_ratio: ${e.fact_ratio ?? ''}
passive_ratio: ${e.passive_ratio ?? ''}
tags: [alterlog, journaling]
---

# ${e.thinking_profile || 'ジャーナル'}

> [!note] ALTERLOGの診断
> ${(e.ai_comment || '').replace(/\n/g, '\n> ')}

## 記録（${source}）
${e.transcript || ''}
${imageEmbed}`

    writeFileSync(join(VAULT_DIR, `${baseName} ${profile}.md`), md)
    written++
  }

  console.log(`✅ 同期完了: ${written}件のジャーナルを書き出しました（画像 ${images}件）`)
  console.log(`📁 保存先: ${VAULT_DIR}`)
}

main().catch(err => {
  console.error('❌ エラー:', err.message)
  process.exit(1)
})
