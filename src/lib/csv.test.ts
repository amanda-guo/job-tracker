import { describe, expect, it } from 'vitest'
import { csvFileName, escapeCsvValue, reviewsToCsv } from './csv'
import { METRICS } from './review'
import { makeReview } from './test-fixtures'

describe('escapeCsvValue', () => {
  it('leaves plain values alone', () => {
    expect(escapeCsvValue('Follow up')).toBe('Follow up')
    expect(escapeCsvValue(12)).toBe('12')
  })

  it('quotes values with commas, quotes or line breaks', () => {
    expect(escapeCsvValue('a, b')).toBe('"a, b"')
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvValue('line one\nline two')).toBe('"line one\nline two"')
  })

  it('stops text from running as a spreadsheet formula', () => {
    expect(escapeCsvValue('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(escapeCsvValue('+1 call')).toBe("'+1 call")
    expect(escapeCsvValue('-')).toBe("'-")
    expect(escapeCsvValue('@team')).toBe("'@team")
  })

  it('does not change negative-looking numbers', () => {
    expect(escapeCsvValue(-1)).toBe('-1')
  })
})

describe('reviewsToCsv', () => {
  it('writes a header row and one row per check-in', () => {
    const csv = reviewsToCsv([
      makeReview({ id: 'a', weekOf: '2026-11-02', win: 'Offer, finally' }),
      makeReview({ id: 'b', weekOf: '2026-10-26', health: 'low' }),
    ])
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(4)
    expect(lines[3]).toBe('')

    const header = lines[0].split(',')
    expect(header[0]).toBe('Week of')
    expect(header).toHaveLength(1 + METRICS.length * 2 + 5)
    expect(header).toContain('Tailored apps target')

    expect(lines[1].startsWith('2026-11-02,1,')).toBe(true)
    expect(lines[1]).toContain('Energy steady,"Offer, finally",Follow up,')
    expect(lines[2]).toContain('Running low')
  })

  it('writes only the header when there are no check-ins', () => {
    expect(reviewsToCsv([]).split('\r\n')).toHaveLength(2)
  })
})

describe('csvFileName', () => {
  it('includes the date', () => {
    expect(csvFileName('2026-11-08')).toBe(
      'job-tracker-check-ins-2026-11-08.csv',
    )
  })
})
