import { describe, expect, it } from 'vitest'
import {
  ALIGNMENT_LABELS,
  ALIGNMENTS,
  CLOSED_REASON_LABELS,
  CLOSED_REASONS,
  type ClosedReason,
  currentState,
  isFurtherAlong,
  needsDetails,
  OFFER_TYPE_LABELS,
  OFFER_TYPES,
  type OfferType,
  type Opportunity,
  type OpportunityEvent,
  REFERRAL_LABELS,
  REFERRALS,
  RESUME_TAILORED,
  RESUME_TAILORED_LABELS,
  SOURCE_LABELS,
  SOURCES,
  STAGE_LABELS,
  STAGES,
  type Stage,
  TAKE_HOME_STATUS_LABELS,
  TAKE_HOME_STATUSES,
  WORK_MODE_LABELS,
  WORK_MODES,
} from './opportunity'

const stageEvent = (
  date: string,
  stage: Stage,
  details: {
    offerType?: OfferType
    closedReason?: ClosedReason
    closedAutomatically?: boolean
  } = {},
): OpportunityEvent => ({
  type: 'stage',
  date,
  stage,
  offerType: details.offerType ?? null,
  closedReason: details.closedReason ?? null,
  closedAutomatically: details.closedAutomatically ?? false,
})

/** An open opportunity (Applied) with every detail filled in. */
function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    company: 'Acme',
    role: 'Product designer',
    postingLink: 'https://acme.example/jobs/1',
    location: 'Toronto',
    workMode: 'hybrid',
    alignment: 'aligned',
    source: 'job-posting',
    deadline: '2026-11-20',
    nextStep: 'Wait to hear back',
    resumeTailored: 'yes',
    jobDescription: 'Design things.',
    links: [{ url: 'https://notion.example/chat', label: 'Coffee chat' }],
    notes: 'Met at the meetup.',
    dateAdded: '2026-11-11',
    history: [
      stageEvent('2026-11-02', 'interested'),
      stageEvent('2026-11-03', 'applied'),
    ],
    ...overrides,
  }
}

describe('option lists (labels exactly as in docs/product.md)', () => {
  it('has the stages in order', () => {
    expect(STAGES.map((stage) => STAGE_LABELS[stage])).toEqual([
      'Interested',
      'Applied',
      'Take-home assignment',
      'HR screen',
      'Technical / other rounds',
      'Final round',
      'Offer',
      'Closed',
    ])
  })

  it.each([
    [
      'alignment',
      ALIGNMENTS,
      ALIGNMENT_LABELS,
      ['Aligned', 'Somewhat aligned', 'Not aligned'],
    ],
    [
      'source',
      SOURCES,
      SOURCE_LABELS,
      [
        'Event connection',
        'Recruiter reached out',
        'Job posting',
        'My network',
      ],
    ],
    ['referral', REFERRALS, REFERRAL_LABELS, ['None', 'Requested', 'Referred']],
    [
      'work mode',
      WORK_MODES,
      WORK_MODE_LABELS,
      ['Remote', 'Hybrid', 'On-site'],
    ],
    [
      'take-home status',
      TAKE_HOME_STATUSES,
      TAKE_HOME_STATUS_LABELS,
      ['Received', 'Submitted'],
    ],
    ['offer type', OFFER_TYPES, OFFER_TYPE_LABELS, ['Verbal', 'Written']],
    [
      'closed reason',
      CLOSED_REASONS,
      CLOSED_REASON_LABELS,
      ['Rejected', 'Withdrew', 'Declined offer', 'Accepted', 'No response'],
    ],
    [
      'resume tailored',
      RESUME_TAILORED,
      RESUME_TAILORED_LABELS,
      ['Yes', 'Somewhat', 'No'],
    ],
  ] as const)('has the %s options', (_name, values, labels, expected) => {
    expect(
      values.map((value) => (labels as Record<string, string>)[value]),
    ).toEqual(expected)
  })
})

describe('isFurtherAlong', () => {
  it.each([
    ['applied', 'interested', true],
    ['interested', 'applied', false],
    ['applied', 'applied', false],
    ['final-round', 'technical', true],
    ['offer', 'final-round', true],
    ['closed', 'offer', true],
    ['hr-screen', 'take-home', true],
  ] as const)('%s is further along than %s: %s', (a, b, expected) => {
    expect(isFurtherAlong(a, b)).toBe(expected)
  })

  it('follows the stage order for every pair', () => {
    STAGES.forEach((later, laterIndex) => {
      STAGES.forEach((earlier, earlierIndex) => {
        expect(isFurtherAlong(later, earlier)).toBe(laterIndex > earlierIndex)
      })
    })
  })
})

describe('needsDetails ("Fill in later")', () => {
  it('is false for an open opportunity with every detail', () => {
    expect(needsDetails(opportunity())).toBe(false)
  })

  it.each(['alignment', 'source', 'postingLink', 'jobDescription'] as const)(
    'is true for an open opportunity missing %s',
    (field) => {
      expect(needsDetails(opportunity({ [field]: null }))).toBe(true)
    },
  )

  it.each([
    'location',
    'workMode',
    'deadline',
    'nextStep',
    'resumeTailored',
    'notes',
  ] as const)('ignores a missing %s', (field) => {
    expect(needsDetails(opportunity({ [field]: null }))).toBe(false)
  })

  it('ignores having no links', () => {
    expect(needsDetails(opportunity({ links: [] }))).toBe(false)
  })

  it.each(STAGES.filter((stage) => stage !== 'closed'))(
    'applies at the %s stage',
    (stage) => {
      const history = [stageEvent('2026-11-02', stage)]
      expect(needsDetails(opportunity({ history, alignment: null }))).toBe(true)
    },
  )

  it('is never true for a closed opportunity, even with nothing filled in', () => {
    const closed = opportunity({
      history: [
        stageEvent('2026-11-02', 'applied'),
        stageEvent('2026-11-09', 'closed', { closedReason: 'rejected' }),
      ],
      alignment: null,
      source: null,
      postingLink: null,
      jobDescription: null,
    })
    expect(needsDetails(closed)).toBe(false)
  })
})

describe('currentState: derived from the history, never stored', () => {
  const state = (history: OpportunityEvent[]) =>
    currentState(opportunity({ history }))
  const event = (
    type:
      | 'followed-up'
      | 'got-response'
      | 'take-home-submitted'
      | 'offer-written',
    date: string,
  ): OpportunityEvent => ({ type, date })
  const referral = (
    date: string,
    value: 'none' | 'requested' | 'referred',
  ): OpportunityEvent => ({ type: 'referral', date, referral: value })

  it('starts with no referral and nothing stage-specific', () => {
    expect(state([stageEvent('2026-11-02', 'interested')])).toEqual({
      stage: 'interested',
      referral: 'none',
      takeHomeStatus: null,
      offerType: null,
      closedReason: null,
      closedAutomatically: false,
    })
  })

  it('takes the stage from the latest stage event, even if it moved backward', () => {
    const history = [
      stageEvent('2026-11-02', 'applied'),
      stageEvent('2026-11-05', 'hr-screen'),
      stageEvent('2026-11-06', 'applied'),
    ]
    expect(state(history).stage).toBe('applied')
  })

  it('takes the referral from the latest referral event', () => {
    const history = [
      stageEvent('2026-11-02', 'interested'),
      referral('2026-11-03', 'requested'),
      referral('2026-11-06', 'referred'),
    ]
    expect(state(history).referral).toBe('referred')
  })

  it('starts a take-home as received, and submitted once marked', () => {
    const atTakeHome = [stageEvent('2026-11-02', 'take-home')]
    expect(state(atTakeHome).takeHomeStatus).toBe('received')
    expect(
      state([...atTakeHome, event('take-home-submitted', '2026-11-04')])
        .takeHomeStatus,
    ).toBe('submitted')
  })

  it('only counts a submitted take-home from the current take-home stage', () => {
    const history = [
      stageEvent('2026-11-02', 'take-home'),
      event('take-home-submitted', '2026-11-03'),
      stageEvent('2026-11-04', 'hr-screen'),
      stageEvent('2026-11-05', 'take-home'), // a second take-home
    ]
    expect(state(history).takeHomeStatus).toBe('received')
  })

  it('takes the offer type from the stage event, then "written" once it changes', () => {
    const verbal = [stageEvent('2026-11-02', 'offer', { offerType: 'verbal' })]
    expect(state(verbal).offerType).toBe('verbal')
    expect(
      state([...verbal, event('offer-written', '2026-11-06')]).offerType,
    ).toBe('written')
  })

  it('takes the closed reason, and whether it closed automatically', () => {
    const history = [
      stageEvent('2026-09-01', 'applied'),
      stageEvent('2026-10-13', 'closed', {
        closedReason: 'no-response',
        closedAutomatically: true,
      }),
    ]
    expect(state(history)).toMatchObject({
      stage: 'closed',
      closedReason: 'no-response',
      closedAutomatically: true,
    })
  })

  it("clears the old stage's fields when the stage changes", () => {
    const history = [
      stageEvent('2026-11-02', 'offer', { offerType: 'verbal' }),
      stageEvent('2026-11-04', 'closed', { closedReason: 'rejected' }),
      stageEvent('2026-11-06', 'final-round'),
    ]
    expect(state(history)).toMatchObject({
      stage: 'final-round',
      offerType: null,
      closedReason: null,
      closedAutomatically: false,
    })
  })

  it('ignores events that no longer apply, e.g. "written" when not at Offer', () => {
    const history = [
      stageEvent('2026-11-02', 'applied'),
      event('offer-written', '2026-11-03'),
      event('take-home-submitted', '2026-11-03'),
    ]
    expect(state(history)).toMatchObject({
      offerType: null,
      takeHomeStatus: null,
    })
  })

  it('is not changed by follow-ups or responses', () => {
    const history = [
      stageEvent('2026-11-02', 'applied'),
      event('followed-up', '2026-11-05'),
      event('got-response', '2026-11-06'),
    ]
    expect(state(history).stage).toBe('applied')
  })
})
