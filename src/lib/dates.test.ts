import { describe, expect, it } from 'vitest'
import { currentWeekStart } from './dates'

describe('currentWeekStart', () => {
  it.each([
    [new Date(2026, 10, 5, 23, 30), '2026-11-02'], // Thursday night
    [new Date(2026, 10, 2, 0, 5), '2026-11-02'], // Monday just after midnight
    [new Date(2026, 10, 8, 12), '2026-11-02'], // Sunday
    [new Date(2026, 10, 1, 12), '2026-10-26'], // Sunday, crosses a month
  ])('returns the Monday of the week containing %s', (now, expected) => {
    expect(currentWeekStart(now)).toBe(expected)
  })
})
