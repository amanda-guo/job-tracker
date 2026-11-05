import { useActionState, useEffect, useState, useTransition } from 'react'
import { currentWeekStart, formatWeekRange } from '../lib/dashboard'
import type { Review } from '../lib/review'
import type { ReviewStore } from '../lib/storage'
import { parseReviewInput, reviewFieldsFromForm } from '../lib/validation'
import { CheckInForm } from './CheckInForm'
import { CheckInHistory } from './CheckInHistory'
import { Dashboard } from './Dashboard'

const focusById = (id: string) => document.getElementById(id)?.focus()

const focusWeekInput = () =>
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLInputElement>('#weekly-checkin [name="weekOf"]')
      ?.focus(),
  )

const skipLinkClass =
  'rounded-lg bg-[#172B3E] px-3 py-2 text-sm font-bold text-white'

export function Tracker({ store }: { store: ReviewStore }) {
  const [defaultWeek] = useState(currentWeekStart)
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editing, setEditing] = useState<Review | null>(null)
  const [formWeek, setFormWeek] = useState(defaultWeek)
  const [historyStatus, setHistoryStatus] = useState('')
  const [deleting, startDelete] = useTransition()

  useEffect(() => {
    let active = true
    store.list().then(
      (list) => {
        if (active) setReviews(list)
      },
      () => {
        if (active) {
          setReviews([])
          setLoadFailed(true)
        }
      },
    )
    return () => {
      active = false
    }
  }, [store])

  const [formStatus, formAction, saving] = useActionState(
    async (_previous: string, formData: FormData) => {
      const parsed = parseReviewInput(reviewFieldsFromForm(formData))
      if (!parsed.ok) return parsed.message
      const id = formData.get('id')
      const result = await store.save(
        parsed.value,
        typeof id === 'string' && id ? id : undefined,
      )
      if (!result.ok) return result.message
      setReviews(await store.list())
      setEditing(null)
      setHistoryStatus('')
      return result.created ? 'Check-in saved.' : 'Check-in updated.'
    },
    '',
  )

  // Keyboard shortcuts: Alt+D dashboard, Alt+N new check-in, Alt+H history.
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
        target.isContentEditable
      ) {
        return
      }
      // Use the physical key: on macOS, Option+letter changes event.key.
      const key = event.code.replace(/^Key/, '').toLowerCase()
      if (key === 'd') {
        event.preventDefault()
        focusById('dashboard')
      } else if (key === 'n') {
        event.preventDefault()
        setEditing(null)
        setFormWeek(defaultWeek)
        focusWeekInput()
      } else if (key === 'h') {
        event.preventDefault()
        focusById('checkin-history')
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [defaultWeek])

  if (reviews === null) {
    return (
      <main className="min-h-screen bg-[#E8EEFA] p-8 text-[#172B3E]">
        <p>Loading check-ins…</p>
      </main>
    )
  }

  const formReview =
    editing ?? reviews.find((review) => review.weekOf === formWeek) ?? null

  const editReview = (review: Review) => {
    setEditing(review)
    setFormWeek(review.weekOf)
    focusWeekInput()
  }

  const deleteReview = (review: Review) => {
    const range = formatWeekRange(review.weekOf)
    if (
      !window.confirm(
        `Delete the check-in for ${range}? This cannot be undone.`,
      )
    ) {
      return
    }
    startDelete(async () => {
      try {
        await store.remove(review.id)
        const list = await store.list()
        setReviews(list)
        setEditing(null)
        setHistoryStatus(`Deleted the check-in for ${range}.`)
      } catch {
        setHistoryStatus('Could not delete that check-in. Please try again.')
      }
    })
  }

  return (
    <main className="min-h-screen bg-[#E8EEFA] text-[#172B3E]">
      <nav
        aria-label="Skip links"
        className="fixed top-4 left-4 z-50 flex -translate-y-24 gap-2 focus-within:translate-y-0"
      >
        <a href="#dashboard" className={skipLinkClass}>
          Skip to dashboard
        </a>
        <a href="#weekly-checkin" className={skipLinkClass}>
          Skip to check-in
        </a>
      </nav>
      <div className="mx-auto max-w-[1480px] px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex flex-col gap-5 border-b border-[#172B3E]/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#43719A]">
              Job search operating system
            </p>
            <h1 className="font-serif text-4xl leading-none tracking-[-0.04em] sm:text-6xl">
              Stay in motion.
            </h1>
          </div>
        </header>

        {loadFailed && (
          <p role="alert" className="mt-4 rounded-xl bg-[#E9B8C9] p-3 text-sm">
            Saved check-ins could not be loaded.
          </p>
        )}

        <Dashboard reviews={reviews} defaultWeek={defaultWeek} />

        <section className="grid gap-6 py-4 lg:grid-cols-[1.1fr_0.9fr]">
          <CheckInForm
            key={`${formReview?.id ?? 'new'}-${formWeek}`}
            review={formReview}
            week={formWeek}
            onWeekChange={(week) => {
              setEditing(null)
              setFormWeek(week)
            }}
            isEditing={editing !== null}
            onCancel={() => setEditing(null)}
            action={formAction}
            saving={saving}
            status={formStatus}
          />
          <CheckInHistory
            reviews={reviews}
            onEdit={editReview}
            onDelete={deleteReview}
            deleting={deleting}
            status={historyStatus}
          />
        </section>
      </div>
    </main>
  )
}
