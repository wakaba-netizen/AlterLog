// src/app/components/ThemeEngine.ts

export type Theme = 'normal' | 'warning' | 'totonoi'

export interface ThemeConfig {
  theme: Theme
  /** warning → totonoi 遷移時のみ true */
  requiresVoidTransition: boolean
}

/**
 * passive_ratio と fact_ratio からテーマを判定する純関数。
 * コンポーネントの外に置くことでテスト可能・再利用可能にする。
 */
export function detectTheme(
  passiveRatio: number,
  factRatio: number,
): Theme {
  if (passiveRatio > 40) return 'warning'
  if (passiveRatio < 15 && factRatio > 50) return 'totonoi'
  return 'normal'
}

/** テーマ別の背景グラデーション定義 */
export const THEME_BACKGROUNDS: Record<Theme, string> = {
  normal:  'linear-gradient(160deg, #000811 0%, #001525 60%, #002040 100%)',
  warning: 'linear-gradient(160deg, #1a0008 0%, #2d0010 60%, #1a0008 100%)',
  totonoi: 'linear-gradient(160deg, #000811 0%, #002a5c 50%, #0054a7 100%)',
}

/** テーマ別の感情インジケーター色 */
export const THEME_INDICATOR_COLORS: Record<Theme, { primary: string; glow: string }> = {
  normal:  { primary: '#3a6a9a',  glow: 'rgba(0, 84, 167, 0.4)' },
  warning: { primary: '#eb6168',  glow: 'rgba(235, 97, 104, 0.6)' },
  totonoi: { primary: '#a8d8ff',  glow: 'rgba(168, 216, 255, 0.6)' },
}
