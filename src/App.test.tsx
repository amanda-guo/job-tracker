// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
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

describe('Actions on Home', () => {
  const sheets = [
    ['Log an update', 'Logging updates is coming soon.'],
    ['Add an opportunity', 'Adding opportunities is coming soon.'],
  ]

  const openSheet = (buttonName: string) => {
    const button = screen.getByRole('button', { name: buttonName })
    fireEvent.click(button)
    return { button, dialog: screen.getByRole('dialog', { name: buttonName }) }
  }

  const pressEscape = () =>
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    })

  it('shows "Log an update" then "Add an opportunity", and no other buttons', () => {
    renderAt('/')
    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Log an update', 'Add an opportunity'])
  })

  it.each(['/opportunities', '/opportunities/unknown-id', '/nope'])(
    'are not shown on %s',
    (address) => {
      renderAt(address)
      expect(screen.queryByRole('button', { name: 'Log an update' })).toBeNull()
      expect(
        screen.queryByRole('button', { name: 'Add an opportunity' }),
      ).toBeNull()
    },
  )

  it.each(sheets)(
    '"%s" opens a sheet titled with what it does',
    (buttonName, placeholder) => {
      renderAt('/')
      expect(screen.queryByRole('dialog')).toBeNull()
      const { dialog } = openSheet(buttonName)
      expect(
        within(dialog).getByRole('heading', { name: buttonName }),
      ).toBeTruthy()
      expect(within(dialog).getByText(placeholder)).toBeTruthy()
    },
  )

  it.each(sheets)('"%s" moves focus into the sheet', (buttonName) => {
    renderAt('/')
    const { dialog } = openSheet(buttonName)
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it.each(sheets)(
    '"%s": Escape closes the sheet and focus returns to the button',
    (buttonName) => {
      renderAt('/')
      const { button } = openSheet(buttonName)
      pressEscape()
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(button)
    },
  )

  it.each(sheets)(
    '"%s": "Close" closes the sheet and focus returns to the button',
    (buttonName) => {
      renderAt('/')
      const { button, dialog } = openSheet(buttonName)
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(button)
    },
  )

  it('blocks the screen behind while open, and frees it after', () => {
    renderAt('/')
    const heading = pageHeading("This week's focus")
    const { dialog } = openSheet('Log an update')

    // jsdom doesn't enforce `inert`; browsers do. This checks it's applied.
    expect(heading.closest('[inert]')).not.toBeNull()
    expect(dialog.closest('[inert]')).toBeNull()
    expect(document.documentElement.style.overflow).toBe('hidden')

    pressEscape()
    expect(document.querySelector('[inert]')).toBeNull()
    expect(document.documentElement.style.overflow).toBe('')
  })
})
