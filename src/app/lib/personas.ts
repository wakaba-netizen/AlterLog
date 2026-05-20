// src/app/lib/personas.ts
// 'use server' ファイル外に切り出し（'use server'はasync関数のみexport可能なため）

export type Persona = 'T' | 'chikirin' | 'maezawa'

export const PERSONA_LABELS: Record<Persona, string> = {
  T:        '糸井重里',
  chikirin: 'ちきりん',
  maezawa:  '前澤友作',
}
