import { Link } from 'react-router'

export function AllOpportunitiesScreen() {
  return (
    <main className="page-column">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center text-accent-ink underline underline-offset-4"
      >
        <span aria-hidden="true">←&nbsp;</span>This week
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-ink">
        All opportunities
      </h1>

      <p className="mt-6 rounded-xl border border-border bg-surface p-4 text-muted">
        No opportunities yet.
      </p>
    </main>
  )
}
