// The opportunity model from docs/product.md ("Feature: Opportunities" and
// "Data rules"). Values are stable ids for storage; labels are for screens.

/** Stages, in process order. The only place this order is defined. */
export const STAGES = [
  'interested',
  'applied',
  'take-home',
  'hr-screen',
  'technical',
  'final-round',
  'offer',
  'closed',
] as const
export type Stage = (typeof STAGES)[number]
export const STAGE_LABELS: Record<Stage, string> = {
  interested: 'Interested',
  applied: 'Applied',
  'take-home': 'Take-home assignment',
  'hr-screen': 'HR screen',
  technical: 'Technical / other rounds',
  'final-round': 'Final round',
  offer: 'Offer',
  closed: 'Closed',
}

export const ALIGNMENTS = [
  'aligned',
  'somewhat-aligned',
  'not-aligned',
] as const
export type Alignment = (typeof ALIGNMENTS)[number]
export const ALIGNMENT_LABELS: Record<Alignment, string> = {
  aligned: 'Aligned',
  'somewhat-aligned': 'Somewhat aligned',
  'not-aligned': 'Not aligned',
}

export const SOURCES = [
  'event-connection',
  'recruiter-reached-out',
  'job-posting',
  'my-network',
] as const
export type Source = (typeof SOURCES)[number]
export const SOURCE_LABELS: Record<Source, string> = {
  'event-connection': 'Event connection',
  'recruiter-reached-out': 'Recruiter reached out',
  'job-posting': 'Job posting',
  'my-network': 'My network',
}

export const REFERRALS = ['none', 'requested', 'referred'] as const
export type Referral = (typeof REFERRALS)[number]
export const REFERRAL_LABELS: Record<Referral, string> = {
  none: 'None',
  requested: 'Requested',
  referred: 'Referred',
}

export const WORK_MODES = ['remote', 'hybrid', 'on-site'] as const
export type WorkMode = (typeof WORK_MODES)[number]
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  'on-site': 'On-site',
}

export const TAKE_HOME_STATUSES = ['received', 'submitted'] as const
export type TakeHomeStatus = (typeof TAKE_HOME_STATUSES)[number]
export const TAKE_HOME_STATUS_LABELS: Record<TakeHomeStatus, string> = {
  received: 'Received',
  submitted: 'Submitted',
}

export const OFFER_TYPES = ['verbal', 'written'] as const
export type OfferType = (typeof OFFER_TYPES)[number]
export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  verbal: 'Verbal',
  written: 'Written',
}

export const CLOSED_REASONS = [
  'rejected',
  'withdrew',
  'declined-offer',
  'accepted',
  'no-response',
] as const
export type ClosedReason = (typeof CLOSED_REASONS)[number]
export const CLOSED_REASON_LABELS: Record<ClosedReason, string> = {
  rejected: 'Rejected',
  withdrew: 'Withdrew',
  'declined-offer': 'Declined offer',
  accepted: 'Accepted',
  'no-response': 'No response',
}

export const RESUME_TAILORED = ['yes', 'somewhat', 'no'] as const
export type ResumeTailored = (typeof RESUME_TAILORED)[number]
export const RESUME_TAILORED_LABELS: Record<ResumeTailored, string> = {
  yes: 'Yes',
  somewhat: 'Somewhat',
  no: 'No',
}

export type Link = {
  /** Starts with http:// or https://. */
  url: string
  /** Not set: the URL is shown instead. */
  label: string | null
}

/** A change in an opportunity's stage. Details only for their own stage. */
export type StageEvent = {
  type: 'stage'
  date: string
  stage: Stage
  /** Set only when moving to Offer. */
  offerType: OfferType | null
  /** Set only when moving to Closed. */
  closedReason: ClosedReason | null
  /** True only when Closed by the 6-week rule. */
  closedAutomatically: boolean
}

export type ReferralEvent = {
  type: 'referral'
  date: string
  referral: Referral
}

/** Events that only record that something happened, and when. */
export type DatedEvent = {
  type: 'take-home-submitted' | 'offer-written' | 'followed-up' | 'got-response'
  date: string
}

export type OpportunityEvent = StageEvent | ReferralEvent | DatedEvent

/**
 * One opportunity. `null` means "not set". Dates are `YYYY-MM-DD`, local.
 * Stage, referral and their details are not stored: they come from
 * `history` (see `currentState`). The history is in date order and always
 * has at least one stage event.
 */
export type Opportunity = {
  id: string
  company: string
  role: string
  postingLink: string | null
  location: string | null
  workMode: WorkMode | null
  alignment: Alignment | null
  source: Source | null
  deadline: string | null
  nextStep: string | null
  resumeTailored: ResumeTailored | null
  jobDescription: string | null
  links: Link[]
  notes: string | null
  dateAdded: string
  history: OpportunityEvent[]
}

/** Where an opportunity stands now, worked out from its history. */
export type OpportunityState = {
  stage: Stage
  referral: Referral
  takeHomeStatus: TakeHomeStatus | null
  offerType: OfferType | null
  closedReason: ClosedReason | null
  closedAutomatically: boolean
}

/**
 * The only place current state is worked out. The latest stage event sets
 * the stage and its details; only events after it can update those details
 * (take-home submitted, offer written). The latest referral event sets the
 * referral. Events that no longer apply have no effect.
 */
export function currentState({
  history,
}: Pick<Opportunity, 'history'>): OpportunityState {
  let referral: Referral = 'none'
  let latestStage = -1
  history.forEach((event, index) => {
    if (event.type === 'referral') referral = event.referral
    if (event.type === 'stage') latestStage = index
  })

  const stageEvent = history[latestStage] as StageEvent | undefined
  const stage = stageEvent?.stage ?? 'interested'
  let takeHomeStatus: TakeHomeStatus | null =
    stage === 'take-home' ? 'received' : null
  let offerType = stage === 'offer' ? (stageEvent?.offerType ?? null) : null

  for (const event of history.slice(latestStage + 1)) {
    if (event.type === 'take-home-submitted' && stage === 'take-home') {
      takeHomeStatus = 'submitted'
    }
    if (event.type === 'offer-written' && stage === 'offer')
      offerType = 'written'
  }

  return {
    stage,
    referral,
    takeHomeStatus,
    offerType,
    closedReason:
      stage === 'closed' ? (stageEvent?.closedReason ?? null) : null,
    closedAutomatically:
      stage === 'closed' && stageEvent?.closedAutomatically === true,
  }
}

/** True when stage `a` comes later in the process than stage `b`. */
export function isFurtherAlong(a: Stage, b: Stage): boolean {
  return STAGES.indexOf(a) > STAGES.indexOf(b)
}

/**
 * "Fill in later": an open opportunity missing alignment, source, posting
 * link or job description. Closed opportunities never need details.
 */
export function needsDetails(opportunity: Opportunity): boolean {
  if (currentState(opportunity).stage === 'closed') return false
  return (
    opportunity.alignment === null ||
    opportunity.source === null ||
    opportunity.postingLink === null ||
    opportunity.jobDescription === null
  )
}
