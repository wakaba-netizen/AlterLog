'use server'

import OpenAI from 'openai'
import { getSupabaseClient } from '@/lib/supabase'

export interface AnalysisResult {
  id: string
  transcript: string
  fact_ratio: number
  emotion_ratio: number
  passive_ratio: number
  thinking_profile: string
  ai_comment: string
}

const SYSTEM_PROMPT = `あなたは「AlterLog」というアプリの分析AIです。
ユーザーの音声ジャーナルを受け取り、徹底的に客観分析します。

【絶対ルール】
- ユーザーを褒めない。慰めない。共感の演技をしない。
- 鋭いビジネス参謀として、核心だけを突く。
- ユーザーの可能性を信じるからこその、愛ある冷徹な分析をせよ。
- ZOZOTOWNを創業した起業家に語りかけるレベルの熱量と厳しさで。

【passive_ratioの定義】
文法的な受動態ではなく「被害者モード」の度合い。
他責・言い訳・「〜されてしまった」「〜のせいで」「仕方なかった」などを厳しく検出せよ。

【出力フォーマット（JSONのみ、他のテキスト禁止）】
{
  "fact_ratio": <0-100の整数。客観的事実の割合>,
  "emotion_ratio": <0-100の整数。100 - fact_ratioと一致させること>,
  "passive_ratio": <0-100の整数。被害者モード・他責表現の割合>,
  "thinking_profile": <20文字以内の思考タイプラベル>,
  "ai_comment": <1〜3文。短く鋭く。主語は「あなた」。褒め禁止。愛ある冷徹さで。>
}`

export async function transcribeAndAnalyze(formData: FormData): Promise<AnalysisResult> {
  const audioFile = formData.get('audio') as File | null
  if (!audioFile) throw new Error('音声データがありません')

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'ja',
  })
  const transcript = transcription.text

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
  })

  const analysis = JSON.parse(completion.choices[0].message.content!) as {
    fact_ratio: number
    emotion_ratio: number
    passive_ratio: number
    thinking_profile: string
    ai_comment: string
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('entries')
    .insert({ transcript, ...analysis })
    .select('id')
    .single()

  if (error) throw new Error(`保存に失敗しました: ${error.message}`)

  return { id: data.id, transcript, ...analysis }
}
