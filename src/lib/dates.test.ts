import { describe, expect, it } from 'vitest'
import { currentWeekStart, weekLabel } from './dates'

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

describe('weekLabel', () => {
  it.each([
    [new Date(2026, 10, 9, 0, 5), 'Week of Nov 9'], // Monday just after midnight
    [new Date(2026, 10, 11, 9), 'Week of Nov 9'], // Wednesday
    [new Date(2026, 10, 15, 23, 59), 'Week of Nov 9'], // Sunday night, same week
    [new Date(2026, 10, 8, 23, 59), 'Week of Nov 2'], // Sunday before: previous week
    [new Date(2026, 10, 1, 12), 'Week of Oct 26'], // Sunday, week spans Oct and Nov
    [new Date(2027, 0, 1, 12), 'Week of Dec 28'], // Friday, week spans two years
  ])('labels %s as "%s"', (now, expected) => {
    expect(weekLabel(now)).toBe(expected)
  })

  it('shows the day without a leading zero', () => {
    expect(weekLabel(new Date(2026, 1, 3))).toBe('Week of Feb 2')
  })
})
