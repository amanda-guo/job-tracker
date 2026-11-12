import { type MouseEvent, useState } from 'react'
import { Link } from 'react-router'
import { weekLabel } from '../lib/dates'
import { Sheet } from './Sheet'

type Action = 'log-update' | 'add-opportunity'

const sheets: Record<Action, { title: string; placeholder: string }> = {
  'log-update': {
    title: 'Log an update',
    placeholder: 'Logging updates is coming soon.',
  },
  'add-opportunity': {
    title: 'Add an opportunity',
    placeholder: 'Adding opportunities is coming soon.',
  },
}

export function HomeScreen() {
  const [open, setOpen] = useState<{
    action: Action
    opener: HTMLElement
  } | null>(null)

  const openSheet =
    (action: Action) => (event: MouseEvent<HTMLButtonElement>) =>
      setOpen({ action, opener: event.currentTarget })

  return (
    <>
      <main className="page-column">
        <h1 className="text-2xl font-semibold text-ink">This week's focus</h1>
        <p className="mt-1 text-muted">{weekLabel()}</p>

        {/* Top 3 by priority (slice 8). "Worth a follow-up" will appear
            below it only when something needs a follow-up. */}
        <p className="mt-6 rounded-xl border border-border bg-surface p-4 text-muted">
          Nothing to focus on yet. Add an opportunity to get started.
        </p>

        <Link
          to="/opportunities"
          className="mt-4 inline-flex min-h-11 items-center text-accent-ink underline underline-offset-4"
        >
          See all opportunities
        </Link>

        {/* Room to scroll past the pinned actions (two 48px buttons, gap
            and padding), plus the phone's home indicator. */}
        <div
          aria-hidden="true"
          className="h-[calc(8.5rem+env(safe-area-inset-bottom))]"
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-canvas">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-2 pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
          <button
            type="button"
            onClick={openSheet('log-update')}
            className="min-h-12 rounded-xl bg-accent px-4 font-semibold text-on-accent"
          >
            Log an update
          </button>
          <button
            type="button"
            onClick={openSheet('add-opportunity')}
            className="min-h-12 rounded-xl border border-accent-ink bg-surface px-4 font-semibold text-accent-ink"
          >
            Add an opportunity
          </button>
        </div>
      </div>

      {open && (
        <Sheet
          title={sheets[open.action].title}
          onClose={() => setOpen(null)}
          returnFocusTo={open.opener}
        >
          <p className="text-muted">{sheets[open.action].placeholder}</p>
        </Sheet>
      )}
    </>
  )
}
