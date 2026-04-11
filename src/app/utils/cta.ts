// src/app/utils/cta.ts
export function getCTA(hour: number = new Date().getHours()): string {
  if (hour >= 5 && hour < 11) return '今のモヤモヤ、全部置いていこう。'
  if (hour >= 21 || hour < 5) return '今日一日を、全部ここに置いていけ。'
  return 'さあ、吐き出せ。'
}
