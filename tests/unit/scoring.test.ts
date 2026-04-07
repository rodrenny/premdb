import { describe, expect, it } from 'vitest'
import { calcPoints, calcPointsWithBonus } from '@/lib/scoring'

describe('scoring', () => {
  it('calculates base points', () => {
    expect(calcPoints(7.0, 7.5)).toBe(90)
    expect(calcPoints(7.0, 8.0)).toBe(80)
    expect(calcPoints(7.0, 9.0)).toBe(60)
    expect(calcPoints(1.0, 10.0)).toBe(0)
  })

  it('applies bonus for exact one-decimal match', () => {
    expect(calcPointsWithBonus(7.1, 7.1)).toBe(110)
    expect(calcPointsWithBonus(7.1, 7.2)).toBe(98)
  })
})
