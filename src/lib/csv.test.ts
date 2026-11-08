import { describe, expect, it } from 'vitest'
import { csvFilename, escapeCsvField, reviewsToCsv } from './csv'
import { DEFAULT_TARGETS, METRICS } from './review'
import { makeReview } from './test-fixtures'

describe('escapeCsvField', () => {
  it('leaves plain values alone', () => {
    expect(escapeCsvField('Follow up')).toBe('Follow up')
    expect(escapeCsvField(5)).toBe('5')
  })

  it('quotes commas, quotes and line breaks', () => {
    expect(escapeCsvField('a, b')).toBe('"a, b"')
    expect(escapeCsvField('said "hi"')).toBe('"said ""hi"""')
    expect(escapeCsvField('line 1\nline 2')).toBe('"line 1\nline 2"')
  })
})

describe('reviewsToCsv', () => {
  it('writes only the header row when there are no check-ins', () => {
    const csv = reviewsToCsv([])
    expect(csv.split('\r\n')).toHaveLength(1)
    expect(csv).toContain('Week of,Conversations,')
  })

  it('has a value and a target column for every metric', () => {
    const header = reviewsToCsv([]).split(',')
    for (const { label } of METRICS) {
      expect(header).toContain(label)
      expect(header).toContain(`${label} target`)
    }
    expect(header.slice(-5)).toEqual([
      'Hours',
      'Energy',
      'Biggest win',
      'Next focus',
      'Plan pivot',
    ])
  })

  it('writes one row per check-in, oldest first, with escaped notes', () => {
    const csv = reviewsToCsv([
      makeReview({
        id: 'new',
        weekOf: '2026-11-02',
        applications: 4,
        targets: { ...DEFAULT_TARGETS, applications: 7 },
        win: 'Offer call, finally',
        health: 'energized',
      }),
      makeReview({ id: 'old', weekOf: '2026-10-26' }),
    ])
    const [header, first, second] = csv.split('\r\n')
    const columns = header.split(',')
    expect(first.startsWith('2026-10-26,')).toBe(true)
    expect(second.startsWith('2026-11-02,')).toBe(true)

    const cells = second.replace('"Offer call, finally"', 'WIN').split(',')
    expect(cells[columns.indexOf('Tailored apps')]).toBe('4')
    expect(cells[columns.indexOf('Tailored apps target')]).toBe('7')
    expect(cells[columns.indexOf('Energy')]).toBe('Energized')
    expect(cells[columns.indexOf('Biggest win')]).toBe('WIN')
  })
})

describe('csvFilename', () => {
  it('names the file after the local date', () => {
    expect(csvFilename(new Date(2026, 10, 8, 23, 30))).toBe(
      'job-search-checkins-2026-11-08.csv',
    )
  })
})
