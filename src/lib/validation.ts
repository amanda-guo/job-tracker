import {
  byMetric,
  DEFAULT_TARGETS,
  HEALTH_OPTIONS,
  type Health,
  MAX_COUNT,
  MAX_HOURS,
  MAX_TEXT_LENGTH,
  type Metric,
  type Review,
  type ReviewInput,
  type Targets,
} from './review'

export type ParseResult =
  | { ok: true; value: ReviewInput }
  | { ok: false; message: string }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** True for a real calendar date written as `YYYY-MM-DD` (rejects e.g. 2026-02-30). */
export function isValidWeekOf(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T12:00:00.000Z`)
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

const isHealth = (value: unknown): value is Health =>
  HEALTH_OPTIONS.some((option) => option.value === value)

/** Whole number clamped to [0, max]. Blank or missing uses the fallback; garbage uses the fallback. */
function toCount(raw: unknown, fallback: number, max = MAX_COUNT): number {
  if (raw === undefined || raw === null || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.round(value)))
    : fallback
}

const toText = (raw: unknown): string =>
  typeof raw === 'string' ? raw.trim().slice(0, MAX_TEXT_LENGTH) : ''

/**
 * Validates and normalises a check-in. Week and energy level must be valid;
 * everything else is coerced (numbers clamped, text trimmed and truncated).
 */
export function parseReviewInput(raw: unknown): ParseResult {
  if (!isRecord(raw)) return { ok: false, message: 'Check-in data is missing.' }
  if (!isValidWeekOf(raw.weekOf)) {
    return { ok: false, message: 'Choose a valid week.' }
  }
  if (!isHealth(raw.health)) {
    return { ok: false, message: 'Choose an energy level.' }
  }

  const rawTargets = isRecord(raw.targets) ? raw.targets : {}
  const counts = byMetric(({ key }) => toCount(raw[key], 0))
  const targets: Targets = byMetric(({ key }) =>
    toCount(rawTargets[key], DEFAULT_TARGETS[key]),
  )

  return {
    ok: true,
    value: {
      weekOf: raw.weekOf,
      ...counts,
      hours: toCount(raw.hours, 0, MAX_HOURS),
      health: raw.health,
      win: toText(raw.win),
      nextFocus: toText(raw.nextFocus),
      pivotNote: toText(raw.pivotNote),
      targets,
    },
  }
}

/**
 * Turns a record read back from storage into a Review, or null if it is unusable.
 * A metric the record has no count for (it was saved before that metric
 * existed) gets a target of 0, so older weeks aren't shown as missing it.
 */
export function parseStoredReview(raw: unknown): Review | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '') {
    return null
  }
  const storedTargets = isRecord(raw.targets) ? raw.targets : {}
  const targets = byMetric(({ key }) =>
    key in raw || key in storedTargets ? storedTargets[key] : 0,
  )
  const parsed = parseReviewInput({ ...raw, targets })
  return parsed.ok ? { id: raw.id, ...parsed.value } : null
}

/** Form field name for a metric's weekly target. */
export const targetFieldName = (metric: Metric) => `target-${metric}`

/** Collects the check-in form's fields into the shape parseReviewInput expects. */
export function reviewFieldsFromForm(form: FormData): Record<string, unknown> {
  const get = (name: string) => {
    const value = form.get(name)
    return typeof value === 'string' ? value : undefined
  }
  return {
    weekOf: get('weekOf'),
    ...byMetric(({ key }) => get(key)),
    hours: get('hours'),
    health: get('health'),
    win: get('win'),
    nextFocus: get('nextFocus'),
    pivotNote: get('pivotNote'),
    targets: byMetric(({ key }) => get(targetFieldName(key))),
  }
}
