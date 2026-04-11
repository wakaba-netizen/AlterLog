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
  const prompt = `以下は${days}日間のジャーナル記録です。JSON形式で回顧録を生成してください。

${entryText}

以下のJSON形式のみで返してください（コードブロック不要）：
{
  "summary": "この期間の思考・行動パターンを2〜3文で鋭く総括",
  "growthPoints": ["具体的な成長ポイント1", "成長ポイント2", "成長ポイント3"],
  "nextChallenge": "次の${days}日間で取り組むべき具体的な1つの課題"
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
    trend,
    ...parsed,
  }
}
