// Changing an opportunity by adding, editing or removing dated events.
// Rules: docs/product.md, "Data rules". Nothing here reads the clock:
// `today` (`YYYY-MM-DD`) is always passed in.

import {
  type ClosedReason,
  currentState,
  type OfferType,
  type Opportunity,
  type OpportunityEvent,
  REFERRAL_LABELS,
  type Referral,
  STAGE_LABELS,
  type Stage,
} from './opportunity'

export type ChangeResult =
  | { ok: true; opportunity: Opportunity }
  | { ok: false; message: string }

// ---------------------------------------------------------------------------
// Dates and messages

export const DATE_MESSAGE = 'Use a real date, like 2026-11-30.'
const MISSING_EVENT_MESSAGE = "That event isn't in the history anymore."

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** A real calendar date written as `YYYY-MM-DD`. No clock, no time zone. */
export function isDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number)
  if (month < 1 || month > 12 || day < 1) return false
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInMonth = [
    31,
    leap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]
}

/** "Nov 3", or "Dec 28, 2025" when not in the same year as `today`. */
function formatDate(date: string, today: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const short = `${MONTHS[month - 1]} ${day}`
  return date.slice(0, 4) === today.slice(0, 4) ? short : `${short}, ${year}`
}

/** An event in plain words, as in "the date it moved to Applied". */
function describe(event: OpportunityEvent): string {
  switch (event.type) {
    case 'stage':
      return `the date it moved to ${STAGE_LABELS[event.stage]}`
    case 'referral':
      return `the date the referral changed to ${REFERRAL_LABELS[event.referral]}`
    case 'take-home-submitted':
      return 'the date the take-home was submitted'
    case 'offer-written':
      return 'the date the offer became written'
    case 'followed-up':
      return 'the date you followed up'
    case 'got-response':
      return 'the date you got a response'
  }
}

function beforeMessage(event: OpportunityEvent, today: string): string {
  const date = formatDate(event.date, today)
  return `This is before ${describe(event)} (${date}). Choose ${date} or later.`
}

function afterMessage(event: OpportunityEvent, today: string): string {
  const date = formatDate(event.date, today)
  return `This is after ${describe(event)} (${date}). Choose ${date} or earlier.`
}

/** Null when `date` is a real date no later than today; otherwise why not. */
export function checkEventDate(date: string, today: string): string | null {
  if (!isDate(date)) return DATE_MESSAGE
  if (date > today) {
    const shown = formatDate(today, today)
    return `This is after today (${shown}). Choose ${shown} or earlier.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Adding events

const refuse = (message: string): ChangeResult => ({ ok: false, message })

const withHistory = (
  opportunity: Opportunity,
  history: OpportunityEvent[],
): ChangeResult => ({ ok: true, opportunity: { ...opportunity, history } })

/**
 * Adds an event after everything else. Used for events that depend on the
 * current stage (stage changes, take-home submitted, offer written), so a
 * backdated one is refused rather than slotted into the past.
 */
function append(
  opportunity: Opportunity,
  event: OpportunityEvent,
  today: string,
): ChangeResult {
  const problem = checkEventDate(event.date, today)
  if (problem) return refuse(problem)
  const latest = opportunity.history.at(-1)
  if (latest && event.date < latest.date)
    return refuse(beforeMessage(latest, today))
  return withHistory(opportunity, [...opportunity.history, event])
}

/**
 * Where an event dated `date` goes: after every event on or before that
 * date. Used for follow-ups, responses and referral changes, so catching up
 * on older ones is fine. Null (with a reason) when the date can't be used.
 */
function insertionPoint(
  opportunity: Opportunity,
  date: string,
  today: string,
): { index: number } | { message: string } {
  const problem = checkEventDate(date, today)
  if (problem) return { message: problem }
  const [first] = opportunity.history
  if (first && date < first.date)
    return { message: beforeMessage(first, today) }
  const later = opportunity.history.findIndex((event) => event.date > date)
  return { index: later === -1 ? opportunity.history.length : later }
}

function insert(
  opportunity: Opportunity,
  event: OpportunityEvent,
  index: number,
): ChangeResult {
  const history = [...opportunity.history]
  history.splice(index, 0, event)
  return withHistory(opportunity, history)
}

// ---------------------------------------------------------------------------
// Changes

export type StageChange = { date?: string } & (
  | { stage: Exclude<Stage, 'offer' | 'closed'> }
  | { stage: 'offer'; offerType?: OfferType | null }
  | {
      stage: 'closed'
      closedReason?: ClosedReason | null
      /** True when the 6-week rule closes it. */
      automatic?: boolean
    }
)

/**
 * Moves to any other stage, including out of Closed. Offer needs verbal or
 * written; Closed needs a reason; a take-home starts as received. The old
 * stage's details no longer apply.
 */
export function changeStage(
  opportunity: Opportunity,
  change: StageChange,
  today: string,
): ChangeResult {
  if (change.stage === currentState(opportunity).stage) {
    return refuse(`It's already at ${STAGE_LABELS[change.stage]}.`)
  }
  const offerType = change.stage === 'offer' ? (change.offerType ?? null) : null
  if (change.stage === 'offer' && offerType === null) {
    return refuse('Choose whether the offer is verbal or written.')
  }
  const closedReason =
    change.stage === 'closed' ? (change.closedReason ?? null) : null
  if (change.stage === 'closed' && closedReason === null) {
    return refuse('Choose why it closed.')
  }
  return append(
    opportunity,
    {
      type: 'stage',
      date: change.date ?? today,
      stage: change.stage,
      offerType,
      closedReason,
      closedAutomatically:
        change.stage === 'closed' && change.automatic === true,
    },
    today,
  )
}

/** The stage before the most recent close, to suggest when reopening. */
export function suggestedStageAfterClosed(
  opportunity: Opportunity,
): Stage | null {
  if (currentState(opportunity).stage !== 'closed') return null
  const earlierStages = opportunity.history
    .slice(
      0,
      opportunity.history.findLastIndex((event) => event.type === 'stage'),
    )
    .filter((event) => event.type === 'stage' && event.stage !== 'closed')
  const previous = earlierStages.at(-1)
  return previous?.type === 'stage' ? previous.stage : null
}

/** Records a referral change. Older changes are slotted in by date. */
export function changeReferral(
  opportunity: Opportunity,
  { referral, date: chosenDate }: { referral: Referral; date?: string },
  today: string,
): ChangeResult {
  const date = chosenDate ?? today
  const point = insertionPoint(opportunity, date, today)
  if ('message' in point) return refuse(point.message)
  const before = { history: opportunity.history.slice(0, point.index) }
  if (currentState(before).referral === referral) {
    return refuse(`The referral is already ${REFERRAL_LABELS[referral]}.`)
  }
  return insert(opportunity, { type: 'referral', date, referral }, point.index)
}

/** Marks a received take-home as submitted. */
export function markTakeHomeSubmitted(
  opportunity: Opportunity,
  { date: chosenDate }: { date?: string },
  today: string,
): ChangeResult {
  const date = chosenDate ?? today
  const state = currentState(opportunity)
  if (state.stage !== 'take-home') {
    return refuse(
      `This only applies at the ${STAGE_LABELS['take-home']} stage.`,
    )
  }
  if (state.takeHomeStatus === 'submitted') {
    return refuse('The take-home is already marked submitted.')
  }
  return append(opportunity, { type: 'take-home-submitted', date }, today)
}

/** Changes a verbal offer to written. */
export function markOfferWritten(
  opportunity: Opportunity,
  { date: chosenDate }: { date?: string },
  today: string,
): ChangeResult {
  const date = chosenDate ?? today
  const state = currentState(opportunity)
  if (state.stage !== 'offer') {
    return refuse(`This only applies at the ${STAGE_LABELS.offer} stage.`)
  }
  if (state.offerType === 'written')
    return refuse('The offer is already written.')
  return append(opportunity, { type: 'offer-written', date }, today)
}

function recordDated(
  type: 'followed-up' | 'got-response',
  opportunity: Opportunity,
  date: string,
  today: string,
): ChangeResult {
  const point = insertionPoint(opportunity, date, today)
  if ('message' in point) return refuse(point.message)
  return insert(opportunity, { type, date }, point.index)
}

/** Records a follow-up. Older ones are slotted in by date. */
export function recordFollowUp(
  opportunity: Opportunity,
  { date: chosenDate }: { date?: string },
  today: string,
): ChangeResult {
  const date = chosenDate ?? today
  return recordDated('followed-up', opportunity, date, today)
}

/** Records a response that doesn't change the stage. Older ones are slotted in by date. */
export function recordResponse(
  opportunity: Opportunity,
  { date: chosenDate }: { date?: string },
  today: string,
): ChangeResult {
  const date = chosenDate ?? today
  return recordDated('got-response', opportunity, date, today)
}

// ---------------------------------------------------------------------------
// Editing and removing

const isIndexIn = (opportunity: Opportunity, index: number) =>
  Number.isInteger(index) && index >= 0 && index < opportunity.history.length

/**
 * Changes an event's date. It can't be in the future, and must stay between
 * the events before and after it (the same day is fine).
 */
export function editEventDate(
  opportunity: Opportunity,
  { index, date }: { index: number; date: string },
  today: string,
): ChangeResult {
  if (!isIndexIn(opportunity, index)) return refuse(MISSING_EVENT_MESSAGE)
  const problem = checkEventDate(date, today)
  if (problem) return refuse(problem)
  const previous = opportunity.history[index - 1]
  if (previous && date < previous.date)
    return refuse(beforeMessage(previous, today))
  const next = opportunity.history[index + 1]
  if (next && date > next.date) return refuse(afterMessage(next, today))
  return withHistory(
    opportunity,
    opportunity.history.map((event, i) =>
      i === index ? { ...event, date } : event,
    ),
  )
}

/**
 * Removes an event (undo). The current state follows what remains. The only
 * stage event can't be removed: every opportunity needs a stage.
 */
export function removeEvent(
  opportunity: Opportunity,
  { index }: { index: number },
): ChangeResult {
  if (!isIndexIn(opportunity, index)) return refuse(MISSING_EVENT_MESSAGE)
  const stageEvents = opportunity.history.filter(
    (event) => event.type === 'stage',
  )
  if (opportunity.history[index].type === 'stage' && stageEvents.length === 1) {
    return refuse(
      "This is its only stage, so it can't be removed. Change the stage instead.",
    )
  }
  return withHistory(
    opportunity,
    opportunity.history.filter((_, i) => i !== index),
  )
}
