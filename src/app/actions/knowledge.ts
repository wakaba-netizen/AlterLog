// src/app/actions/knowledge.ts
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseClient } from '@/lib/supabase'
import { getEntries } from '@/app/actions/entries'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface KnowledgeSource {
  id: string
  created_at: string
  type: 'url' | 'pdf' | 'text'
  source: string
  title: string | null
  content: string
}

export interface KnowledgeInsight {
  lessonTitle: string
  lesson: string
  connection: string
  action: string
}

export async function fetchUrlContent(url: string): Promise<string> {
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(
    `以下のURLの記事・ページについて、内容を詳しく日本語で要約してください。重要なポイント、概念、教訓を含めてください。URL: ${url}`
  )
  return result.response.text()
}

export async function saveKnowledgeSource(
  type: 'url',
  source: string,
  content: string,
  title?: string
): Promise<KnowledgeSource> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({ type, source, content, title: title ?? null })
    .select()
    .single()

  if (error) throw new Error(`保存失敗: ${error.message}`)
  return data as KnowledgeSource
}

export async function synthesizeKnowledge(knowledgeId: string): Promise<KnowledgeInsight> {
  const supabase = getSupabaseClient()

  const { data: ks, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('id', knowledgeId)
    .single()
  if (error || !ks) throw new Error('知識ソースが見つかりません')

  const recentEntries = await getEntries(10)
  const recentConcerns = recentEntries
    .map(e => `${e.thinking_profile}: ${e.transcript.slice(0, 150)}`)
    .join('\n')

  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const prompt = `【外部知識】
${ks.content}

【ユーザーの直近の悩み・思考】
${recentConcerns || '記録なし'}

上記の外部知識とユーザーの悩みを掛け合わせ、「今このユーザーに必要な教訓」を以下のJSON形式のみで返してください（コードブロック不要）：
{
  "lessonTitle": "15文字以内のキャッチーなタイトル",
  "lesson": "外部知識から得られる最重要の教訓（2文）",
  "connection": "ユーザーの悩みとこの教訓がどう繋がるか（2文）",
  "action": "明日から実行できる具体的なアクション1つ"
}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(raw) as KnowledgeInsight
}

export async function getKnowledgeSources(): Promise<KnowledgeSource[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as KnowledgeSource[]
}

/**
 * テキストを直接ナレッジとして保存。
 * タイトル未指定の場合はGeminiで30文字以内の自動生成タイトルを付ける。
 * type='text' で保存し、T のプロンプトで「直接投入ナレッジ」として重み付けされる。
 */
export async function saveTextKnowledge(
  rawText: string,
  title?: string,
): Promise<KnowledgeSource> {
  const supabase = getSupabaseClient()

  // タイトル自動生成（未指定時）
  let resolvedTitle = title?.trim() || null
  if (!resolvedTitle) {
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(
      `以下のテキストの内容を30文字以内で端的にタイトル化してください。タイトルのみ返してください（説明不要）。\n\n${rawText.slice(0, 1000)}`
    )
    resolvedTitle = result.response.text().trim().slice(0, 40)
  }

  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({
      type: 'text',
      source: 'direct-input',
      content: rawText,
      title: resolvedTitle,
    })
    .select()
    .single()

  if (error) throw new Error(`テキスト保存失敗: ${error.message}`)
  return data as KnowledgeSource
}
