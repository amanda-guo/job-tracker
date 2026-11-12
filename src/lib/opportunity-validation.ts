import {
  ALIGNMENTS,
  type Alignment,
  CLOSED_REASONS,
  type ClosedReason,
  type Link,
  OFFER_TYPES,
  type OfferType,
  type Opportunity,
  REFERRALS,
  RESUME_TAILORED,
  type Referral,
  type ResumeTailored,
  SOURCES,
  type Source,
  STAGE_LABELS,
  STAGES,
  type Stage,
  TAKE_HOME_STATUSES,
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
const DATE_MESSAGE = 'Use a real date, like 2026-11-30.'

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

/** A real calendar date written as `YYYY-MM-DD`. No clock, no time zone. */
function isDate(value: string): boolean {
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
  takeHomeStatus?: TakeHomeStatus | null
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

  const opportunity: Opportunity = {
    id,
    company: company ?? '',
    role: role ?? '',
    postingLink: webLink('postingLink', input.postingLink),
    location: text('location', input.location, LIMITS.text),
    workMode: input.workMode ?? null,
    alignment: input.alignment ?? null,
    source: input.source ?? null,
    referral: input.referral ?? 'none',
    stage,
    takeHomeStatus,
    offerType,
    closedReason,
    closedAutomatically: false,
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
 * - An entry without a readable id, company, role, stage, referral or date
 *   added is skipped (the app can't work without these).
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
    const required: [string, boolean][] = [
      ['id', isText(record.id)],
      ['company', isText(record.company)],
      ['role', isText(record.role)],
      ['stage', isOneOf(STAGES, record.stage)],
      ['referral', isOneOf(REFERRALS, record.referral)],
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
    const stage = record.stage as Stage

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
    const stageOption = <T extends string>(
      field: keyof typeof STAGE_FIELDS,
      values: readonly T[],
    ) => {
      const value = option(field, values)
      return value !== null && stage !== STAGE_FIELDS[field]
        ? clear(field)
        : value
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

    const closedReason = stageOption('closedReason', CLOSED_REASONS)
    const closedReasonUnreadable = problems.some(
      (p) => p.index === index && p.field === 'closedReason',
    )
    if (
      stage === 'closed' &&
      closedReason === null &&
      !closedReasonUnreadable
    ) {
      problems.push({
        index,
        field: 'closedReason',
        message: 'It\'s closed without a reason. It was kept as "Closed".',
      })
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
      referral: record.referral as Referral,
      stage,
      takeHomeStatus: stageOption('takeHomeStatus', TAKE_HOME_STATUSES),
      offerType: stageOption('offerType', OFFER_TYPES),
      closedReason,
      closedAutomatically:
        stage === 'closed' && record.closedAutomatically === true,
      deadline: optionalText('deadline', isDate),
      nextStep: optionalText('nextStep'),
      resumeTailored: option('resumeTailored', RESUME_TAILORED),
      jobDescription: optionalText('jobDescription'),
      links,
      notes: optionalText('notes'),
      dateAdded: record.dateAdded as string,
    })
  })

  return { opportunities, problems }
}
