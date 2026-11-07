import { describe, expect, it } from 'vitest'
import {
  barHeight,
  CHART_MAX_BAR_PX,
  CHART_MIN_BAR_PX,
  chartMax,
  chronological,
  computeTotals,
  currentWeekStart,
  filterByPeriod,
  formatShortDate,
  formatWeekRange,
  percentOfTarget,
  progressWidth,
} from './dashboard'
import { DEFAULT_TARGETS, METRICS } from './review'
import { makeReview } from './test-fixtures'

const reviews = [
  makeReview({ id: 'a', weekOf: '2026-11-02', applications: 4 }),
  makeReview({
    id: 'b',
    weekOf: '2026-10-26',
    applications: 2,
    targets: { ...DEFAULT_TARGETS, applications: 3 },
  }),
  makeReview({ id: 'c', weekOf: '2026-09-28', applications: 6 }),
]

describe('filterByPeriod', () => {
  const selection = { week: '2026-10-26', month: '2026-10' }

  it('returns everything for all time', () => {
    expect(filterByPeriod(reviews, { ...selection, period: 'all' })).toEqual(
      reviews,
    )
  })

  it('returns only the exact week', () => {
    const ids = filterByPeriod(reviews, { ...selection, period: 'week' }).map(
      (r) => r.id,
    )
    expect(ids).toEqual(['b'])
  })

  it('returns weeks starting in the month', () => {
    const ids = filterByPeriod(reviews, {
      ...selection,
      period: 'month',
      month: '2026-11',
    }).map((r) => r.id)
    expect(ids).toEqual(['a'])
  })
})

describe('computeTotals', () => {
  it('sums each metric and its per-week targets', () => {
    const applications = computeTotals(reviews).find(
      (t) => t.key === 'applications',
    )
    expect(applications).toEqual({
      key: 'applications',
      label: 'Tailored apps',
      value: 12,
      target: DEFAULT_TARGETS.applications * 2 + 3,
    })
  })

  it('totals Coffee chats and its weekly targets across the period', () => {
    const weeks = [
      makeReview({ id: 'a', weekOf: '2026-11-02', coffeeChats: 3 }),
      makeReview({
        id: 'b',
        weekOf: '2026-10-26',
        coffeeChats: 1,
        targets: { ...DEFAULT_TARGETS, coffeeChats: 0 },
      }),
    ]
    expect(computeTotals(weeks).find((t) => t.key === 'coffeeChats')).toEqual({
      key: 'coffeeChats',
      label: 'Coffee chats',
      value: 4,
      target: 2,
    })
  })

  it('returns zeros for no check-ins, one entry per metric', () => {
    const totals = computeTotals([])
    expect(totals).toHaveLength(METRICS.length)
    expect(totals.every((t) => t.value === 0 && t.target === 0)).toBe(true)
  })
})

describe('progress maths', () => {
  it('rounds the percentage and guards against a zero target', () => {
    expect(percentOfTarget(2, 3)).toBe(67)
    expect(percentOfTarget(5, 0)).toBe(0)
  })

  it('caps the progress bar at 100%', () => {
    expect(progressWidth(1, 4)).toBe(25)
    expect(progressWidth(9, 4)).toBe(100)
    expect(progressWidth(3, 0)).toBe(0)
  })
})

describe('chart', () => {
  it('uses at least 1 as the max so empty data does not divide by zero', () => {
    expect(chartMax([], 'applications')).toBe(1)
    expect(chartMax(reviews, 'applications')).toBe(6)
  })

  it('scales bars between the minimum and maximum height', () => {
    expect(barHeight(0, 6)).toBe(CHART_MIN_BAR_PX)
    expect(barHeight(6, 6)).toBe(CHART_MAX_BAR_PX)
    expect(barHeight(3, 6)).toBe(CHART_MAX_BAR_PX / 2)
  })

  it('orders weeks oldest first without mutating the input', () => {
    expect(chronological(reviews).map((r) => r.id)).toEqual(['c', 'b', 'a'])
    expect(reviews.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('date formatting', () => {
  it.each([
    ['2026-11-02', 'Nov 2–6, 2026'],
    ['2026-10-29', 'Oct 29–Nov 2, 2026'],
    ['2025-12-29', 'Dec 29, 2025–Jan 2, 2026'],
  ])('formats the work week starting %s as %s', (weekOf, expected) => {
    expect(formatWeekRange(weekOf)).toBe(expected)
  })

  it('formats a short date', () => {
    expect(formatShortDate('2026-11-02')).toBe('Nov 2')
  })
})

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
