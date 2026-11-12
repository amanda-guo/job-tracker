import { describe, expect, it } from 'vitest'
import {
  ALIGNMENT_LABELS,
  ALIGNMENTS,
  CLOSED_REASON_LABELS,
  CLOSED_REASONS,
  isFurtherAlong,
  needsDetails,
  OFFER_TYPE_LABELS,
  OFFER_TYPES,
  type Opportunity,
  REFERRAL_LABELS,
  REFERRALS,
  RESUME_TAILORED,
  RESUME_TAILORED_LABELS,
  SOURCE_LABELS,
  SOURCES,
  STAGE_LABELS,
  STAGES,
  TAKE_HOME_STATUS_LABELS,
  TAKE_HOME_STATUSES,
  WORK_MODE_LABELS,
  WORK_MODES,
} from './opportunity'

/** An open opportunity with every detail filled in. */
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
    referral: 'none',
    stage: 'applied',
    takeHomeStatus: null,
    offerType: null,
    closedReason: null,
    closedAutomatically: false,
    deadline: '2026-11-20',
    nextStep: 'Wait to hear back',
    resumeTailored: 'yes',
    jobDescription: 'Design things.',
    links: [{ url: 'https://notion.example/chat', label: 'Coffee chat' }],
    notes: 'Met at the meetup.',
    dateAdded: '2026-11-11',
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
      expect(needsDetails(opportunity({ stage, alignment: null }))).toBe(true)
    },
  )

  it('is never true for a closed opportunity, even with nothing filled in', () => {
    const closed = opportunity({
      stage: 'closed',
      closedReason: 'rejected',
      alignment: null,
      source: null,
      postingLink: null,
      jobDescription: null,
    })
    expect(needsDetails(closed)).toBe(false)
  })
})
