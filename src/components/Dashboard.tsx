import { useMemo, useState } from 'react'
import {
  barHeight,
  chartMax,
  chronological,
  computeTotals,
  filterByPeriod,
  formatShortDate,
  formatWeekRange,
  monthOf,
  type Period,
  percentOfTarget,
  progressWidth,
} from '../lib/dashboard'
import { METRICS, type Metric, type Review } from '../lib/review'

const controlClass =
  'rounded-xl border border-[#172B3E]/15 bg-white px-3 py-2 text-sm'

type Props = {
  reviews: Review[]
  defaultWeek: string
}

export function Dashboard({ reviews, defaultWeek }: Props) {
  const [metric, setMetric] = useState<Metric>('conversations')
  const [period, setPeriod] = useState<Period>('all')
  const [selectedWeek, setSelectedWeek] = useState(
    () => reviews[0]?.weekOf ?? defaultWeek,
  )
  const [selectedMonth, setSelectedMonth] = useState(() =>
    monthOf(reviews[0]?.weekOf ?? defaultWeek),
  )

  const visible = useMemo(
    () =>
      filterByPeriod(reviews, {
        period,
        week: selectedWeek,
        month: selectedMonth,
      }),
    [reviews, period, selectedWeek, selectedMonth],
  )
  const totals = useMemo(() => computeTotals(visible), [visible])
  const selected = totals.find((item) => item.key === metric) ?? totals[0]
  const max = chartMax(visible, metric)

  return (
    <section
      id="dashboard"
      tabIndex={-1}
      aria-labelledby="dashboard-heading"
      className="py-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#43719A]">
            Progress dashboard
          </p>
          <h2 id="dashboard-heading" className="mt-1 font-serif text-3xl">
            Read the signal, not the noise.
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Activity to display"
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
            className={controlClass}
          >
            {METRICS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Dashboard time period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className={controlClass}
          >
            <option value="all">All time</option>
            <option value="week">By week</option>
            <option value="month">By month</option>
          </select>
          {period === 'week' && (
            <input
              aria-label="Dashboard week"
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className={controlClass}
            />
          )}
          {period === 'month' && (
            <input
              aria-label="Dashboard month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={controlClass}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-[28px] bg-[#172B3E] p-7 text-white">
          <p className="text-sm text-[#B3C7F0]">{selected.label}</p>
          <p className="mt-2 text-6xl font-semibold tracking-[-0.06em]">
            {selected.value}
          </p>
          <p className="mt-3 text-sm text-[#C7DBEF]">
            {percentOfTarget(selected.value, selected.target)}% of{' '}
            {selected.target} planned
          </p>
          <div
            role="progressbar"
            aria-label={`${selected.label} progress`}
            aria-valuemin={0}
            aria-valuemax={Math.max(1, selected.target, selected.value)}
            aria-valuenow={selected.value}
            className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full rounded-full bg-[#8CB7DF]"
              style={{
                width: `${progressWidth(selected.value, selected.target)}%`,
              }}
            />
          </div>
        </div>

        <div className="flex min-h-52 rounded-[28px] border border-[#172B3E]/15 bg-white p-6">
          {visible.length ? (
            <ul
              aria-label={`${selected.label} by week`}
              className="flex w-full items-end gap-3 overflow-x-auto"
            >
              {chronological(visible).map((review) => (
                <li
                  key={review.id}
                  aria-label={`${formatWeekRange(review.weekOf)}: ${review[metric]} ${selected.label}${review.pivotNote ? `. Plan pivot: ${review.pivotNote}` : ''}`}
                  className="group flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-semibold">
                    {review[metric]}
                  </span>
                  <div
                    aria-hidden="true"
                    className="w-full rounded-t-lg bg-[#0A2A92] transition-all group-hover:bg-[#1E4CD2]"
                    style={{ height: `${barHeight(review[metric], max)}px` }}
                  />
                  <span
                    aria-hidden="true"
                    className="whitespace-nowrap text-[10px] text-[#43719A]"
                  >
                    {formatShortDate(review.weekOf)}
                  </span>
                  {review.pivotNote && (
                    <span
                      aria-hidden="true"
                      title={review.pivotNote}
                      className="h-2 w-2 rounded-full bg-[#C05884]"
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-auto text-sm text-[#43719A]">
              No check-ins in this period yet.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 lg:grid-cols-6">
        {totals.map((item) => (
          <button
            type="button"
            key={item.key}
            aria-pressed={metric === item.key}
            onClick={() => setMetric(item.key)}
            className={`rounded-2xl border p-4 text-left ${metric === item.key ? 'border-[#C46F45] bg-[#F4DED2]' : 'border-[#172B3E]/15 bg-white'}`}
          >
            <span className="text-xs text-[#43719A]">{item.label}</span>
            <strong className="mt-2 block text-2xl">{item.value}</strong>
          </button>
        ))}
      </div>
    </section>
  )
}
