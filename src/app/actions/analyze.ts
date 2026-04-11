'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSupabaseClient } from '@/lib/supabase'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export interface AnalysisResult {
  id: string
  transcript: string
  fact_ratio: number
  emotion_ratio: number
  passive_ratio: number
  thinking_profile: string
  ai_comment: string
}

// Gemini は音声を直接受け取り、書き起こし＋分析を1回で返す
const PROMPT = `あなたは「AlterLog」というアプリの分析AIです。
この音声を日本語で書き起こし、徹底的に客観分析してください。

【絶対ルール】
- ユーザーを褒めない。慰めない。共感の演技をしない。
- 鋭いビジネス参謀として、核心だけを突く。
- ユーザーの可能性を信じるからこその、愛ある冷徹な分析をせよ。
- ZOZOTOWNを創業した起業家に語りかけるレベルの熱量と厳しさで。

【passive_ratioの定義】
文法的な受動態ではなく「被害者モード」の度合い。
他責・言い訳・「〜されてしまった」「〜のせいで」「仕方なかった」などを厳しく検出せよ。

【出力フォーマット（JSONのみ、コードブロック不要、他のテキスト禁止）】
{
  "transcript": <音声の書き起こしテキスト>,
  "fact_ratio": <0-100の整数。客観的事実の割合>,
  "emotion_ratio": <0-100の整数。100 - fact_ratioと一致させること>,
  "passive_ratio": <0-100の整数。被害者モード・他責表現の割合>,
  "thinking_profile": <20文字以内の思考タイプラベル>,
  "ai_comment": <1〜3文。短く鋭く。主語は「あなた」。褒め禁止。愛ある冷徹さで。>
}`

export async function transcribeAndAnalyze(formData: FormData): Promise<AnalysisResult> {
  const audioFile = formData.get('audio') as File | null
  if (!audioFile) throw new Error('音声データがありません')

  // 音声をBase64に変換してGeminiに渡す
  const arrayBuffer = await audioFile.arrayBuffer()
  const base64Audio = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = (audioFile.type || 'audio/webm') as
    | 'audio/webm'
    | 'audio/mp4'
    | 'audio/mpeg'
    | 'audio/wav'
    | 'audio/ogg'

  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Audio } },
    PROMPT,
  ])

  // Geminiがコードブロックで返してきた場合にも対応
  const raw = result.response.text()
  const jsonText = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const parsed = JSON.parse(jsonText) as {
    transcript: string
    fact_ratio: number
    emotion_ratio: number
    passive_ratio: number
    thinking_profile: string
    ai_comment: string
  }

  const { transcript, ...analysis } = parsed

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('entries')
    .insert({ transcript, ...analysis })
    .select('id')
    .single()

  if (error) throw new Error(`保存に失敗しました: ${error.message}`)

  return { id: data.id, transcript, ...analysis }
}
