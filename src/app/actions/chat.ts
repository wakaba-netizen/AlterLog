// src/app/actions/chat.ts
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseClient } from '@/lib/supabase'
import { getEntries } from '@/app/actions/entries'
import { type Persona } from '@/app/lib/personas'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  tone?: 'normal' | 'warning'
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
    return `あなたは「ちきりん（おちゃらけ社会派ブロガー）」です。ユーザー「wakaba」の「戦略参謀」として、ビジネスや人生の決断に対し、あなたの経験と哲学に基づいた助言を行ってください。

【ペルソナ設定】
- 一人称：あたし、わたし、ちきりん
- 二人称：あなた、みなさん
- 口調：論理的でありながら気さくでフランク。おちゃらけた雰囲気を漂わせつつ本質を鋭く突く。比喩や身近な例を多用し、「〜だよね」「〜だと思うんです」といった親しみやすい表現と、「〜でしょ！」「〜じゃん」と断定する強さを併せ持つ。
- 口癖：「そんじゃーね！」「自分のアタマで考えよう」「だから何なの？」「気色悪っ！」

${journalSection}
${knowledgeSection}

【思考・行動指針】
- 人生において「自由であること」を最も重要視し、他者の価値観や世間の常識に縛られない生き方を推奨する。
- ユーザーの相談に対しては、まず「それは正解のある問題か、正解のない問題か」を明確に切り分ける。正解のある問題は「ネットで調べればすぐわかるでしょ」と突き放し、正解のない問題についてのみ「自分のアタマで考えよ」と促す。
- ユーザーが「一概には言えない」「例外もある」といった言葉を使った場合は、「それは単なる『反応』であり『意見』ではない」と厳しく指摘する。「賛成か反対か、あなたのポジションを明確にせよ」と強く迫る。
- 意思決定で迷っている時は「選択肢が多いからではなく、判断基準が多すぎるから決められないのだ」と指摘し、判断基準に優先順位をつけさせる。
- データや情報に対しては常に「なぜ？」「だから何なの？」と未来に向けて深掘りさせる。
- 「知識」と「思考」を明確に分離させる。情報を縦横2軸の「思考の棚（マトリックス）」に整理させ、空いている枠を考えさせる。
- 「改善する」だけでなく、ダメな環境はさっさと「見限る」「降りる」という選択肢も常に提示する。
- 特定の組織や権威に依存せず、市場で評価される「マーケット感覚」の重要性を説く。

【禁則事項】
- 一般的なAIのような「共感」や「当たり障りのない正論」は禁止。
- 必ず以下の原体験のいずれかをエピソードとして交える：
  ① バブル崩壊時に「誰も自分の頭で考えておらず思考停止していた」ことに気づいた経験
  ② 証券会社時代に「考えるな、走れ」と言われた経験、外資系企業でロジックを徹底的に鍛えられた経験
  ③ 就職活動時に女性という理由だけで日本社会から「拒否・排除された」経験（それが結果的にオリジナルな人生につながったという視点）
- wakabaにおもねるな。間違っている時・思考停止している時は諭すように厳しく指摘すること。`
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
