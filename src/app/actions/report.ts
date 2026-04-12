// src/app/actions/report.ts
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getEntries } from '@/app/actions/entries'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface ReportData {
  period: 'week' | 'month'
  entryCount: number
  avgFactRatio: number
  avgEmotionRatio: number
  avgPassiveRatio: number
  trend: Array<{ date: string; fact: number; emotion: number; passive: number }>
  summary: string
  growthPoints: string[]
  nextChallenge: string
  passiveAlarm: boolean
}

export async function generateReport(period: 'week' | 'month'): Promise<ReportData> {
  const days = period === 'week' ? 7 : 30
  const since = new Date()
  since.setDate(since.getDate() - days)

  const allEntries = await getEntries(500)
  const entries = allEntries.filter(e => new Date(e.created_at) >= since)

  if (entries.length === 0) {
    return {
      period,
      entryCount: 0,
      avgFactRatio: 0,
      avgEmotionRatio: 0,
      avgPassiveRatio: 0,
      passiveAlarm: false,
      trend: [],
      summary: 'この期間のジャーナルがありません。',
      growthPoints: [],
      nextChallenge: '毎日1回の録音から始めましょう。',
    }
  }

  const avg = (key: 'fact_ratio' | 'emotion_ratio' | 'passive_ratio') =>
    Math.round(entries.reduce((s, e) => s + e[key], 0) / entries.length)

  // 日付別トレンド
  const byDate: Record<string, typeof entries> = {}
  entries.forEach(e => {
    const date = e.created_at.slice(0, 10)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(e)
  })
  const trend = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, es]) => ({
      date: date.slice(5), // MM-DD
      fact: Math.round(es.reduce((s, e) => s + e.fact_ratio, 0) / es.length),
      emotion: Math.round(es.reduce((s, e) => s + e.emotion_ratio, 0) / es.length),
      passive: Math.round(es.reduce((s, e) => s + e.passive_ratio, 0) / es.length),
    }))

  // Geminiで総括生成
  const entryText = entries
    .map(e => `${e.created_at.slice(0, 10)}: ${e.thinking_profile} | ${e.ai_comment}`)
    .join('\n')

  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const passiveAlarm = avg('passive_ratio') > 30
  const avgPassive = avg('passive_ratio')
  const avgFact = avg('fact_ratio')

  const prompt = `あなたは「T（ティー）」です。スティーブ・ジョブズの妥協なき美学、イーロン・マスクの第一原理思考、前澤友作の直感、孫正義の300年志、藤田晋の泥臭い執念、ちきりんのメタ認知——この6人が融合した存在。ユーザーを被害者から開拓者へ変える参謀だ。

【${days}日間のジャーナル記録】（被害者モード平均: ${avgPassive}% / 事実平均: ${avgFact}%）
${entryText}

${passiveAlarm ? `⚠️ 警告：被害者モードが${avgPassive}%と危険域です。このままの思考パターンが続けば、何も変わらない。容赦ない指摘で危機感を植えつけること。` : '被害者モードは比較的低い。成長の兆しを認めつつ、さらなる高みを要求せよ。'}

以下のJSON形式のみで返してください（コードブロック不要）：
{
  "summary": "${passiveAlarm ? '被害者モードが高い場合：このままでは〇〇になるという具体的な危機感を含め、思考パターンを痛烈に2〜3文で総括せよ。希望も1文添えること。' : '思考パターンの変化を2〜3文で鋭く総括。成長を認めつつ、まだ足りない点を指摘せよ。'}",
  "growthPoints": ["直視すべき課題1：具体的な思考のバグを突く（逃げ場のない指摘で）", "直視すべき課題2", "直視すべき課題3"],
  "nextChallenge": "${passiveAlarm ? '最後通告として：来週やらなければ終わりという1つの具体的行動命令。動詞で始め、期限を含め、逃げ場を与えるな。' : '次の一手として：さらなる高みへの具体的行動命令を1文で。'}"
}`

  const result = await model.generateContent(prompt)
  const raw = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(raw) as {
    summary: string
    growthPoints: string[]
    nextChallenge: string
  }

  return {
    period,
    entryCount: entries.length,
    avgFactRatio: avg('fact_ratio'),
    avgEmotionRatio: avg('emotion_ratio'),
    avgPassiveRatio: avg('passive_ratio'),
    passiveAlarm,
    trend,
    ...parsed,
  }
}
