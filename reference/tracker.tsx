'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { deleteReview, saveReview, type ActionState, type Review } from './actions'

const metricDefs = [
  ['conversations', 'Conversations', 5],
  ['outreach', 'Warm outreach', 18],
  ['referrals', 'Referral asks', 2],
  ['applications', 'Tailored apps', 5],
  ['practice', 'Practice', 2],
  ['events', 'Events', 1],
] as const
type Metric = (typeof metricDefs)[number][0]

const sameMonth = (value: string, month: string) => value.slice(0, 7) === month

const formatWeekRange = (value: string) => {
  const start = new Date(`${value.slice(0, 10)}T12:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 4)
  const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })
  const monthDay = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const startYear = start.getUTCFullYear()
  const endYear = end.getUTCFullYear()

  if (startYear !== endYear) {
    return `${monthDay.format(start)}, ${startYear}–${monthDay.format(end)}, ${endYear}`
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${monthDay.format(start)}–${monthDay.format(end)}, ${startYear}`
  }
  return `${month.format(start)} ${start.getUTCDate()}–${end.getUTCDate()}, ${startYear}`
}

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${value.slice(0, 10)}T12:00:00.000Z`),
  )

export function Tracker({ reviews: initial, notionUrl: initialNotion, defaultWeek }: { reviews: Review[]; notionUrl: string; defaultWeek: string }) {
  const [state, action, saving] = useActionState<ActionState, FormData>(saveReview, { ok: false, message: '' })
  const [reviews, setReviews] = useState(initial)
  const [editing, setEditing] = useState<Review | null>(null)
  const [metric, setMetric] = useState<Metric>('conversations')
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all')
  const [selectedWeek, setSelectedWeek] = useState(reviews[0]?.weekOf.slice(0, 10) ?? defaultWeek)
  const [selectedMonth, setSelectedMonth] = useState((reviews[0]?.weekOf ?? defaultWeek).slice(0, 7))
  const [formWeek, setFormWeek] = useState(defaultWeek)
  const notionUrl = initialNotion
  const [pending, startTransition] = useTransition()
  const dashboardRef = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const historyRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (state.reviews) {
      setReviews(state.reviews)
      setEditing(null)
    }
  }, [state.reviews])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (!event.altKey || event.ctrlKey || event.metaKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return
      const key = event.key.toLowerCase()
      if (key === 'd') {
        event.preventDefault()
        dashboardRef.current?.focus()
      }
      if (key === 'n') {
        event.preventDefault()
        setEditing(null)
        setFormWeek(defaultWeek)
        requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('[name="weekOf"]')?.focus())
      }
      if (key === 'h') {
        event.preventDefault()
        historyRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [defaultWeek])

  const visible = useMemo(() => reviews.filter((review) => {
    if (period === 'week') return review.weekOf.slice(0, 10) === selectedWeek
    if (period === 'month') return sameMonth(review.weekOf, selectedMonth)
    return true
  }), [period, reviews, selectedMonth, selectedWeek])

  const totals = useMemo(() => metricDefs.map(([key, label, fallback]) => ({
    key,
    label,
    value: visible.reduce((sum, review) => sum + Number(review[key] ?? 0), 0),
    target: visible.reduce((sum, review) => sum + Number(review.targets?.[key] ?? fallback), 0),
  })), [visible])
  const selected = totals.find((item) => item.key === metric)!
  const maxChart = Math.max(1, ...visible.map((review) => Number(review[metric] ?? 0)))
  const formReview = editing ?? reviews.find((review) => review.weekOf.slice(0, 10) === formWeek) ?? null

  const editReview = (review: Review) => {
    setEditing(review)
    setFormWeek(review.weekOf.slice(0, 10))
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('[name="weekOf"]')?.focus())
  }

  const remove = (review: Review) => {
    if (!window.confirm(`Delete the check-in for ${formatWeekRange(review.weekOf)}? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteReview(review.id)
      if (result.reviews) setReviews(result.reviews)
      setEditing(null)
    })
  }

  return (
    <main className="min-h-screen bg-[#E8EEFA] text-[#172B3E]">
      <nav aria-label="Skip links" className="fixed left-4 top-4 z-50 flex -translate-y-24 gap-2 focus-within:translate-y-0">
        <a href="#dashboard" className="rounded-lg bg-[#172B3E] px-3 py-2 text-sm font-bold text-white">Skip to dashboard</a>
        <a href="#weekly-checkin" className="rounded-lg bg-[#172B3E] px-3 py-2 text-sm font-bold text-white">Skip to check-in</a>
      </nav>
      <div className="mx-auto max-w-[1480px] px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex flex-col gap-5 border-b border-[#172B3E]/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#43719A]">Job search operating system</p><h1 className="font-serif text-4xl leading-none tracking-[-0.04em] sm:text-6xl">Stay in motion.</h1></div>
        </header>

        <section ref={dashboardRef} id="dashboard" tabIndex={-1} aria-labelledby="dashboard-heading" className="py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#43719A]">Progress dashboard</p><h2 id="dashboard-heading" className="mt-1 font-serif text-3xl">Read the signal, not the noise.</h2></div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Activity to display" value={metric} onChange={(e) => setMetric(e.target.value as Metric)} className="rounded-xl border border-[#172B3E]/15 bg-white px-3 py-2 text-sm">{metricDefs.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
              <select aria-label="Dashboard time period" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="rounded-xl border border-[#172B3E]/15 bg-white px-3 py-2 text-sm"><option value="all">All time</option><option value="week">By week</option><option value="month">By month</option></select>
              {period === 'week' && <input aria-label="Dashboard week" type="date" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="rounded-xl border border-[#172B3E]/15 bg-white px-3 py-2 text-sm" />}
              {period === 'month' && <input aria-label="Dashboard month" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-xl border border-[#172B3E]/15 bg-white px-3 py-2 text-sm" />}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-[28px] bg-[#172B3E] p-7 text-white"><p className="text-sm text-[#B3C7F0]">{selected.label}</p><p className="mt-2 text-6xl font-semibold tracking-[-0.06em]">{selected.value}</p><p className="mt-3 text-sm text-[#C7DBEF]">{selected.target ? Math.round((selected.value / selected.target) * 100) : 0}% of {selected.target} planned</p><div role="progressbar" aria-label={`${selected.label} progress`} aria-valuemin={0} aria-valuemax={Math.max(1, selected.target, selected.value)} aria-valuenow={selected.value} className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#8CB7DF]" style={{ width: `${Math.min(100, selected.target ? selected.value / selected.target * 100 : 0)}%` }} /></div></div>
            <div role="list" aria-label={`${selected.label} by week`} className="flex min-h-52 items-end gap-3 overflow-x-auto rounded-[28px] border border-[#172B3E]/15 bg-white p-6">
              {visible.length ? [...visible].reverse().map((review) => <div role="listitem" aria-label={`${formatWeekRange(review.weekOf)}: ${review[metric] ?? 0} ${selected.label}${review.pivotNote ? `. Plan pivot: ${review.pivotNote}` : ''}`} key={review.id} className="group flex min-w-12 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold">{review[metric]}</span><div aria-hidden="true" className="w-full rounded-t-lg bg-[#0A2A92] transition-all group-hover:bg-[#1E4CD2]" style={{ height: `${Math.max(8, Number(review[metric]) / maxChart * 130)}px` }} /><span aria-hidden="true" className="whitespace-nowrap text-[10px] text-[#43719A]">{formatShortDate(review.weekOf)}</span>{review.pivotNote && <span aria-hidden="true" title={review.pivotNote} className="h-2 w-2 rounded-full bg-[#C05884]" />}</div>) : <p className="m-auto text-sm text-[#43719A]">No check-ins in this period yet.</p>}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 lg:grid-cols-6">{totals.map((item) => item.key === 'applications' ? <div key={item.key} className={`rounded-2xl border p-4 ${metric === item.key ? 'border-[#C46F45] bg-[#F4DED2]' : 'border-[#172B3E]/15 bg-white'}`}><button type="button" aria-pressed={metric === item.key} onClick={() => setMetric(item.key)} className="w-full text-left"><span className="text-xs text-[#43719A]">{item.label}</span><strong className="mt-2 block text-2xl">{item.value}</strong></button>{notionUrl ? <div className="mt-3 border-t border-[#172B3E]/10 pt-3"><a href={notionUrl} target="_blank" rel="noreferrer" aria-label="Open application tracker in Notion, opens in a new tab" className="text-xs font-bold text-[#0A2A92] underline">Open application tracker <span aria-hidden="true">↗</span></a></div> : null}</div> : <button type="button" aria-pressed={metric === item.key} key={item.key} onClick={() => setMetric(item.key)} className={`rounded-2xl border p-4 text-left ${metric === item.key ? 'border-[#C46F45] bg-[#F4DED2]' : 'border-[#172B3E]/15 bg-white'}`}><span className="text-xs text-[#43719A]">{item.label}</span><strong className="mt-2 block text-2xl">{item.value}</strong></button>)}</div>
        </section>

        <section className="grid gap-6 py-4 lg:grid-cols-[1.1fr_0.9fr]">
          <form ref={formRef} id="weekly-checkin" aria-labelledby="checkin-heading" aria-busy={saving} key={`${formReview?.id ?? 'new'}-${formWeek}`} action={action} className="rounded-[28px] border border-[#172B3E]/15 bg-white p-6 sm:p-8">
            <input type="hidden" name="id" value={formReview?.id ?? ''} />
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#43719A]">{formReview ? 'Edit weekly check-in' : 'New weekly check-in'}</p><h2 id="checkin-heading" className="mt-2 font-serif text-3xl">Log, learn, adjust.</h2></div>{editing && <button type="button" onClick={() => setEditing(null)} className="text-sm font-semibold underline">Cancel</button>}</div>
            <label className="mt-6 block text-sm font-semibold">Week of<input name="weekOf" type="date" value={formWeek} onChange={(event) => { setEditing(null); setFormWeek(event.target.value) }} className="ml-3 rounded-xl border border-[#172B3E]/20 bg-[#E8EEFA] px-3 py-2 font-normal" /></label>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">{metricDefs.map(([key, label]) => <label key={key} className="text-sm text-[#2D4E6C]">{label}<input name={key} type="number" min="0" defaultValue={formReview?.[key] ?? 0} className="mt-2 w-full rounded-xl border border-[#172B3E]/15 bg-[#EDEFF0] px-4 py-3 text-lg font-semibold text-[#172B3E]" /></label>)}<label className="text-sm text-[#2D4E6C]">Hours<input name="hours" type="number" min="0" max="60" defaultValue={formReview?.hours ?? 0} className="mt-2 w-full rounded-xl border border-[#172B3E]/15 bg-[#EDEFF0] px-4 py-3 text-lg font-semibold text-[#172B3E]" /></label></div>
            <details className="mt-5 rounded-2xl bg-[#B3C7F0] p-4"><summary className="cursor-pointer text-sm font-bold">Adjust this week’s plan targets</summary><div className="mt-4 grid grid-cols-6 gap-2">{metricDefs.map(([key, label, fallback]) => <label key={key} className="flex min-w-0 flex-col text-xs text-[#2D4E6C]"><span className="flex min-h-8 items-end hyphens-auto break-words">{key === 'conversations' ? 'Conver­sations' : label}</span><input name={`target-${key}`} type="number" min="0" defaultValue={formReview?.targets?.[key] ?? fallback} className="mt-1 min-w-0 w-full rounded-lg border border-[#172B3E]/15 bg-white px-2 py-2 text-sm font-bold" /></label>)}</div><label className="mt-4 block text-sm text-[#2D4E6C]">Why did the plan pivot?<textarea name="pivotNote" defaultValue={formReview?.pivotNote ?? ''} placeholder="Optional — this creates a pink marker on the chart" className="mt-2 min-h-20 w-full rounded-xl border border-[#172B3E]/15 bg-white p-3" /></label></details>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm text-[#2D4E6C]">Biggest win<textarea name="win" defaultValue={formReview?.win ?? ''} className="mt-2 min-h-20 w-full rounded-xl border border-[#172B3E]/15 bg-[#EDEFF0] p-3" /></label><label className="text-sm text-[#2D4E6C]">Next focus<textarea name="nextFocus" defaultValue={formReview?.nextFocus ?? ''} className="mt-2 min-h-20 w-full rounded-xl border border-[#172B3E]/15 bg-[#EDEFF0] p-3" /></label></div>
            <div className="mt-5 flex flex-wrap gap-3"><label><span className="sr-only">Energy level</span><select name="health" defaultValue={formReview?.health ?? 'steady'} className="rounded-xl border border-[#172B3E]/15 bg-[#EDEFF0] px-4 py-3 text-sm"><option value="low">Running low</option><option value="steady">Energy steady</option><option value="energized">Energized</option></select></label><button type="submit" disabled={saving} className="rounded-xl bg-[#0A2A92] px-5 py-3 text-sm font-bold text-white">{saving ? 'Saving…' : formReview ? 'Update check-in' : 'Add check-in'}</button>{state.message && <span role="status" aria-live="polite" className="self-center text-sm text-[#2D4E6C]">{state.message}</span>}</div>
          </form>
          <aside ref={historyRef} id="checkin-history" tabIndex={-1} aria-labelledby="history-heading" className="rounded-[28px] bg-[#C7DBEF] p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2D4E6C]">Check-in history</p><h2 id="history-heading" className="mt-2 font-serif text-3xl">Weeks at a glance.</h2><div className="mt-5 max-h-[620px] space-y-3 overflow-y-auto pr-1">{reviews.length ? reviews.map((review) => <article aria-label={`Check-in for ${formatWeekRange(review.weekOf)}`} key={review.id} className="rounded-2xl bg-white/75 p-4"><div className="flex items-start justify-between gap-3"><strong>{formatWeekRange(review.weekOf)}</strong><div className="flex gap-3"><button type="button" aria-label={`Edit check-in for ${formatWeekRange(review.weekOf)}`} onClick={() => editReview(review)} className="text-xs font-bold underline">Edit</button><button type="button" aria-label={`Delete check-in for ${formatWeekRange(review.weekOf)}`} onClick={() => remove(review)} disabled={pending} className="text-xs font-bold text-[#8E3F60] underline">Delete</button></div></div><div className="mt-4 grid grid-cols-4 gap-2">{metricDefs.map(([key, label]) => <div key={key} className="rounded-lg bg-white/80 px-2 py-2"><span className="block text-[10px] leading-tight text-[#43719A]">{label}</span><strong className="mt-1 block text-lg">{review[key] ?? 0}</strong></div>)}<div className="rounded-lg bg-white/80 px-2 py-2"><span className="block text-[10px] leading-tight text-[#43719A]">Hours</span><strong className="mt-1 block text-lg">{review.hours ?? 0}</strong></div><div className="rounded-lg bg-white/80 px-2 py-2"><span className="block text-[10px] leading-tight text-[#43719A]">Energy</span><strong className="mt-1 block text-sm capitalize">{review.health}</strong></div></div><div className="mt-4 grid gap-3 border-t border-[#172B3E]/10 pt-4 sm:grid-cols-2"><div><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#43719A]">Biggest win</span><p className="mt-1 text-xs leading-5 text-[#2D4E6C]">{review.win || '—'}</p></div><div><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#43719A]">Next focus</span><p className="mt-1 text-xs leading-5 text-[#2D4E6C]">{review.nextFocus || '—'}</p></div></div>{review.pivotNote && <p className="mt-3 rounded-lg bg-[#E9B8C9] px-3 py-2 text-xs text-[#5B263C]"><strong>Plan pivot:</strong> {review.pivotNote}</p>}</article>) : <p className="text-sm text-[#2D4E6C]">Your saved weekly reviews will appear here.</p>}</div></aside>
        </section>
      </div>
    </main>
  )
}
