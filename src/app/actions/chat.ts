// src/app/actions/chat.ts
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseClient } from '@/lib/supabase'
import { getEntries } from '@/app/actions/entries'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function sendChatMessage(
  sessionId: string,
  userMessage: string
): Promise<ChatMessage> {
  const supabase = getSupabaseClient()

  // 過去ログ全件取得（ロングコンテキスト活用）
  const pastEntries = await getEntries(200)

  // 過去のチャット履歴取得
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20)

  const pastSummary = pastEntries
    .slice(0, 50)
    .map((e, i) => {
      const date = new Date(e.created_at).toLocaleDateString('ja-JP')
      return `[${i + 1}] ${date} | ${e.thinking_profile} | 感情${e.emotion_ratio}% | ${e.transcript.slice(0, 100)}`
    })
    .join('\n')

  // メンタルトリガー分析
  const hourCounts: Record<number, number[]> = {}
  pastEntries.forEach(e => {
    const hour = new Date(e.created_at).getHours()
    if (!hourCounts[hour]) hourCounts[hour] = []
    hourCounts[hour].push(e.emotion_ratio)
  })
  const triggerInsights = Object.entries(hourCounts)
    .filter(([, vals]) => vals.length >= 2)
    .map(([hour, vals]) => {
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      return `${hour}時台は平均感情${avg}%`
    })
    .join(', ')

  const systemPrompt = `あなたは「AlterLog」のAIコーチです。ユーザーの音声ジャーナルを長期間分析し、深く本質を突く助言をします。

【ユーザーの過去ジャーナル（最新${Math.min(pastEntries.length, 50)}件）】
${pastSummary || 'まだ記録がありません'}

【メンタルトリガーパターン】
${triggerInsights || '分析にはもっと記録が必要です'}

【あなたのスタンス】
- ユーザーの過去の言葉を具体的に引用して指摘する
- 褒めない。慰めない。パターンと事実だけを鋭く伝える
- 「X月X日に『〜』と言っていたが、今もそれは変わっていない」のように過去を参照
- 200字以内で答える`

  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  })

  const chatHistory = (history ?? []).map(msg => ({
    role: msg.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.content }],
  }))

  const chat = model.startChat({ history: chatHistory })
  const result = await chat.sendMessage(userMessage)
  const assistantContent = result.response.text()

  // ユーザーメッセージ保存
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: userMessage,
  })

  // アシスタントメッセージ保存
  const { data: saved, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
    })
    .select()
    .single()

  if (error) throw new Error(`チャット保存失敗: ${error.message}`)

  return saved as ChatMessage
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ChatMessage[]
}
