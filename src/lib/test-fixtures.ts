import {
  byMetric,
  DEFAULT_TARGETS,
  type Review,
  type ReviewInput,
} from './review'

/** Test helper: a valid check-in with every field filled, overridable per test. */
export function makeInput(overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    weekOf: '2026-11-02',
    ...byMetric(() => 1),
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
