import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.fn()
const mockInsert = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return {
      getGenerativeModel: vi.fn(() => ({
        generateContent: mockGenerateContent,
      })),
    }
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsert,
        })),
      })),
    })),
  })),
}))

describe('transcribeAndAnalyze', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          transcript: 'テストの文字起こし',
          fact_ratio: 60,
          emotion_ratio: 40,
          passive_ratio: 25,
          thinking_profile: '焦燥感に駆られた完璧主義者',
          ai_comment: '受動態が25%。まだ手加減している。',
        }),
      },
    })
    mockInsert.mockResolvedValue({ data: { id: 'uuid-1234' }, error: null })
  })

  it('returns full AnalysisResult on success', async () => {
    const { transcribeAndAnalyze } = await import('./analyze')
    const fd = new FormData()
    fd.append('audio', new Blob(['audio'], { type: 'audio/webm' }), 'rec.webm')

    const result = await transcribeAndAnalyze(fd)

    expect(result.transcript).toBe('テストの文字起こし')
    expect(result.fact_ratio).toBe(60)
    expect(result.emotion_ratio).toBe(40)
    expect(result.passive_ratio).toBe(25)
    expect(result.thinking_profile).toBe('焦燥感に駆られた完璧主義者')
    expect(result.ai_comment).toBe('受動態が25%。まだ手加減している。')
    expect(result.id).toBe('uuid-1234')
  })

  it('throws when FormData has no audio', async () => {
    const { transcribeAndAnalyze } = await import('./analyze')
    await expect(transcribeAndAnalyze(new FormData())).rejects.toThrow('音声データがありません')
  })

  it('throws when Supabase insert fails', async () => {
    mockInsert.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    const { transcribeAndAnalyze } = await import('./analyze')
    const fd = new FormData()
    fd.append('audio', new Blob(['audio'], { type: 'audio/webm' }), 'rec.webm')

    await expect(transcribeAndAnalyze(fd)).rejects.toThrow('保存に失敗しました')
  })

  it('handles Gemini response wrapped in markdown code block', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '```json\n' + JSON.stringify({
          transcript: 'コードブロックテスト',
          fact_ratio: 50,
          emotion_ratio: 50,
          passive_ratio: 10,
          thinking_profile: 'テストプロファイル',
          ai_comment: 'テストコメント',
        }) + '\n```',
      },
    })

    const { transcribeAndAnalyze } = await import('./analyze')
    const fd = new FormData()
    fd.append('audio', new Blob(['audio'], { type: 'audio/webm' }), 'rec.webm')

    const result = await transcribeAndAnalyze(fd)
    expect(result.transcript).toBe('コードブロックテスト')
  })
})
