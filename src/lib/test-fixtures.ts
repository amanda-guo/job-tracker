import { DEFAULT_TARGETS, type Review, type ReviewInput } from './review'

/** Test helper: a valid check-in with every field filled, overridable per test. */
export function makeInput(overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    weekOf: '2026-11-02',
    conversations: 3,
    outreach: 10,
    referrals: 1,
    applications: 4,
    practice: 2,
    events: 0,
    hours: 12,
    health: 'steady',
    win: 'Got a referral',
    nextFocus: 'Follow up',
    pivotNote: '',
    targets: { ...DEFAULT_TARGETS },
    ...overrides,
  }
}

export function makeReview(overrides: Partial<Review> = {}): Review {
  return { id: 'review-1', ...makeInput(overrides), ...overrides }
}
