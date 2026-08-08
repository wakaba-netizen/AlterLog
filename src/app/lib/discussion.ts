// src/app/lib/discussion.ts
// 3人討議のパース・表示設定（'use server'ファイル外に切り出し）

export interface DiscussionTurn {
  persona: string  // '糸井重里' | 'ちきりん' | '前澤' | '最終提案'
  content: string
}

// 討議の生テキストを [マーカー] で分割してターン配列に変換
export function parseDiscussion(text: string): DiscussionTurn[] {
  const turns: DiscussionTurn[] = []
  const parts = text.split(/(\[(?:糸井重里|ちきりん|前澤|最終提案)\])/)
  for (let i = 1; i < parts.length; i += 2) {
    const marker = parts[i]
    const content = parts[i + 1]?.trim()
    const persona = marker.slice(1, -1)
    if (content) turns.push({ persona, content })
  }
  return turns.length > 0 ? turns : [{ persona: '最終提案', content: text.trim() }]
}

// 各ターンの表示ラベルとアクセントカラー
export const DISCUSSION_PERSONA_CONFIG: Record<string, { label: string; accent: string }> = {
  '糸井重里': { label: '糸井重里', accent: '#eb6168' },
  'ちきりん': { label: 'ちきりん', accent: '#f59e0b' },
  '前澤':     { label: '前澤友作', accent: '#a855f7' },
  '最終提案': { label: '💡 最終提案', accent: '#22d3ee' },
}
