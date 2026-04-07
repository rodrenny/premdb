export type EligibilityState = 'waiting_window' | 'awaiting_review' | 'ready_to_settle' | 'expired'

export function checkEligibility(releaseDate: Date, now: Date, numVotes: number): EligibilityState {
  const days = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 14) return 'waiting_window'
  if (days >= 60 && numVotes < 5000) return 'expired'
  if (numVotes >= 5000) return 'ready_to_settle'
  return 'awaiting_review'
}
