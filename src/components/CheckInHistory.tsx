import { formatWeekRange } from '../lib/dashboard'
import { METRICS, type Review } from '../lib/review'

type Props = {
  reviews: Review[]
  onEdit: (review: Review) => void
  onDelete: (review: Review) => void
  deleting: boolean
  status: string
}

function Stat({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-white/80 px-2 py-2">
      <span className="block text-[10px] leading-tight text-[#43719A]">
        {label}
      </span>
      {children}
    </div>
  )
}

function Note({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#43719A]">
        {label}
      </span>
      <p className="mt-1 text-xs leading-5 text-[#2D4E6C]">{text || '—'}</p>
    </div>
  )
}

export function CheckInHistory({
  reviews,
  onEdit,
  onDelete,
  deleting,
  status,
}: Props) {
  return (
    <aside
      id="checkin-history"
      tabIndex={-1}
      aria-labelledby="history-heading"
      className="rounded-[28px] bg-[#C7DBEF] p-6 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2D4E6C]">
        Check-in history
      </p>
      <h2 id="history-heading" className="mt-2 font-serif text-3xl">
        Weeks at a glance.
      </h2>
      <p
        role="status"
        aria-live="polite"
        className="mt-2 text-sm text-[#2D4E6C]"
      >
        {status}
      </p>
      <div className="mt-3 max-h-[620px] space-y-3 overflow-y-auto pr-1">
        {reviews.length ? (
          reviews.map((review) => {
            const range = formatWeekRange(review.weekOf)
            return (
              <article
                key={review.id}
                aria-label={`Check-in for ${range}`}
                className="rounded-2xl bg-white/75 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <strong>{range}</strong>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      aria-label={`Edit check-in for ${range}`}
                      onClick={() => onEdit(review)}
                      className="text-xs font-bold underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete check-in for ${range}`}
                      onClick={() => onDelete(review)}
                      disabled={deleting}
                      className="text-xs font-bold text-[#8E3F60] underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {METRICS.map(({ key, label }) => (
                    <Stat key={key} label={label}>
                      <strong className="mt-1 block text-lg">
                        {review[key]}
                      </strong>
                    </Stat>
                  ))}
                  <Stat label="Hours">
                    <strong className="mt-1 block text-lg">
                      {review.hours}
                    </strong>
                  </Stat>
                  <Stat label="Energy">
                    <strong className="mt-1 block text-sm capitalize">
                      {review.health}
                    </strong>
                  </Stat>
                </div>
                <div className="mt-4 grid gap-3 border-t border-[#172B3E]/10 pt-4 sm:grid-cols-2">
                  <Note label="Biggest win" text={review.win} />
                  <Note label="Next focus" text={review.nextFocus} />
                </div>
                {review.pivotNote && (
                  <p className="mt-3 rounded-lg bg-[#E9B8C9] px-3 py-2 text-xs text-[#5B263C]">
                    <strong>Plan pivot:</strong> {review.pivotNote}
                  </p>
                )}
              </article>
            )
          })
        ) : (
          <p className="text-sm text-[#2D4E6C]">
            Your saved weekly reviews will appear here.
          </p>
        )}
      </div>
    </aside>
  )
}
