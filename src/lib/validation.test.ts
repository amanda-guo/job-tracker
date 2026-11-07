import { describe, expect, it } from 'vitest'
import { byMetric, DEFAULT_TARGETS, MAX_TEXT_LENGTH, METRICS } from './review'
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

describe('byMetric', () => {
  it('builds one entry per metric, in METRICS order', () => {
    const record = byMetric(({ label }) => label)
    expect(Object.keys(record)).toEqual(METRICS.map(({ key }) => key))
    expect(Object.values(record)).toEqual(METRICS.map(({ label }) => label))
  })
})

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

  it.each([
    ['-3', 0],
    [2.6, 3],
    ['1.4', 1],
    [5000, 999],
    ['abc', 0],
    ['', 0],
    [undefined, 0],
  ])('reads a count of %j as %d for every metric', (raw, expected) => {
    const value = parseOk({ ...makeInput(), ...byMetric(() => raw) })
    expect(value).toMatchObject(byMetric(() => expected))
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

describe('Coffee chats metric', () => {
  it('is defined with a default weekly target of 2', () => {
    expect(METRICS).toContainEqual({
      key: 'coffeeChats',
      label: 'Coffee chats',
      defaultTarget: 2,
    })
    expect(DEFAULT_TARGETS.coffeeChats).toBe(2)
  })

  it('reads its count and adjusted weekly target from the check-in form', () => {
    const form = new FormData()
    form.set('weekOf', '2026-11-02')
    form.set('health', 'steady')
    form.set('coffeeChats', '3')
    form.set(targetFieldName('coffeeChats'), '4')

    const value = parseOk(reviewFieldsFromForm(form))
    expect(value.coffeeChats).toBe(3)
    expect(value.targets.coffeeChats).toBe(4)
  })

  it('falls back to the default target of 2 when the target field is blank', () => {
    const form = new FormData()
    form.set('weekOf', '2026-11-02')
    form.set('health', 'steady')
    form.set('coffeeChats', '1')
    form.set(targetFieldName('coffeeChats'), '')

    expect(parseOk(reviewFieldsFromForm(form)).targets.coffeeChats).toBe(2)
  })

  it('gives weeks saved before it existed a count and target of 0', () => {
    const { coffeeChats: _count, targets, ...rest } = makeInput()
    const { coffeeChats: _target, ...oldTargets } = targets
    const review = parseStoredReview({
      id: 'abc',
      ...rest,
      targets: oldTargets,
    })
    expect(review?.coffeeChats).toBe(0)
    expect(review?.targets.coffeeChats).toBe(0)
    expect(review?.targets.outreach).toBe(DEFAULT_TARGETS.outreach)
  })

  it('keeps a stored target even when the count is missing', () => {
    const { coffeeChats: _count, ...rest } = makeInput()
    const review = parseStoredReview({ id: 'abc', ...rest })
    expect(review?.coffeeChats).toBe(0)
    expect(review?.targets.coffeeChats).toBe(DEFAULT_TARGETS.coffeeChats)
  })
})

describe('reviewFieldsFromForm', () => {
  it('maps form fields, including target-* fields, into a parseable check-in', () => {
    // Distinct values per metric, so a mixed-up field would be caught.
    const count = (index: number) => index + 1
    const target = (index: number) => index + 10
    const form = new FormData()
    const entries: Record<string, string> = {
      weekOf: '2026-11-02',
      hours: '15',
      health: 'energized',
      win: 'Offer call',
      nextFocus: 'Negotiate',
      pivotNote: 'Sick two days',
    }
    METRICS.forEach(({ key }, index) => {
      entries[key] = String(count(index))
      entries[targetFieldName(key)] = String(target(index))
    })
    for (const [name, value] of Object.entries(entries)) form.set(name, value)

    const indexOf = (key: string) => METRICS.findIndex((m) => m.key === key)
    expect(parseOk(reviewFieldsFromForm(form))).toEqual({
      weekOf: '2026-11-02',
      ...byMetric(({ key }) => count(indexOf(key))),
      hours: 15,
      health: 'energized',
      win: 'Offer call',
      nextFocus: 'Negotiate',
      pivotNote: 'Sick two days',
      targets: byMetric(({ key }) => target(indexOf(key))),
    })
  })
})
