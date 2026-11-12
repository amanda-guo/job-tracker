import { checkEventDate, DATE_MESSAGE, isDate } from './history'
import {
  ALIGNMENTS,
  type Alignment,
  CLOSED_REASONS,
  type ClosedReason,
  type Link,
  OFFER_TYPES,
  type OfferType,
  type Opportunity,
  type OpportunityEvent,
  REFERRALS,
  RESUME_TAILORED,
  type Referral,
  type ResumeTailored,
  SOURCES,
  type Source,
  STAGE_LABELS,
  STAGES,
  type Stage,
  type TakeHomeStatus,
  WORK_MODES,
  type WorkMode,
} from './opportunity'

/** Character limits (docs/plan.md, 2026-11-11). URLs get room for long links. */
const LIMITS = {
  notes: 5000,
  jobDescription: 20000,
  url: 2000,
  text: 200,
}

/** Which stage each stage-specific field belongs to. */
const STAGE_FIELDS = {
  takeHomeStatus: 'take-home',
  offerType: 'offer',
  closedReason: 'closed',
} as const satisfies Record<string, Stage>

const STAGE_FIELD_NAMES: Record<keyof typeof STAGE_FIELDS, string> = {
  takeHomeStatus: 'Take-home status',
  offerType: 'Offer type',
  closedReason: 'A closed reason',
}

const LINK_MESSAGE = 'Use a link that starts with http:// or https://.'

// ---------------------------------------------------------------------------
// Shared checks

/** Counts characters as people see them: an emoji or accented letter is one. */
const characterCount = (text: string) => [...text].length

const formatCount = (n: number) => n.toLocaleString('en-US')

function tooLongMessage(text: string, limit: number): string | null {
  const count = characterCount(text)
  return count > limit
    ? `This can be up to ${formatCount(limit)} characters (it's ${formatCount(count)} now).`
    : null
}

/** An absolute http:// or https:// URL with a host. */
function isWebLink(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname !== ''
    )
  } catch {
    return false
  }
}

function isOneOf<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === 'string' && (values as readonly string[]).includes(value)
  )
}

// ---------------------------------------------------------------------------
// Creating an opportunity

/** What a form or the import provides. Only company and role are needed. */
export type NewOpportunityInput = {
  company: string
  role: string
  postingLink?: string
  location?: string
  workMode?: WorkMode | null
  alignment?: Alignment | null
  source?: Source | null
  /** Defaults to "none". */
  referral?: Referral
  /** Defaults to "interested". */
  stage?: Stage
  /** When the starting stage happened. Defaults to today; never later. */
  stageDate?: string
  /** At Take-home: received (the default) or already submitted. */
  takeHomeStatus?: TakeHomeStatus | null
  /** Needed at Offer. */
  offerType?: OfferType | null
  closedReason?: ClosedReason | null
  deadline?: string
  nextStep?: string
  resumeTailored?: ResumeTailored | null
  jobDescription?: string
  links?: { url: string; label?: string }[]
  notes?: string
}

/** Errors keyed by field, e.g. `company` or `links.0.url`. */
export type FieldErrors = Record<string, string>

export type CreateResult =
  | { ok: true; opportunity: Opportunity }
  | { ok: false; errors: FieldErrors }

/**
 * Checks the input and builds a new opportunity. Never throws: problems come
 * back as calm messages, all at once. `id` and `today` (`YYYY-MM-DD`) come
 * from the caller, so nothing here reads the clock.
 */
export function createOpportunity(
  input: NewOpportunityInput,
  { id, today }: { id: string; today: string },
): CreateResult {
  const errors: FieldErrors = {}

  /** Trimmed text, or null when blank. Records a length error if too long. */
  const text = (field: string, value: string | undefined, limit: number) => {
    const trimmed = value?.trim() ?? ''
    if (trimmed === '') return null
    const tooLong = tooLongMessage(trimmed, limit)
    if (tooLong) errors[field] = tooLong
    return trimmed
  }

  const webLink = (field: string, value: string | undefined) => {
    const link = text(field, value, LIMITS.url)
    if (link !== null && !errors[field] && !isWebLink(link)) {
      errors[field] = LINK_MESSAGE
    }
    return link
  }

  const company = text('company', input.company, LIMITS.text)
  if (company === null) errors.company = 'Add the company name.'
  const role = text('role', input.role, LIMITS.text)
  if (role === null) errors.role = 'Add the role.'

  const deadline = input.deadline?.trim() || null
  if (deadline !== null && !isDate(deadline)) errors.deadline = DATE_MESSAGE

  const links: Link[] = []
  ;(input.links ?? []).forEach((link, index) => {
    const label = text(`links.${index}.label`, link.label, LIMITS.text)
    const urlField = `links.${index}.url`
    if (link.url.trim() === '') {
      // An empty row is ignored; a label without a link needs its link.
      if (label !== null) errors[urlField] = `Add the link for "${label}".`
      return
    }
    const url = webLink(urlField, link.url)
    if (url !== null) links.push({ url, label })
  })

  const stage = input.stage ?? 'interested'
  const stageField = <T>(
    field: keyof typeof STAGE_FIELDS,
    value: T | null | undefined,
  ) => {
    if (value == null) return null
    if (stage !== STAGE_FIELDS[field]) {
      errors[field] =
        `${STAGE_FIELD_NAMES[field]} only applies at the ${STAGE_LABELS[STAGE_FIELDS[field]]} stage.`
    }
    return value
  }
  const takeHomeStatus = stageField('takeHomeStatus', input.takeHomeStatus)
  const offerType = stageField('offerType', input.offerType)
  const closedReason = stageField('closedReason', input.closedReason)
  if (stage === 'closed' && closedReason === null) {
    errors.closedReason = 'Choose why it closed.'
  }
  if (stage === 'offer' && offerType === null) {
    errors.offerType = 'Choose whether the offer is verbal or written.'
  }

  // The starting stage is the first event; a starting referral or an
  // already-submitted take-home are recorded on the same day.
  const stageDate = input.stageDate?.trim() || today
  const stageDateProblem = checkEventDate(stageDate, today)
  if (stageDateProblem) errors.stageDate = stageDateProblem
  const referral = input.referral ?? 'none'
  const history: OpportunityEvent[] = [
    {
      type: 'stage',
      date: stageDate,
      stage,
      offerType: stage === 'offer' ? offerType : null,
      closedReason: stage === 'closed' ? closedReason : null,
      closedAutomatically: false,
    },
  ]
  if (referral !== 'none') {
    history.push({ type: 'referral', date: stageDate, referral })
  }
  if (stage === 'take-home' && takeHomeStatus === 'submitted') {
    history.push({ type: 'take-home-submitted', date: stageDate })
  }

  const opportunity: Opportunity = {
    id,
    company: company ?? '',
    role: role ?? '',
    postingLink: webLink('postingLink', input.postingLink),
    location: text('location', input.location, LIMITS.text),
    workMode: input.workMode ?? null,
    alignment: input.alignment ?? null,
    source: input.source ?? null,
    deadline,
    nextStep: text('nextStep', input.nextStep, LIMITS.text),
    resumeTailored: input.resumeTailored ?? null,
    jobDescription: text(
      'jobDescription',
      input.jobDescription,
      LIMITS.jobDescription,
    ),
    links,
    notes: text('notes', input.notes, LIMITS.notes),
    dateAdded: today,
    history,
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, opportunity }
}

// ---------------------------------------------------------------------------
// Reading saved data

/**
 * Something in saved data that couldn't be read. `index` is the entry's
 * position (null for the whole list); `field` is null for a whole entry.
 */
export type ReadProblem = {
  index: number | null
  field: string | null
  message: string
}

export type ReadResult = {
  opportunities: Opportunity[]
  problems: ReadProblem[]
}

/**
 * Reads opportunities back from storage. Never throws.
 * - An entry without a readable id, company, role, date added, or at least
 *   one readable stage event is skipped (the app can't work without these).
 * - Unreadable events are dropped; the rest of the history is kept, in date
 *   order. Stage, referral and their details always come from the history,
 *   never from stored copies.
 * - Any other unreadable field is cleared to "not set"; the rest is kept.
 * - Format rules apply (dates, links); length limits don't, so saved text
 *   is never thrown away.
 * Every skip or clear is reported in `problems`.
 */
export function readStoredOpportunities(data: unknown): ReadResult {
  if (!Array.isArray(data)) {
    return {
      opportunities: [],
      problems: [
        {
          index: null,
          field: null,
          message: "The saved opportunities couldn't be read as a list.",
        },
      ],
    }
  }

  const opportunities: Opportunity[] = []
  const problems: ReadProblem[] = []
  const seenIds = new Set<string>()

  data.forEach((entry, index) => {
    const skip = (field: string | null, message: string) =>
      problems.push({ index, field, message })

    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      skip(null, "This entry isn't an opportunity, so it was skipped.")
      return
    }
    const record = entry as Record<string, unknown>

    // Fields the app can't work without: skip the entry if any is unreadable.
    const isText = (value: unknown): value is string =>
      typeof value === 'string' && value.trim() !== ''
    const history = readHistory(record.history)
    const required: [string, boolean][] = [
      ['id', isText(record.id)],
      ['company', isText(record.company)],
      ['role', isText(record.role)],
      ['history', history.events.some((event) => event.type === 'stage')],
      [
        'dateAdded',
        typeof record.dateAdded === 'string' && isDate(record.dateAdded),
      ],
    ]
    const unreadable = required.find(([, ok]) => !ok)
    if (unreadable) {
      skip(
        unreadable[0],
        `Its ${unreadable[0]} couldn't be read, so it was skipped.`,
      )
      return
    }
    const id = record.id as string
    if (seenIds.has(id)) {
      skip('id', 'Another opportunity already has this id, so it was skipped.')
      return
    }
    seenIds.add(id)
    for (const problem of history.problems) problems.push({ index, ...problem })

    // Everything else: clear to "not set" if unreadable, and say so.
    const clear = (field: string) => {
      problems.push({
        index,
        field,
        message: `Its ${field} couldn't be read, so it was left blank.`,
      })
      return null
    }
    const isMissing = (value: unknown) => value === undefined || value === null

    const optionalText = (
      field: string,
      isValid: (text: string) => boolean = () => true,
    ) => {
      const value = record[field]
      if (isMissing(value) || value === '') return null
      return typeof value === 'string' && isValid(value) ? value : clear(field)
    }
    const option = <T extends string>(field: string, values: readonly T[]) => {
      const value = record[field]
      if (isMissing(value)) return null
      return isOneOf(values, value) ? value : clear(field)
    }

    const links: Link[] = []
    if (Array.isArray(record.links)) {
      record.links.forEach((link: unknown, linkIndex) => {
        const { url, label } = (link ?? {}) as Record<string, unknown>
        if (
          typeof link === 'object' &&
          typeof url === 'string' &&
          isWebLink(url)
        ) {
          links.push({ url, label: isText(label) ? label : null })
        } else {
          clear(`links.${linkIndex}`)
        }
      })
    } else if (!isMissing(record.links)) {
      clear('links')
    }

    opportunities.push({
      id,
      company: record.company as string,
      role: record.role as string,
      postingLink: optionalText('postingLink', isWebLink),
      location: optionalText('location'),
      workMode: option('workMode', WORK_MODES),
      alignment: option('alignment', ALIGNMENTS),
      source: option('source', SOURCES),
      deadline: optionalText('deadline', isDate),
      nextStep: optionalText('nextStep'),
      resumeTailored: option('resumeTailored', RESUME_TAILORED),
      jobDescription: optionalText('jobDescription'),
      links,
      notes: optionalText('notes'),
      dateAdded: record.dateAdded as string,
      history: history.events,
    })
  })

  return { opportunities, problems }
}

const DATED_EVENT_TYPES = [
  'take-home-submitted',
  'offer-written',
  'followed-up',
  'got-response',
] as const

/**
 * Reads a stored history. Unreadable events are dropped; stage details that
 * are missing or don't belong to the event's stage are cleared. Events out
 * of date order are put back in order (same-day order kept). Each problem
 * is reported once per event.
 */
function readHistory(value: unknown): {
  events: OpportunityEvent[]
  problems: { field: string; message: string }[]
} {
  const problems: { field: string; message: string }[] = []
  if (!Array.isArray(value)) return { events: [], problems }

  const events: OpportunityEvent[] = []
  value.forEach((raw: unknown, index) => {
    const field = `history.${index}`
    const drop = () => {
      problems.push({
        field,
        message: `Event ${index + 1} couldn't be read, so it was left out.`,
      })
    }
    if (typeof raw !== 'object' || raw === null) {
      drop()
      return
    }
    const event = raw as Record<string, unknown>
    if (typeof event.date !== 'string' || !isDate(event.date)) {
      drop()
      return
    }
    const date = event.date

    if (event.type === 'referral') {
      if (!isOneOf(REFERRALS, event.referral)) {
        drop()
        return
      }
      events.push({ type: 'referral', date, referral: event.referral })
    } else if (isOneOf(DATED_EVENT_TYPES, event.type)) {
      events.push({ type: event.type, date })
    } else if (event.type === 'stage') {
      if (!isOneOf(STAGES, event.stage)) {
        drop()
        return
      }
      const stage = event.stage
      let cleared = false
      /** The value when it belongs to this stage and is readable; else null. */
      const detail = <T extends string>(
        own: Stage,
        values: readonly T[],
        raw: unknown,
      ): T | null => {
        if (stage === own && isOneOf(values, raw)) return raw
        if (stage === own || (raw !== undefined && raw !== null)) cleared = true
        return null
      }
      events.push({
        type: 'stage',
        date,
        stage,
        offerType: detail('offer', OFFER_TYPES, event.offerType),
        closedReason: detail('closed', CLOSED_REASONS, event.closedReason),
        closedAutomatically:
          stage === 'closed' && event.closedAutomatically === true,
      })
      if (cleared) {
        problems.push({
          field,
          message: `Part of event ${index + 1} couldn't be read, so it was left blank.`,
        })
      }
    } else {
      drop()
    }
  })

  const inOrder = events.every(
    (event, i) => i === 0 || events[i - 1].date <= event.date,
  )
  if (!inOrder) {
    events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    problems.push({
      field: 'history',
      message:
        'Its events were out of date order, so they were put back in order.',
    })
  }
  return { events, problems }
}
