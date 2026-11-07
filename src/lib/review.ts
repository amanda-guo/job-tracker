export const METRICS = [
  { key: 'conversations', label: 'Conversations', defaultTarget: 5 },
  { key: 'outreach', label: 'Warm outreach', defaultTarget: 18 },
  { key: 'coffeeChats', label: 'Coffee chats', defaultTarget: 2 },
  { key: 'referrals', label: 'Referral asks', defaultTarget: 2 },
  { key: 'applications', label: 'Tailored apps', defaultTarget: 5 },
  { key: 'practice', label: 'Practice', defaultTarget: 2 },
  { key: 'events', label: 'Events', defaultTarget: 1 },
] as const

export type MetricDefinition = (typeof METRICS)[number]

export type Metric = MetricDefinition['key']

/** Builds a record with one entry per metric, e.g. counts or targets. */
export const byMetric = <T>(
  valueFor: (metric: MetricDefinition) => T,
): Record<Metric, T> =>
  Object.fromEntries(
    METRICS.map((metric) => [metric.key, valueFor(metric)]),
  ) as Record<Metric, T>

export const HEALTH_OPTIONS = [
  { value: 'low', label: 'Running low' },
  { value: 'steady', label: 'Energy steady' },
  { value: 'energized', label: 'Energized' },
] as const

export type Health = (typeof HEALTH_OPTIONS)[number]['value']

export type Targets = Record<Metric, number>

export const DEFAULT_TARGETS: Targets = byMetric(
  ({ defaultTarget }) => defaultTarget,
)

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
