import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultScreen } from './ResultScreen'
import type { AnalysisResult } from '@/app/actions/analyze'

const mockResult: AnalysisResult = {
  id: 'test-id',
  transcript: 'これはテストの文字起こし全文です。',
  fact_ratio: 60,
  emotion_ratio: 40,
  passive_ratio: 30,
  thinking_profile: '焦燥感に駆られた完璧主義者',
  ai_comment: '受動態が30%。あなたはまだ主語を手放している。',
}

describe('ResultScreen', () => {
  it('displays thinking profile prominently', () => {
    render(<ResultScreen result={mockResult} onReset={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '焦燥感に駆られた完璧主義者' })).toBeInTheDocument()
  })

  it('displays all three metric percentages', () => {
    render(<ResultScreen result={mockResult} onReset={vi.fn()} />)
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('displays AI comment', () => {
    render(<ResultScreen result={mockResult} onReset={vi.fn()} />)
    expect(screen.getByText('受動態が30%。あなたはまだ主語を手放している。')).toBeInTheDocument()
  })

  it('calls onReset when reset button is clicked', () => {
    const onReset = vi.fn()
    render(<ResultScreen result={mockResult} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: 'もう一度話す' }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('hides transcript by default, shows on toggle', () => {
    render(<ResultScreen result={mockResult} onReset={vi.fn()} />)
    expect(screen.queryByText('これはテストの文字起こし全文です。')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/原文を見る/))
    expect(screen.getByText('これはテストの文字起こし全文です。')).toBeInTheDocument()
  })
})
