import { describe, expect, it } from 'vitest'
import { checkEligibility } from '@/lib/settlement/eligibility'

describe('eligibility', () => {
  const release = new Date('2026-01-01T00:00:00Z')

  it('handles day-14 and vote thresholds', () => {
    expect(checkEligibility(release, new Date('2026-01-14T00:00:00Z'), 4999)).toBe('awaiting_review')
    expect(checkEligibility(release, new Date('2026-01-14T00:00:00Z'), 5000)).toBe('ready_to_settle')
  })

  it('expires at day 60 if below threshold', () => {
    expect(checkEligibility(release, new Date('2026-03-02T00:00:00Z'), 4999)).toBe('expired')
  })
})
