// src/app/utils/cta.test.ts
import { describe, it, expect } from 'vitest'
import { getCTA } from './cta'

describe('getCTA', () => {
  it('returns morning message at 5am', () => {
    expect(getCTA(5)).toBe('今のモヤモヤ、全部置いていこう。')
  })
  it('returns morning message at 10am', () => {
    expect(getCTA(10)).toBe('今のモヤモヤ、全部置いていこう。')
  })
  it('returns default at 11am (boundary)', () => {
    expect(getCTA(11)).toBe('さあ、吐き出せ。')
  })
  it('returns default message at noon', () => {
    expect(getCTA(12)).toBe('さあ、吐き出せ。')
  })
  it('returns default at 20:59 (boundary)', () => {
    expect(getCTA(20)).toBe('さあ、吐き出せ。')
  })
  it('returns night message at 21', () => {
    expect(getCTA(21)).toBe('今日一日を、全部ここに置いていけ。')
  })
  it('returns night message at 2am', () => {
    expect(getCTA(2)).toBe('今日一日を、全部ここに置いていけ。')
  })
  it('returns night message at midnight', () => {
    expect(getCTA(0)).toBe('今日一日を、全部ここに置いていけ。')
  })
  it('uses current hour when no argument given', () => {
    const result = getCTA()
    expect(['今のモヤモヤ、全部置いていこう。', 'さあ、吐き出せ。', '今日一日を、全部ここに置いていけ。']).toContain(result)
  })
})
