import { Link } from 'react-router'
import { weekLabel } from '../lib/dates'

export function HomeScreen() {
  return (
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
    </main>
  )
}
