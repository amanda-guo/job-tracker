import { HEALTH_OPTIONS, METRICS, type Review } from './review'

type Column = { header: string; value: (review: Review) => string | number }

const COLUMNS: Column[] = [
  { header: 'Week of', value: (review) => review.weekOf },
  ...METRICS.map(
    ({ key, label }): Column => ({
      header: label,
      value: (review) => review[key],
    }),
  ),
  ...METRICS.map(
    ({ key, label }): Column => ({
      header: `${label} target`,
      value: (review) => review.targets[key],
    }),
  ),
  { header: 'Hours', value: (review) => review.hours },
  {
    header: 'Energy',
    value: (review) =>
      HEALTH_OPTIONS.find((option) => option.value === review.health)?.label ??
      review.health,
  },
  { header: 'Biggest win', value: (review) => review.win },
  { header: 'Next focus', value: (review) => review.nextFocus },
  { header: 'Plan pivot', value: (review) => review.pivotNote },
]

/**
 * Quotes a value for CSV. Text starting with a formula character is
 * prefixed with an apostrophe so spreadsheet apps show it as plain text
 * instead of running it.
 */
export function escapeCsvValue(value: string | number): string {
  if (typeof value === 'number') return String(value)
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/** All check-ins as CSV text, one row per check-in in the order given. */
export function reviewsToCsv(reviews: Review[]): string {
  const rows = [
    COLUMNS.map((column) => escapeCsvValue(column.header)),
    ...reviews.map((review) =>
      COLUMNS.map((column) => escapeCsvValue(column.value(review))),
    ),
  ]
  return `${rows.map((row) => row.join(',')).join('\r\n')}\r\n`
}

export const csvFileName = (today: string) =>
  `job-tracker-check-ins-${today}.csv`

/** Starts a browser download of the check-ins as a CSV file. */
export function downloadReviewsCsv(reviews: Review[], today: string) {
  // The byte-order mark makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿', reviewsToCsv(reviews)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = csvFileName(today)
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
