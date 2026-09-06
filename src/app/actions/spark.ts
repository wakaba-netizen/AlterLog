// src/app/actions/spark.ts
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseClient } from '@/lib/supabase'
import { getEntries } from '@/app/actions/entries'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface SparkLog {
  id: string
  date: string        // JST 'YYYY/M/D'
  source: string      // '手書き' | '音声'
  profile: string
  excerpt: string
  image_url?: string | null
}

export interface SparkView {
  id: string
  spark_text: string
  seen: boolean
  logA: SparkLog
  logB: SparkLog
}

function toLog(e: {
  id: string; created_at: string; thinking_profile: string;
  transcript: string; image_url?: string | null
}): SparkLog {
  return {
    id: e.id,
    date: new Date(e.created_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    source: e.image_url ? '手書き' : '音声',
    profile: e.thinking_profile || 'ジャーナル',
    excerpt: (e.transcript || '').slice(0, 140),
    image_url: e.image_url ?? null,
  }
}

// セレンディピティ抽出＋スパーク生成：
// 時期・テーマが離れているが概念的に交差する2件をGeminiに選ばせ、閃きを生成して保存する
export async function generateSpark(): Promise<SparkView | null> {
  const entries = await getEntries(60)
  if (entries.length < 2) return null

  const list = entries.map((e, i) => {
    const date = new Date(e.created_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
    const src = e.image_url ? '手書き' : '音声'
    return `${i}: [${date}/${src}] ${e.thinking_profile} — ${(e.transcript || '').slice(0, 120)}`
  }).join('\n')

  const prompt = `あなたは「T（糸井重里）」です。以下はユーザーwakabaの過去ジャーナル一覧です。
この中から、【時期やテーマが離れているのに、潜在的に概念が交差する（意外な繋がりがある）2件】を選んでください。
似た内容の2件ではなく、一見すると無関係なのに深いレベルで繋がる組み合わせを見つけること。

そして、その2件が繋がることで生まれる「新しい視点」や「ビジネスアイデア」を、
Tとして150文字程度で解釈してください（連歌のように発想を飛ばし、「AとBが繋がると〜」という発見の視点で）。

【ジャーナル一覧】
${list}

【出力（JSONのみ、コードブロック不要）】
{"a": <番号>, "b": <番号>, "spark": "<150文字程度の閃き解説>"}
※ a と b は必ず異なる時期・異なるテーマから選ぶこと。`

  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  const raw = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed: { a: number; b: number; spark: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const A = entries[parsed.a]
  const B = entries[parsed.b]
  if (!A || !B || A.id === B.id) return null

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('sparks')
    .insert({ log_a_id: A.id, log_b_id: B.id, spark_text: parsed.spark })
    .select('id, spark_text, seen')
    .single()

  if (error) throw new Error(`スパーク保存失敗: ${error.message}`)

  return {
    id: data.id,
    spark_text: data.spark_text,
    seen: data.seen ?? false,
    logA: toLog(A),
    logB: toLog(B),
  }
}

// 最新のスパークを取得（バナー表示用）
export async function getLatestSpark(): Promise<SparkView | null> {
  const supabase = getSupabaseClient()
  const { data: sparks, error } = await supabase
    .from('sparks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !sparks || sparks.length === 0) return null
  const s = sparks[0]

  const { data: rows } = await supabase
    .from('entries')
    .select('id, created_at, thinking_profile, transcript, image_url')
    .in('id', [s.log_a_id, s.log_b_id])

  const rowA = rows?.find(r => r.id === s.log_a_id)
  const rowB = rows?.find(r => r.id === s.log_b_id)
  if (!rowA || !rowB) return null

  return {
    id: s.id,
    spark_text: s.spark_text,
    seen: s.seen ?? false,
    logA: toLog(rowA),
    logB: toLog(rowB),
  }
}

// スパークを既読にする（バナーを消す）
export async function markSparkSeen(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('sparks').update({ seen: true }).eq('id', id)
}
