import { chronological } from './dashboard'
import { HEALTH_OPTIONS, METRICS, type Review } from './review'

/** Quotes a CSV field when it contains a comma, quote or line break (RFC 4180). */
export function escapeCsvField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const healthLabel = (health: Review['health']) =>
  HEALTH_OPTIONS.find((option) => option.value === health)?.label ?? health

const COLUMNS: {
  header: string
  value: (review: Review) => string | number
}[] = [
  { header: 'Week of', value: (r) => r.weekOf },
  ...METRICS.map(({ key, label }) => ({
    header: label,
    value: (r: Review) => r[key],
  })),
  ...METRICS.map(({ key, label }) => ({
    header: `${label} target`,
    value: (r: Review) => r.targets[key],
  })),
  { header: 'Hours', value: (r) => r.hours },
  { header: 'Energy', value: (r) => healthLabel(r.health) },
  { header: 'Biggest win', value: (r) => r.win },
  { header: 'Next focus', value: (r) => r.nextFocus },
  { header: 'Plan pivot', value: (r) => r.pivotNote },
]

/** All check-ins as CSV, one row per week, oldest first. */
export function reviewsToCsv(reviews: Review[]): string {
  const rows = [
    COLUMNS.map((column) => column.header),
    ...chronological(reviews).map((review) =>
      COLUMNS.map((column) => column.value(review)),
    ),
  ]
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
}

const pad = (n: number) => String(n).padStart(2, '0')

/** e.g. "job-search-checkins-2026-11-08.csv", using the local date. */
export const csvFilename = (now: Date = new Date()) =>
  `job-search-checkins-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`
