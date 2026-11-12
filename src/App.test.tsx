// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

/** Render the app as if the user had visited `entries` in order. */
function renderAt(...entries: string[]) {
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <App />
    </MemoryRouter>,
  )
}

const pageHeading = (name: string) =>
  screen.getByRole('heading', { level: 1, name })

const click = (linkName: string) =>
  fireEvent.click(screen.getByRole('link', { name: linkName }))

beforeEach(() => {
  // Wednesday Nov 11, 2026: the week starts Monday Nov 9.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 11, 9))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Home (/)', () => {
  it("shows this week's focus, headed by the current week", () => {
    renderAt('/')
    expect(pageHeading("This week's focus")).toBeTruthy()
    expect(screen.getByText('Week of Nov 9')).toBeTruthy()
  })

  it('shows the empty state when there is nothing to focus on', () => {
    renderAt('/')
    expect(
      screen.getByText(
        'Nothing to focus on yet. Add an opportunity to get started.',
      ),
    ).toBeTruthy()
  })

  it('hides "Worth a follow-up" when nothing needs a follow-up', () => {
    renderAt('/')
    expect(screen.queryByText(/Worth a follow-up/)).toBeNull()
  })

  it('"See all opportunities" goes to All opportunities', () => {
    renderAt('/')
    click('See all opportunities')
    expect(pageHeading('All opportunities')).toBeTruthy()
  })
})

describe('All opportunities (/opportunities)', () => {
  it('shows the empty state', () => {
    renderAt('/opportunities')
    expect(pageHeading('All opportunities')).toBeTruthy()
    expect(screen.getByText('No opportunities yet.')).toBeTruthy()
  })

  it('"← This week" goes to Home', () => {
    renderAt('/opportunities')
    click('This week') // the arrow is decorative, hidden from screen readers
    expect(pageHeading("This week's focus")).toBeTruthy()
  })
})

describe('Opportunity detail (/opportunities/:id)', () => {
  it('explains when the opportunity cannot be found', () => {
    renderAt('/opportunities/unknown-id')
    expect(pageHeading('Opportunity not found')).toBeTruthy()
    expect(
      screen.getByText(
        "We couldn't find that opportunity. It may have been deleted.",
      ),
    ).toBeTruthy()
  })

  it('"Go to this week" goes to Home', () => {
    renderAt('/opportunities/unknown-id')
    click('Go to this week')
    expect(pageHeading("This week's focus")).toBeTruthy()
  })

  it('"← Back" returns to the previous screen', () => {
    renderAt('/opportunities', '/opportunities/unknown-id')
    click('Back')
    expect(pageHeading('All opportunities')).toBeTruthy()
  })

  it('"← Back" goes to Home when the detail was opened directly', () => {
    renderAt('/opportunities/unknown-id')
    click('Back')
    expect(pageHeading("This week's focus")).toBeTruthy()
  })
})

describe('Any other address', () => {
  it.each(['/nope', '/opportunities/abc/edit'])(
    '%s shows the not-found screen with a link to Home',
    (address) => {
      renderAt(address)
      expect(pageHeading('Page not found')).toBeTruthy()
      click('Go to this week')
      expect(pageHeading("This week's focus")).toBeTruthy()
    },
  )
})
