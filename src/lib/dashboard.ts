import { METRICS, type Metric, type Review } from './review'

export type Period = 'all' | 'week' | 'month'

export type PeriodSelection = {
  period: Period
  /** `YYYY-MM-DD`, used when period is 'week'. */
  week: string
  /** `YYYY-MM`, used when period is 'month'. */
  month: string
}

export const monthOf = (weekOf: string) => weekOf.slice(0, 7)

export function filterByPeriod(
  reviews: Review[],
  { period, week, month }: PeriodSelection,
): Review[] {
  if (period === 'week') return reviews.filter((r) => r.weekOf === week)
  if (period === 'month')
    return reviews.filter((r) => monthOf(r.weekOf) === month)
  return reviews
}

export type MetricTotal = {
  key: Metric
  label: string
  value: number
  target: number
}

/** Sum of each metric and of its weekly targets across the given check-ins. */
export function computeTotals(reviews: Review[]): MetricTotal[] {
  return METRICS.map(({ key, label }) => ({
    key,
    label,
    value: reviews.reduce((sum, review) => sum + review[key], 0),
    target: reviews.reduce((sum, review) => sum + review.targets[key], 0),
  }))
}

export const percentOfTarget = (value: number, target: number) =>
  target > 0 ? Math.round((value / target) * 100) : 0

/** Progress bar fill, 0–100. */
export const progressWidth = (value: number, target: number) =>
  target > 0 ? Math.min(100, (value / target) * 100) : 0

export const CHART_MIN_BAR_PX = 8
export const CHART_MAX_BAR_PX = 130

/** Largest value of a metric across check-ins (at least 1, so bars can scale). */
export const chartMax = (reviews: Review[], metric: Metric) =>
  Math.max(1, ...reviews.map((review) => review[metric]))

export const barHeight = (value: number, max: number) =>
  Math.max(CHART_MIN_BAR_PX, (value / Math.max(1, max)) * CHART_MAX_BAR_PX)

/** Oldest week first, for drawing the chart left to right. */
export const chronological = (reviews: Review[]) =>
  [...reviews].sort((a, b) => a.weekOf.localeCompare(b.weekOf))

const toUtcNoon = (weekOf: string) =>
  new Date(`${weekOf.slice(0, 10)}T12:00:00.000Z`)

const monthFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  timeZone: 'UTC',
})
const monthDayFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** The Monday–Friday work week starting on weekOf, e.g. "Nov 2–6, 2026". */
export function formatWeekRange(weekOf: string): string {
  const start = toUtcNoon(weekOf)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 4)
  const startYear = start.getUTCFullYear()
  const endYear = end.getUTCFullYear()

  if (startYear !== endYear) {
    return `${monthDayFormat.format(start)}, ${startYear}–${monthDayFormat.format(end)}, ${endYear}`
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${monthDayFormat.format(start)}–${monthDayFormat.format(end)}, ${startYear}`
  }
  return `${monthFormat.format(start)} ${start.getUTCDate()}–${end.getUTCDate()}, ${startYear}`
}

/** e.g. "Nov 2". */
export const formatShortDate = (weekOf: string) =>
  monthDayFormat.format(toUtcNoon(weekOf))

const pad = (n: number) => String(n).padStart(2, '0')

/** Monday of the week containing `now`, in local time, as `YYYY-MM-DD`. */
export function currentWeekStart(now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
