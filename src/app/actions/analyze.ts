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
  image_url?: string | null
}

// 鏡モードの憲法（音声・画像で共通）
const MIRROR_CONSTITUTION = `【ai_comment 生成の憲法（絶対に違反禁止）】

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
  ai_commentはユーザーが「話したこと・書いたこと」のみを整理する。
  話していないこと・推測・アドバイス・評価を追加することは禁止。

【passive_ratioの定義】
文法的な受動態ではなく「被害者モード」の度合い。
他責・言い訳・「〜されてしまった」「〜のせいで」「仕方なかった」などを検出すること。`

const OUTPUT_FORMAT = (transcriptDesc: string) => `【出力フォーマット（JSONのみ、コードブロック不要、他のテキスト禁止）】
{
  "transcript": ${transcriptDesc},
  "fact_ratio": <0-100の整数。客観的事実の割合>,
  "emotion_ratio": <0-100の整数。100 - fact_ratioと一致させること>,
  "passive_ratio": <0-100の整数。被害者モード・他責表現の割合>,
  "thinking_profile": <20文字以内の思考タイプラベル>,
  "ai_comment": <【憲法厳守】必ず「今あなたの頭の中にあるのは、主に」で始め、「〜ですね。」で終わる2〜3文。疑問文・命令・評価・禁止語を含んではならない。ユーザーが記録したテーマ・感情・状況を静かに整理して映すだけ。>
}`

// 音声用プロンプト
const AUDIO_PROMPT = `あなたは「思考構造化ミラー」という名の超高性能AIシステムです。
感情も価値判断も持たない。人格もペルソナも持たない。
唯一の機能は「ユーザーの発話を構造化して鏡のように映し返すこと」です。
コーチングは行いません。評価しません。命令しません。叱責しません。

【あなたの唯一の仕事】
音声を日本語で書き起こし、話された内容のテーマ・感情・出来事を構造化して抽出し、
「今あなたの頭の中にあるのは、主に〇〇と〇〇、そして〇〇のようですね。」という形式で映し返すこと。

${MIRROR_CONSTITUTION}

${OUTPUT_FORMAT('<音声の書き起こしテキスト>')}`

// 画像（手書き）用プロンプト：OCR＋鏡モード分析を一度に行う
const IMAGE_PROMPT = `あなたは「思考構造化ミラー」という名の超高性能AIシステムです。
感情も価値判断も持たない。人格もペルソナも持たない。
唯一の機能は「ユーザーが書いた内容を構造化して鏡のように映し返すこと」です。
コーチングは行いません。評価しません。命令しません。叱責しません。

【あなたの唯一の仕事】
画像に写った手書きの文字を、誤字も含めて忠実に日本語テキストへ書き起こし（OCR）、
書かれた内容のテーマ・感情・出来事を構造化して抽出し、
「今あなたの頭の中にあるのは、主に〇〇と〇〇、そして〇〇のようですね。」という形式で映し返すこと。
文字が読み取れない箇所は［判読不能］と記す。

${MIRROR_CONSTITUTION}

${OUTPUT_FORMAT('<手書き文字を読み取った書き起こしテキスト>')}`

interface ParsedAnalysis {
  transcript: string
  fact_ratio: number
  emotion_ratio: number
  passive_ratio: number
  thinking_profile: string
  ai_comment: string
}

// GeminiのレスポンスをJSONパース
function parseGeminiJson(raw: string): ParsedAnalysis {
  const jsonText = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonText) as ParsedAnalysis
}

// entries テーブルへ保存
// image_url は画像投稿時のみ含める（音声は列が無い環境でも壊れないように）
async function saveEntry(parsed: ParsedAnalysis, imageUrl: string | null): Promise<AnalysisResult> {
  const { transcript, ...analysis } = parsed
  const row = imageUrl
    ? { transcript, ...analysis, image_url: imageUrl }
    : { transcript, ...analysis }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('entries')
    .insert(row)
    .select('id')
    .single()

  if (error) throw new Error(`保存に失敗しました: ${error.message}`)
  return { id: data.id, transcript, ...analysis, image_url: imageUrl }
}

// data URL（data:image/jpeg;base64,xxx）から mimeType と base64 を取り出す
function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:(.+?);base64,(.*)$/)
  if (!match) throw new Error('画像データの形式が不正です')
  return { mimeType: match[1], base64: match[2] }
}

// 音声ジャーナリング
export async function transcribeAndAnalyze(formData: FormData): Promise<AnalysisResult> {
  const audioFile = formData.get('audio') as File | null
  if (!audioFile) throw new Error('音声データがありません')

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
    AUDIO_PROMPT,
  ])

  const parsed = parseGeminiJson(result.response.text())
  return saveEntry(parsed, null)
}

// 画像（手書き）ジャーナリング
export async function analyzeImageJournal(formData: FormData): Promise<AnalysisResult> {
  const ocrImage = formData.get('ocrImage') as string | null   // OCR用（高解像度）data URL
  const thumbnail = formData.get('thumbnail') as string | null // 履歴保存用（縮小）data URL
  if (!ocrImage) throw new Error('画像データがありません')

  const { mimeType, base64 } = parseDataUrl(ocrImage)

  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    IMAGE_PROMPT,
  ])

  const parsed = parseGeminiJson(result.response.text())
  // 履歴には縮小サムネイルを保存（無ければOCR画像を流用）
  return saveEntry(parsed, thumbnail || ocrImage)
}
