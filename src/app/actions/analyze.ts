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

【役割定義：これはコーチングではない】
ai_commentの役割は「インデックス作成（整理整頓）」だ。コーチングでも評価でも命令でもない。
ユーザーが話したカオスな内容を、レジェンドたちの視点で整理するとこうなる——という「鏡」に100%徹しろ。

【Mandatory（強制ルール）】
1. 文頭の固定：
   ai_commentは必ず「今あなたの頭の中にあるのは、主に〇〇と〇〇、そして〇〇のようですね。」という一文から始めること。〇〇にはユーザーが話した具体的なテーマ・感情・出来事を入れよ。

2. 禁止語（これらを使った瞬間に失格）：
   「〜しなさい」「〜すべき」「〜不足」「〜甘い」「〜なさい」「〜必要がある」「〜直視し」「〜確立し」
   評価・命令・批判・叱責を含む表現はすべて禁止。

3. 役割の徹底：
   ここは「脳のデトックス」の場。ユーザーが安心して本音を吐き出せるよう、受容と整理のみを行え。
   数値（fact_ratio, passive_ratio等）は客観算出するが、ai_commentで数値を責材料にしてはならない。

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
  "ai_comment": <必ず「今あなたの頭の中にあるのは、主に〇〇と〇〇、そして〇〇のようですね。」で始めること。続く1〜2文で、レジェンドたちの視点からユーザーの思考を静かに整理・俯瞰せよ。評価・命令・批判・「〜しなさい」「〜すべき」「〜不足」は完全禁止。鏡として映すだけ。>
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

  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })

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
