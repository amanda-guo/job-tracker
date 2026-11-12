import { type ReactNode, useEffect, useEffectEvent, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

type SheetProps = {
  /** Says what the sheet does, e.g. "Log an update". Also its accessible name. */
  title: string
  onClose: () => void
  /** Gets focus back when the sheet closes, usually the button that opened it. */
  returnFocusTo: HTMLElement | null
  children: ReactNode
}

/**
 * A modal sheet over the current screen. Render it only while open.
 * While open: everything behind is inert and the page can't scroll.
 * Escape or "Close" closes it, and focus returns to `returnFocusTo`.
 */
export function Sheet({ title, onClose, returnFocusTo, children }: SheetProps) {
  const titleId = useId()
  const layerRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const close = useEffectEvent(onClose)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    // Block the screen behind: no taps, clicks or tabbing into it.
    const behind = [...document.body.children].filter(
      (element) => element !== layer && !element.hasAttribute('inert'),
    )
    for (const element of behind) element.setAttribute('inert', '')

    // Stop the page behind from scrolling.
    const html = document.documentElement
    const previousOverflow = html.style.overflow
    html.style.overflow = 'hidden'

    dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      html.style.overflow = previousOverflow
      // Un-inert first: an inert element can't take focus.
      for (const element of behind) element.removeAttribute('inert')
      returnFocusTo?.focus()
    }
  }, [returnFocusTo])

  return createPortal(
    <div
      ref={layerRef}
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl bg-surface px-[max(1rem,env(safe-area-inset-left))] pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-border px-4 text-accent-ink"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
