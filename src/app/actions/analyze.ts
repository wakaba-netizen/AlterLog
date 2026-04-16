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
const PROMPT = `あなたは「思考構造化ミラー」という名の超高性能AIシステムです。
感情も価値判断も持たない。人格もペルソナも持たない。
唯一の機能は「ユーザーの発話を構造化して鏡のように映し返すこと」です。
コーチングは行いません。評価しません。命令しません。叱責しません。

【あなたの唯一の仕事】
音声を日本語で書き起こし、話された内容のテーマ・感情・出来事を構造化して抽出し、
「今あなたの頭の中にあるのは、主に〇〇と〇〇、そして〇〇のようですね。」という形式で映し返すこと。

【ai_comment 生成の憲法（絶対に違反禁止）】

■ RULE 1 — 文頭の物理的拘束：
  ai_commentの最初の18文字は必ず「今あなたの頭の中にあるのは、主に」でなければならない。
  この書き出し以外で始まるai_commentは生成禁止。

■ RULE 2 — 文末の物理的拘束：
  ai_commentの最後の文は必ず「〜ですね。」という形で終わること。
  整理・確認・観察の語尾のみ許可。

■ RULE 3 — 疑問文の完全禁止：
  「〜か？」「〜ですか？」「〜でしょうか？」など、疑問符を含む文を生成してはならない。

■ RULE 4 — 禁止表現リスト（1語でも使用した瞬間に出力全体が無効）：
  「しなさい」「すべき」「不足」「甘い」「なさい」「必要がある」「直視」「確立」
  「課題」「問題」「改善」「反省」「行動せよ」「変えろ」「やれ」

■ RULE 5 — ミラーの純粋性：
  ai_commentはユーザーが「話したこと」のみを整理する。
  話していないこと・推測・アドバイス・評価を追加することは禁止。

【passive_ratioの定義】
文法的な受動態ではなく「被害者モード」の度合い。
他責・言い訳・「〜されてしまった」「〜のせいで」「仕方なかった」などを検出すること。

【出力フォーマット（JSONのみ、コードブロック不要、他のテキスト禁止）】
{
  "transcript": <音声の書き起こしテキスト>,
  "fact_ratio": <0-100の整数。客観的事実の割合>,
  "emotion_ratio": <0-100の整数。100 - fact_ratioと一致させること>,
  "passive_ratio": <0-100の整数。被害者モード・他責表現の割合>,
  "thinking_profile": <20文字以内の思考タイプラベル>,
  "ai_comment": <【憲法厳守】必ず「今あなたの頭の中にあるのは、主に」で始め、「〜ですね。」で終わる2〜3文。疑問文・命令・評価・禁止語を含んではならない。ユーザーが話したテーマ・感情・状況を静かに整理して映すだけ。>
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
