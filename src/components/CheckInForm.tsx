import {
  HEALTH_OPTIONS,
  MAX_HOURS,
  MAX_TEXT_LENGTH,
  METRICS,
  type Review,
} from '../lib/review'
import { targetFieldName } from '../lib/validation'

const countInputClass =
  'mt-2 w-full rounded-xl border border-[#172B3E]/15 bg-[#EDEFF0] px-4 py-3 text-lg font-semibold text-[#172B3E]'
const textareaClass =
  'mt-2 min-h-20 w-full rounded-xl border border-[#172B3E]/15 bg-[#EDEFF0] p-3'

type Props = {
  /** The check-in being edited, or null for a new one. */
  review: Review | null
  week: string
  onWeekChange: (week: string) => void
  /** True when the user opened this check-in via Edit (shows Cancel). */
  isEditing: boolean
  onCancel: () => void
  action: (formData: FormData) => void
  saving: boolean
  status: string
}

export function CheckInForm({
  review,
  week,
  onWeekChange,
  isEditing,
  onCancel,
  action,
  saving,
  status,
}: Props) {
  return (
    <form
      id="weekly-checkin"
      aria-labelledby="checkin-heading"
      aria-busy={saving}
      action={action}
      className="rounded-[28px] border border-[#172B3E]/15 bg-white p-6 sm:p-8"
    >
      <input type="hidden" name="id" value={review?.id ?? ''} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#43719A]">
            {review ? 'Edit weekly check-in' : 'New weekly check-in'}
          </p>
          <h2 id="checkin-heading" className="mt-2 font-serif text-3xl">
            Log, learn, adjust.
          </h2>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold underline"
          >
            Cancel
          </button>
        )}
      </div>

      <label className="mt-6 block text-sm font-semibold">
        Week of
        <input
          name="weekOf"
          type="date"
          required
          value={week}
          onChange={(e) => onWeekChange(e.target.value)}
          className="ml-3 rounded-xl border border-[#172B3E]/20 bg-[#E8EEFA] px-3 py-2 font-normal"
        />
      </label>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {METRICS.map(({ key, label }) => (
          <label key={key} className="text-sm text-[#2D4E6C]">
            {label}
            <input
              name={key}
              type="number"
              min="0"
              defaultValue={review?.[key] ?? 0}
              className={countInputClass}
            />
          </label>
        ))}
        <label className="text-sm text-[#2D4E6C]">
          Hours
          <input
            name="hours"
            type="number"
            min="0"
            max={MAX_HOURS}
            defaultValue={review?.hours ?? 0}
            className={countInputClass}
          />
        </label>
      </div>

      <details className="mt-5 rounded-2xl bg-[#B3C7F0] p-4">
        <summary className="cursor-pointer text-sm font-bold">
          Adjust this week’s plan targets
        </summary>
        <div className="mt-4 grid grid-cols-6 gap-2">
          {METRICS.map(({ key, label, defaultTarget }) => (
            <label
              key={key}
              className="flex min-w-0 flex-col text-xs text-[#2D4E6C]"
            >
              <span className="flex min-h-8 items-end hyphens-auto break-words">
                {key === 'conversations' ? 'Conver­sations' : label}
              </span>
              <input
                name={targetFieldName(key)}
                type="number"
                min="0"
                defaultValue={review?.targets[key] ?? defaultTarget}
                className="mt-1 w-full min-w-0 rounded-lg border border-[#172B3E]/15 bg-white px-2 py-2 text-sm font-bold"
              />
            </label>
          ))}
        </div>
        <label className="mt-4 block text-sm text-[#2D4E6C]">
          Why did the plan pivot?
          <textarea
            name="pivotNote"
            maxLength={MAX_TEXT_LENGTH}
            defaultValue={review?.pivotNote ?? ''}
            placeholder="Optional — this creates a pink marker on the chart"
            className="mt-2 min-h-20 w-full rounded-xl border border-[#172B3E]/15 bg-white p-3"
          />
        </label>
      </details>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-[#2D4E6C]">
          Biggest win
          <textarea
            name="win"
            maxLength={MAX_TEXT_LENGTH}
            defaultValue={review?.win ?? ''}
            className={textareaClass}
          />
        </label>
        <label className="text-sm text-[#2D4E6C]">
          Next focus
          <textarea
            name="nextFocus"
            maxLength={MAX_TEXT_LENGTH}
            defaultValue={review?.nextFocus ?? ''}
            className={textareaClass}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <label>
          <span className="sr-only">Energy level</span>
          <select
            name="health"
            defaultValue={review?.health ?? 'steady'}
            className="rounded-xl border border-[#172B3E]/15 bg-[#EDEFF0] px-4 py-3 text-sm"
          >
            {HEALTH_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#0A2A92] px-5 py-3 text-sm font-bold text-white"
        >
          {saving ? 'Saving…' : review ? 'Update check-in' : 'Add check-in'}
        </button>
        <span
          role="status"
          aria-live="polite"
          className="self-center text-sm text-[#2D4E6C]"
        >
          {status}
        </span>
      </div>
    </form>
  )
}
