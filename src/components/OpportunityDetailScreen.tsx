import { Link, useLocation, useNavigate } from 'react-router'

const linkClass =
  'inline-flex min-h-11 items-center text-accent-ink underline underline-offset-4'

export function OpportunityDetailScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  // React Router gives the first page of a visit the key "default", so any
  // other key means the user got here from another screen in the app.
  const cameFromApp = location.key !== 'default'

  // No opportunities exist yet (slice 3), so every id is unknown for now.
  return (
    <main className="page-column">
      <Link
        to="/"
        className={linkClass}
        onClick={(event) => {
          if (cameFromApp) {
            event.preventDefault()
            navigate(-1)
          }
        }}
      >
        <span aria-hidden="true">←&nbsp;</span>Back
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-ink">
        Opportunity not found
      </h1>

      <p className="mt-6 text-muted">
        We couldn't find that opportunity. It may have been deleted.
      </p>

      <Link to="/" className={`mt-2 ${linkClass}`}>
        Go to this week
      </Link>
    </main>
  )
}
