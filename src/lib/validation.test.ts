import { describe, expect, it } from 'vitest'
import { DEFAULT_TARGETS, MAX_TEXT_LENGTH } from './review'
import { makeInput } from './test-fixtures'
import {
  isValidWeekOf,
  parseReviewInput,
  parseStoredReview,
  reviewFieldsFromForm,
  targetFieldName,
} from './validation'

const parseOk = (raw: unknown) => {
  const result = parseReviewInput(raw)
  if (!result.ok) throw new Error(`expected ok, got: ${result.message}`)
  return result.value
}

describe('isValidWeekOf', () => {
  it('accepts real YYYY-MM-DD dates', () => {
    expect(isValidWeekOf('2026-11-02')).toBe(true)
    expect(isValidWeekOf('2028-02-29')).toBe(true)
  })

  it.each([
    '',
    '2026-1-05',
    '2026-11-02T12:00:00.000Z',
    '2026-02-30',
    '2026-13-01',
    undefined,
    20261102,
  ])('rejects %j', (value) => {
    expect(isValidWeekOf(value)).toBe(false)
  })
})

describe('parseReviewInput', () => {
  it('passes a valid check-in through unchanged', () => {
    const input = makeInput()
    expect(parseOk(input)).toEqual(input)
  })

  it('rejects non-objects', () => {
    expect(parseReviewInput(null)).toEqual({
      ok: false,
      message: 'Check-in data is missing.',
    })
    expect(parseReviewInput([]).ok).toBe(false)
  })

  it('requires a valid week', () => {
    expect(parseReviewInput(makeInput({ weekOf: '2026-02-30' }))).toEqual({
      ok: false,
      message: 'Choose a valid week.',
    })
  })

  it('requires a known energy level', () => {
    expect(parseReviewInput({ ...makeInput(), health: 'tired' })).toEqual({
      ok: false,
      message: 'Choose an energy level.',
    })
  })

  it('rounds and clamps counts to 0–999, treating blanks and junk as 0', () => {
    const value = parseOk({
      ...makeInput(),
      conversations: '-3',
      outreach: 2.6,
      referrals: 5000,
      applications: 'abc',
      practice: '',
      events: undefined,
    })
    expect(value).toMatchObject({
      conversations: 0,
      outreach: 3,
      referrals: 999,
      applications: 0,
      practice: 0,
      events: 0,
    })
  })

  it('caps hours at 60', () => {
    expect(parseOk({ ...makeInput(), hours: '75' }).hours).toBe(60)
  })

  it('fills missing or blank targets with defaults but keeps an explicit 0', () => {
    const value = parseOk({
      ...makeInput(),
      targets: { conversations: '', outreach: '0', referrals: 4 },
    })
    expect(value.targets).toEqual({
      ...DEFAULT_TARGETS,
      outreach: 0,
      referrals: 4,
    })
    expect(parseOk({ ...makeInput(), targets: undefined }).targets).toEqual(
      DEFAULT_TARGETS,
    )
  })

  it('trims and truncates text, and blanks non-strings', () => {
    const value = parseOk({
      ...makeInput(),
      win: `  ${'x'.repeat(MAX_TEXT_LENGTH + 50)}  `,
      nextFocus: '  Practice SQL  ',
      pivotNote: 42,
    })
    expect(value.win).toHaveLength(MAX_TEXT_LENGTH)
    expect(value.nextFocus).toBe('Practice SQL')
    expect(value.pivotNote).toBe('')
  })
})

describe('parseStoredReview', () => {
  it('returns a review when the record is valid', () => {
    const stored = { id: 'abc', ...makeInput() }
    expect(parseStoredReview(stored)).toEqual(stored)
  })

  it.each([
    ['missing id', makeInput()],
    ['empty id', { id: '', ...makeInput() }],
    ['bad week', { id: 'abc', ...makeInput({ weekOf: 'nope' }) }],
    ['not an object', 'review'],
  ])('returns null for %s', (_label, raw) => {
    expect(parseStoredReview(raw)).toBeNull()
  })
})

describe('reviewFieldsFromForm', () => {
  it('maps form fields, including target-* fields, into a parseable check-in', () => {
    const form = new FormData()
    const entries: Record<string, string> = {
      weekOf: '2026-11-02',
      conversations: '4',
      outreach: '12',
      referrals: '1',
      applications: '6',
      practice: '2',
      events: '1',
      hours: '15',
      health: 'energized',
      win: 'Offer call',
      nextFocus: 'Negotiate',
      pivotNote: 'Sick two days',
      [targetFieldName('conversations')]: '3',
      [targetFieldName('outreach')]: '10',
      [targetFieldName('referrals')]: '2',
      [targetFieldName('applications')]: '5',
      [targetFieldName('practice')]: '2',
      [targetFieldName('events')]: '0',
    }
    for (const [name, value] of Object.entries(entries)) form.set(name, value)

    expect(parseOk(reviewFieldsFromForm(form))).toEqual({
      weekOf: '2026-11-02',
      conversations: 4,
      outreach: 12,
      referrals: 1,
      applications: 6,
      practice: 2,
      events: 1,
      hours: 15,
      health: 'energized',
      win: 'Offer call',
      nextFocus: 'Negotiate',
      pivotNote: 'Sick two days',
      targets: {
        conversations: 3,
        outreach: 10,
        referrals: 2,
        applications: 5,
        practice: 2,
        events: 0,
      },
    })
  })
})
