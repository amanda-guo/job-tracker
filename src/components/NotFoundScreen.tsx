import { Link } from 'react-router'

export function NotFoundScreen() {
  return (
    <main className="page-column">
      <h1 className="text-2xl font-semibold text-ink">Page not found</h1>

      <p className="mt-6 text-muted">We couldn't find that page.</p>

      <Link
        to="/"
        className="mt-2 inline-flex min-h-11 items-center text-accent-ink underline underline-offset-4"
      >
        Go to this week
      </Link>
    </main>
  )
}
