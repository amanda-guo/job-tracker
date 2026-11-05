export const METRICS = [
  { key: 'conversations', label: 'Conversations', defaultTarget: 5 },
  { key: 'outreach', label: 'Warm outreach', defaultTarget: 18 },
  { key: 'referrals', label: 'Referral asks', defaultTarget: 2 },
  { key: 'applications', label: 'Tailored apps', defaultTarget: 5 },
  { key: 'practice', label: 'Practice', defaultTarget: 2 },
  { key: 'events', label: 'Events', defaultTarget: 1 },
] as const

export type Metric = (typeof METRICS)[number]['key']

export const HEALTH_OPTIONS = [
  { value: 'low', label: 'Running low' },
  { value: 'steady', label: 'Energy steady' },
  { value: 'energized', label: 'Energized' },
] as const

export type Health = (typeof HEALTH_OPTIONS)[number]['value']

export type Targets = Record<Metric, number>

export const DEFAULT_TARGETS = Object.fromEntries(
  METRICS.map(({ key, defaultTarget }) => [key, defaultTarget]),
) as Targets

export const MAX_COUNT = 999
export const MAX_HOURS = 60
export const MAX_TEXT_LENGTH = 500

/** A weekly check-in as entered by the user, before it has an id. */
export type ReviewInput = Record<Metric, number> & {
  /** Start of the week, as a plain `YYYY-MM-DD` date. */
  weekOf: string
  hours: number
  health: Health
  win: string
  nextFocus: string
  pivotNote: string
  targets: Targets
}

export type Review = ReviewInput & { id: string }
