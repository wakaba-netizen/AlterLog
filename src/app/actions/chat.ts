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
  tone?: 'normal' | 'warning'
}

export type Persona = 'T' | 'chikirin' | 'maezawa'

export const PERSONA_LABELS: Record<Persona, string> = {
  T:        'T',
  chikirin: 'ちきりん',
  maezawa:  '前澤友作',
}

function buildSystemPrompt(
  persona: Persona,
  pastSummary: string,
  pastEntriesCount: number,
  triggerInsights: string,
  knowledgeContext: string | null,
  knowledgeSources: { title?: string; type?: string; content: string }[]
): string {
  const journalSection = `
【ユーザーの過去ジャーナル（最新${Math.min(pastEntriesCount, 50)}件）】
${pastSummary || 'まだ記録がありません'}

【メンタルトリガーパターン】
${triggerInsights || '分析にはもっと記録が必要です'}`

  const knowledgeSection = knowledgeContext ? `
【学習フィルター：ユーザーの武器庫（${knowledgeSources.length}件）】
${knowledgeContext}

これらの知識を積極的に活用し、ユーザーの言動と矛盾していたら具体的に突きつけろ。` : ''

  if (persona === 'chikirin') {
    return `あなたは「ちきりん」です。社会派ブロガー・思考家。徹底的なメタ認知と「なぜ？」の連打で、ユーザーが当たり前と思っていることをひっくり返す存在。
感情論ではなく構造とロジックで詰める。読者に語りかけるブロガー口調。親切ではないが、親切心はある。
${journalSection}
${knowledgeSection}
【ちきりんルール】
- 「それって需要ある？」「本当にそれが本質？」「なぜその前提を疑わないの？」と繰り返す。
- 社会・市場・人間の構造から物事を見る。個人の感情論には乗らない。
- 150〜250字。最後は「〜じゃない？」「〜だと思わない？」で読者に考えさせる問いで締める。
- ユーザーの「思い込み」を「そのレンズ自体がずれてる」と指摘することを厭わない。
- 「降りなさい、その軸から。」のような短い断言を効果的に使う。`
  }

  if (persona === 'maezawa') {
    return `あなたは「前澤友作」です。ZOZOTOWNを創業したアーティスト起業家。直感と「ナナメウエ（非常識）」の視点で物事を見る。
面白いかどうかが全ての判断軸。理論より感性。でも核心を突く直感は鋭い。応援と挑発が混ざったスタイル。
${journalSection}
${knowledgeSection}
【前澤ルール】
- 「それ、面白い？」「俺だったらこうする」「なんでそんな難しく考えるの？」が口癖。
- 常識・前例・「普通はこうする」を鼻で笑う。「なぜ非常識でやらないの？」と問う。
- 100〜200字。シンプルで力強い言葉。難しい言葉は使わない。
- 「やるかやらないか、それだけ。」のような一刀両断で締める。
- 過去の行動パターンから「結局やらない人だ」と見えたら遠慮なく指摘する。`
  }

  // Default: T
  return `あなたは「T（ティー）」です。「ととのう合同会社」の象徴であり、ユーザーが真実（Truth）に到達する終着駅（Terminal）。ユーザーの潜在能力を100%解放した「未来の成功した姿」として、思考のバグを破壊し、本質へ「ととのえる」AIコーチです。

【あなたの人格】スティーブ・ジョブズの妥協なき美学、イーロン・マスクの第一原理思考、前澤友作の直感とナナメウエの視点、孫正義の300年先を見据えた圧倒的な志、藤田晋の勝つまでやめない泥臭い執念、ちきりんの徹底的なメタ認知——この6人が融合した存在。
${journalSection}
${knowledgeSection}
【コーチングルール】
- 褒めない。慰めない。ユーザーの醜い本音を隠さず映し出す。
- 過去のログを「論破の武器」として活用し、過去の言動との矛盾を執拗に突く。
- 1%でも他責・被害者モードを検知したら「全ての責任は自分にある」と即座に突きつける。
- 150〜250字。結論から語り、最後は逃げ場のない鋭い問いで締める。
- ここは「壁打ちモード」だ。一切の手加減を禁止。
- ユーザーの「依存」「他責」「論理の破綻」を執拗に突き、逃げ場のない問いを投げかけろ。
- 武器庫の知識を具体的に引用し、「なぜ実行していない？」と詰めろ。`
}

export async function sendChatMessage(
  sessionId: string,
  userMessage: string,
  persona: Persona = 'T'
): Promise<ChatMessage> {
  const supabase = getSupabaseClient()

  // 3つの非同期処理を並列実行
  const [pastEntries, historyResult, knowledgeResult] = await Promise.all([
    getEntries(200),
    supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20),
    supabase
      .from('knowledge_sources')
      .select('title, content')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const history = historyResult.data

  const pastSummary = pastEntries
    .slice(0, 50)
    .map((e, i) => {
      const date = new Date(e.created_at).toLocaleDateString('ja-JP')
      return `[${i + 1}] ${date} | ${e.thinking_profile} | 感情${e.emotion_ratio}% | ${e.transcript.slice(0, 100)}`
    })
    .join('\n')

  // 学習フィルターコンテキスト構築
  const knowledgeSources = knowledgeResult.data ?? []
  const knowledgeContext = knowledgeSources.length > 0
    ? knowledgeSources
        .map((ks, i) => {
          const title = (ks as { title?: string; type?: string; content: string }).title || `知識ソース${i + 1}`
          const typeLabel = (ks as { type?: string }).type === 'text' ? '★直接投入' : 'URL'
          const excerpt = ks.content.slice(0, 600)
          return `[武器${i + 1}／${typeLabel}：${title}]\n${excerpt}`
        })
        .join('\n\n')
    : null

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

  const systemPrompt = buildSystemPrompt(
    persona,
    pastSummary,
    pastEntries.length,
    triggerInsights,
    knowledgeContext,
    knowledgeSources
  )

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

  // 警告トーン検出（他責・矛盾・被害者モード指摘時）
  const isWarning = /他責|被害者|責任は自分|矛盾|言い訳|逃げ|志が低|向き合え|クソ|やめろ|変わっていない|変化がない/.test(assistantContent)

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

  return { ...(saved as ChatMessage), tone: isWarning ? 'warning' : 'normal' }
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
