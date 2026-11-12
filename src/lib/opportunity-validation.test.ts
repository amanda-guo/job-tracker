import { describe, expect, it } from 'vitest'
import { currentState } from './opportunity'
import {
  createOpportunity,
  type NewOpportunityInput,
  readStoredOpportunities,
} from './opportunity-validation'

const context = { id: 'opp-1', today: '2026-11-11' }

const create = (input: Partial<NewOpportunityInput> = {}) =>
  createOpportunity(
    { company: 'Acme', role: 'Product designer', ...input },
    context,
  )

/** Errors from a create that's expected to fail. */
function errorsFor(input: Partial<NewOpportunityInput>) {
  const result = create(input)
  if (result.ok) throw new Error('Expected validation to fail')
  return result.errors
}

/** The opportunity from a create that's expected to succeed. */
function created(input: Partial<NewOpportunityInput> = {}) {
  const result = create(input)
  if (!result.ok)
    throw new Error(`Expected success, got ${JSON.stringify(result.errors)}`)
  return result.opportunity
}

const LINK_MESSAGE = 'Use a link that starts with http:// or https://.'

const stageEvent = (
  date: string,
  stage: string,
  details: Record<string, unknown> = {},
) => ({
  type: 'stage',
  date,
  stage,
  offerType: null,
  closedReason: null,
  closedAutomatically: false,
  ...details,
})

describe('createOpportunity: only company and role are needed', () => {
  it('creates a full opportunity from company and role alone', () => {
    expect(create()).toEqual({
      ok: true,
      opportunity: {
        id: 'opp-1',
        company: 'Acme',
        role: 'Product designer',
        postingLink: null,
        location: null,
        workMode: null,
        alignment: null,
        source: null,
        deadline: null,
        nextStep: null,
        resumeTailored: null,
        jobDescription: null,
        links: [],
        notes: null,
        dateAdded: '2026-11-11', // from `today`, not the clock
        history: [stageEvent('2026-11-11', 'interested')],
      },
    })
  })

  it('trims company and role', () => {
    const opportunity = created({ company: '  Acme  ', role: '\tDesigner\n' })
    expect([opportunity.company, opportunity.role]).toEqual([
      'Acme',
      'Designer',
    ])
  })

  it.each(['', '   ', '\n\t '])(
    'asks for a company when it is %j',
    (company) => {
      expect(errorsFor({ company }).company).toBe('Add the company name.')
    },
  )

  it.each(['', '   ', '\n\t '])('asks for a role when it is %j', (role) => {
    expect(errorsFor({ role }).role).toBe('Add the role.')
  })

  it('reports every problem at once', () => {
    expect(
      Object.keys(
        errorsFor({ company: '', role: ' ', deadline: 'soon' }),
      ).sort(),
    ).toEqual(['company', 'deadline', 'role'])
  })
})

describe('createOpportunity: optional text', () => {
  it.each([
    'location',
    'nextStep',
    'notes',
    'jobDescription',
    'postingLink',
  ] as const)('leaves %s not set when blank or whitespace', (field) => {
    expect(created({ [field]: '' })[field]).toBeNull()
    expect(created({ [field]: '   \n ' })[field]).toBeNull()
  })

  it('trims optional text but keeps line breaks inside it', () => {
    expect(created({ notes: '  First line\nSecond line  ' }).notes).toBe(
      'First line\nSecond line',
    )
  })
})

describe('createOpportunity: text limits', () => {
  it.each([
    ['company', 200, '200'],
    ['role', 200, '200'],
    ['location', 200, '200'],
    ['nextStep', 200, '200'],
    ['notes', 5000, '5,000'],
    ['jobDescription', 20000, '20,000'],
  ] as const)('%s allows up to %i characters', (field, limit, shown) => {
    expect(create({ [field]: 'a'.repeat(limit) }).ok).toBe(true)
    expect(errorsFor({ [field]: 'a'.repeat(limit + 1) })[field]).toBe(
      `This can be up to ${shown} characters (it's ${(limit + 1).toLocaleString('en-US')} now).`,
    )
  })

  it('measures the text after trimming', () => {
    expect(create({ company: `  ${'a'.repeat(200)}  ` }).ok).toBe(true)
  })

  it('counts an emoji as one character', () => {
    expect(create({ company: '🙂'.repeat(200) }).ok).toBe(true)
  })

  it('limits a link label to 200 characters', () => {
    const links = [{ url: 'https://a.example', label: 'a'.repeat(201) }]
    expect(errorsFor({ links })['links.0.label']).toBe(
      "This can be up to 200 characters (it's 201 now).",
    )
  })

  it('limits a URL to 2,000 characters', () => {
    const url = (length: number) =>
      `https://a.example/${'a'.repeat(length - 18)}`
    expect(create({ postingLink: url(2000) }).ok).toBe(true)
    expect(errorsFor({ postingLink: url(2001) }).postingLink).toBe(
      "This can be up to 2,000 characters (it's 2,001 now).",
    )
  })
})

describe('createOpportunity: links', () => {
  it.each([
    'https://acme.example/jobs/1',
    'http://acme.example',
    '  https://acme.example/jobs?id=1#apply  ',
  ])('accepts the posting link %j', (postingLink) => {
    expect(created({ postingLink }).postingLink).toBe(postingLink.trim())
  })

  it.each([
    'ftp://acme.example/file',
    'acme.example/jobs',
    'www.acme.example',
    'javascript:alert(1)',
    'mailto:hr@acme.example',
    'https://',
    'not a link',
  ])('refuses the posting link %j', (postingLink) => {
    expect(errorsFor({ postingLink }).postingLink).toBe(LINK_MESSAGE)
  })

  it('keeps labelled links, trimmed', () => {
    const links = [
      { url: ' https://notion.example/chat ', label: ' Coffee chat ' },
    ]
    expect(created({ links }).links).toEqual([
      { url: 'https://notion.example/chat', label: 'Coffee chat' },
    ])
  })

  it('leaves the label not set when blank', () => {
    const links = [{ url: 'https://notion.example/chat', label: '  ' }]
    expect(created({ links }).links).toEqual([
      { url: 'https://notion.example/chat', label: null },
    ])
  })

  it('ignores a completely empty link row', () => {
    const links = [
      { url: 'https://a.example', label: 'A' },
      { url: '  ', label: '' },
    ]
    expect(created({ links }).links).toHaveLength(1)
  })

  it('asks for the URL when a link has only a label', () => {
    const links = [{ url: '', label: 'Coffee chat' }]
    expect(errorsFor({ links })['links.0.url']).toBe(
      'Add the link for "Coffee chat".',
    )
  })

  it('refuses ftp:// links and says which one', () => {
    const links = [
      { url: 'https://a.example', label: 'Fine' },
      { url: 'ftp://b.example', label: 'Not fine' },
    ]
    const errors = errorsFor({ links })
    expect(errors['links.1.url']).toBe(LINK_MESSAGE)
    expect(errors['links.0.url']).toBeUndefined()
  })
})

describe('createOpportunity: deadline', () => {
  it.each([
    '2026-11-30',
    '2020-01-01', // past: catching up is normal
    '2030-06-15', // future is allowed
    '2028-02-29', // leap day
  ])('accepts %s', (deadline) => {
    expect(created({ deadline }).deadline).toBe(deadline)
  })

  it('leaves it not set when blank', () => {
    expect(created({ deadline: '  ' }).deadline).toBeNull()
  })

  it.each([
    '2026-02-30',
    '2027-02-29', // not a leap year
    '2026-13-01',
    '2026-00-10',
    '2026-1-5',
    '11/30/2026',
    '2026-11-30T09:00',
    'next friday',
  ])('refuses %s', (deadline) => {
    expect(errorsFor({ deadline }).deadline).toBe(
      'Use a real date, like 2026-11-30.',
    )
  })
})

describe('createOpportunity: starting stage and history', () => {
  it('defaults to Interested with no referral', () => {
    expect(currentState(created())).toMatchObject({
      stage: 'interested',
      referral: 'none',
    })
  })

  it('records the starting stage as the first event, dated today', () => {
    expect(created({ stage: 'applied' }).history).toEqual([
      stageEvent('2026-11-11', 'applied'),
    ])
  })

  it('dates the starting stage on a chosen day, e.g. applied last month', () => {
    const opportunity = created({ stage: 'applied', stageDate: '2026-10-20' })
    expect(opportunity.history).toEqual([stageEvent('2026-10-20', 'applied')])
    expect(opportunity.dateAdded).toBe('2026-11-11') // still the day it was added
  })

  it('allows a starting date of today', () => {
    expect(created({ stageDate: '2026-11-11' }).history[0].date).toBe(
      '2026-11-11',
    )
  })

  it('refuses a starting date in the future', () => {
    expect(errorsFor({ stageDate: '2026-11-12' }).stageDate).toBe(
      'This is after today (Nov 11). Choose Nov 11 or earlier.',
    )
  })

  it('refuses a starting date that is not a real date', () => {
    expect(errorsFor({ stageDate: '2026-02-30' }).stageDate).toBe(
      'Use a real date, like 2026-11-30.',
    )
  })

  it('records a starting referral as an event on the same day', () => {
    const opportunity = created({
      referral: 'referred',
      stageDate: '2026-11-02',
    })
    expect(opportunity.history).toEqual([
      stageEvent('2026-11-02', 'interested'),
      { type: 'referral', date: '2026-11-02', referral: 'referred' },
    ])
    expect(currentState(opportunity).referral).toBe('referred')
  })

  it('does not record an event for "no referral"', () => {
    expect(created({ referral: 'none' }).history).toHaveLength(1)
  })

  it('starts a take-home as received', () => {
    expect(currentState(created({ stage: 'take-home' })).takeHomeStatus).toBe(
      'received',
    )
  })

  it('records an already-submitted take-home as an event on the same day', () => {
    const opportunity = created({
      stage: 'take-home',
      takeHomeStatus: 'submitted',
      stageDate: '2026-11-04',
    })
    expect(opportunity.history).toEqual([
      stageEvent('2026-11-04', 'take-home'),
      { type: 'take-home-submitted', date: '2026-11-04' },
    ])
    expect(currentState(opportunity).takeHomeStatus).toBe('submitted')
  })

  it('refuses take-home status at another stage', () => {
    expect(
      errorsFor({ stage: 'applied', takeHomeStatus: 'received' })
        .takeHomeStatus,
    ).toBe('Take-home status only applies at the Take-home assignment stage.')
  })

  it.each(['verbal', 'written'] as const)(
    'records a %s offer in the stage event',
    (offerType) => {
      const opportunity = created({ stage: 'offer', offerType })
      expect(opportunity.history).toEqual([
        stageEvent('2026-11-11', 'offer', { offerType }),
      ])
      expect(currentState(opportunity).offerType).toBe(offerType)
    },
  )

  it('asks whether an offer is verbal or written', () => {
    expect(errorsFor({ stage: 'offer' }).offerType).toBe(
      'Choose whether the offer is verbal or written.',
    )
  })

  it('refuses offer type at another stage', () => {
    expect(
      errorsFor({ stage: 'final-round', offerType: 'written' }).offerType,
    ).toBe('Offer type only applies at the Offer stage.')
  })

  it('creates a closed opportunity with its reason, not closed automatically', () => {
    const opportunity = created({ stage: 'closed', closedReason: 'withdrew' })
    expect(currentState(opportunity)).toMatchObject({
      stage: 'closed',
      closedReason: 'withdrew',
      closedAutomatically: false,
    })
  })

  it('asks why when the stage is Closed without a reason', () => {
    expect(errorsFor({ stage: 'closed' }).closedReason).toBe(
      'Choose why it closed.',
    )
  })

  it('refuses a closed reason when the stage is not Closed', () => {
    expect(
      errorsFor({ stage: 'applied', closedReason: 'rejected' }).closedReason,
    ).toBe('A closed reason only applies at the Closed stage.')
  })
})

describe('createOpportunity: errors are calm and never thrown', () => {
  const everythingWrong: Partial<NewOpportunityInput> = {
    company: ' ',
    role: '',
    location: 'a'.repeat(201),
    postingLink: 'ftp://x',
    deadline: '2026-02-30',
    stage: 'closed',
    offerType: 'verbal',
    stageDate: '2027-01-01',
    links: [{ url: '', label: 'Notes' }],
  }

  it('returns errors instead of throwing', () => {
    expect(() => create(everythingWrong)).not.toThrow()
    expect(create(everythingWrong).ok).toBe(false)
  })

  it('uses calm wording in every message', () => {
    for (const message of Object.values(errorsFor(everythingWrong))) {
      expect(message).not.toMatch(/invalid|error|must|required|wrong|!/i)
    }
  })
})

describe('readStoredOpportunities', () => {
  const stored = (overrides: Record<string, unknown> = {}) => ({
    ...created({
      postingLink: 'https://acme.example/jobs/1',
      alignment: 'aligned',
      links: [{ url: 'https://notion.example', label: 'Chat' }],
    }),
    ...overrides,
  })

  it('reads back what was saved, with no problems', () => {
    const saved = [stored(), stored({ id: 'opp-2', company: 'Globex' })]
    const roundTripped = JSON.parse(JSON.stringify(saved))
    expect(readStoredOpportunities(roundTripped)).toEqual({
      opportunities: saved,
      problems: [],
    })
  })

  it.each([undefined, null, 42, 'text', {}])(
    'reports %j as unreadable without crashing',
    (data) => {
      const result = readStoredOpportunities(data)
      expect(result.opportunities).toEqual([])
      expect(result.problems).toEqual([
        { index: null, field: null, message: expect.any(String) },
      ])
    },
  )

  it('skips entries that are not opportunities, and keeps the rest', () => {
    const result = readStoredOpportunities([null, stored(), 'x'])
    expect(result.opportunities).toHaveLength(1)
    expect(result.problems.map((p) => [p.index, p.field])).toEqual([
      [0, null],
      [2, null],
    ])
  })

  it.each([
    ['id', undefined],
    ['id', ''],
    ['company', '  '],
    ['role', 42],
    ['history', undefined],
    ['history', 'oops'],
    ['history', []],
    ['dateAdded', 'yesterday'],
  ])('skips an entry whose %s is %j, and says so', (field, value) => {
    const result = readStoredOpportunities([stored({ [field]: value })])
    expect(result.opportunities).toEqual([])
    expect(result.problems).toEqual([
      { index: 0, field, message: expect.any(String) },
    ])
  })

  it('skips a second entry with the same id', () => {
    const result = readStoredOpportunities([
      stored(),
      stored({ company: 'Copy' }),
    ])
    expect(result.opportunities.map((o) => o.company)).toEqual(['Acme'])
    expect(result.problems).toEqual([
      { index: 1, field: 'id', message: expect.any(String) },
    ])
  })

  it.each([
    ['alignment', 'maybe'],
    ['source', 42],
    ['workMode', 'office'],
    ['resumeTailored', true],
    ['location', 7],
    ['notes', { text: 'x' }],
    ['deadline', '2026-02-30'],
    ['postingLink', 'ftp://acme.example'],
  ])(
    'keeps the entry but clears an unreadable %s (%j), and says so',
    (field, value) => {
      const result = readStoredOpportunities([stored({ [field]: value })])
      expect(result.opportunities).toHaveLength(1)
      expect(result.opportunities[0][field as 'notes']).toBeNull()
      expect(result.opportunities[0].company).toBe('Acme')
      expect(result.problems).toEqual([
        { index: 0, field, message: expect.any(String) },
      ])
    },
  )

  it('treats a missing optional field as not set, without a problem', () => {
    const { location: _location, notes: _notes, ...older } = stored()
    const result = readStoredOpportunities([older])
    expect(result.opportunities[0]).toMatchObject({
      location: null,
      notes: null,
    })
    expect(result.problems).toEqual([])
  })

  it('keeps readable links and drops unreadable ones', () => {
    const links = [
      { url: 'https://ok.example', label: 'OK' },
      { url: 'ftp://no.example', label: 'No' },
      'not a link',
      { url: 'https://ok2.example' },
    ]
    const result = readStoredOpportunities([stored({ links })])
    expect(result.opportunities[0].links).toEqual([
      { url: 'https://ok.example', label: 'OK' },
      { url: 'https://ok2.example', label: null },
    ])
    expect(result.problems.map((p) => p.field)).toEqual(['links.1', 'links.2'])
  })

  it('reads links that are not a list as no links', () => {
    const result = readStoredOpportunities([stored({ links: 'oops' })])
    expect(result.opportunities[0].links).toEqual([])
    expect(result.problems.map((p) => p.field)).toEqual(['links'])
  })

  it('works out the current state from the history, ignoring stored copies', () => {
    const saved = stored({ stage: 'offer', referral: 'referred' })
    const result = readStoredOpportunities([saved])
    expect(currentState(result.opportunities[0])).toMatchObject({
      stage: 'interested',
      referral: 'none',
    })
    expect(result.opportunities[0]).not.toHaveProperty('stage')
    expect(result.problems).toEqual([])
  })

  it('reads every kind of event', () => {
    const history = [
      stageEvent('2026-11-02', 'take-home'),
      { type: 'referral', date: '2026-11-02', referral: 'requested' },
      { type: 'take-home-submitted', date: '2026-11-03' },
      stageEvent('2026-11-04', 'offer', { offerType: 'verbal' }),
      { type: 'offer-written', date: '2026-11-05' },
      { type: 'followed-up', date: '2026-11-06' },
      { type: 'got-response', date: '2026-11-07' },
      stageEvent('2026-11-08', 'closed', {
        closedReason: 'no-response',
        closedAutomatically: true,
      }),
    ]
    const result = readStoredOpportunities([stored({ history })])
    expect(result.opportunities[0].history).toEqual(history)
    expect(result.problems).toEqual([])
  })

  it('drops unreadable events, keeps the rest, and says which', () => {
    const history = [
      stageEvent('2026-11-02', 'applied'),
      { type: 'teleported', date: '2026-11-03' },
      { type: 'followed-up', date: 'soon' },
      'not an event',
      stageEvent('2026-11-04', 'phone screen'),
      { type: 'followed-up', date: '2026-11-05' },
    ]
    const result = readStoredOpportunities([stored({ history })])
    expect(result.opportunities[0].history).toEqual([
      stageEvent('2026-11-02', 'applied'),
      { type: 'followed-up', date: '2026-11-05' },
    ])
    expect(result.problems.map((p) => p.field)).toEqual([
      'history.1',
      'history.2',
      'history.3',
      'history.4',
    ])
  })

  it('skips an entry with no readable stage event', () => {
    const history = [{ type: 'followed-up', date: '2026-11-03' }]
    const result = readStoredOpportunities([stored({ history })])
    expect(result.opportunities).toEqual([])
    expect(result.problems).toEqual([
      { index: 0, field: 'history', message: expect.any(String) },
    ])
  })

  it('puts events back in date order, keeping same-day order, and says so', () => {
    const history = [
      stageEvent('2026-11-05', 'hr-screen'),
      stageEvent('2026-11-02', 'interested'),
      stageEvent('2026-11-02', 'applied'),
    ]
    const result = readStoredOpportunities([stored({ history })])
    expect(result.opportunities[0].history.map((e) => e.date)).toEqual([
      '2026-11-02',
      '2026-11-02',
      '2026-11-05',
    ])
    expect(currentState(result.opportunities[0]).stage).toBe('hr-screen')
    expect(result.problems.map((p) => p.field)).toEqual(['history'])
  })

  it('keeps a Closed event without a reason, and says so', () => {
    const history = [
      stageEvent('2026-11-02', 'applied'),
      stageEvent('2026-11-09', 'closed', { closedReason: null }),
    ]
    const result = readStoredOpportunities([stored({ history })])
    expect(currentState(result.opportunities[0])).toMatchObject({
      stage: 'closed',
      closedReason: null,
    })
    expect(result.problems.map((p) => p.field)).toEqual(['history.1'])
  })

  it('keeps an Offer event without a type, and says so', () => {
    const history = [stageEvent('2026-11-02', 'offer', { offerType: 'maybe' })]
    const result = readStoredOpportunities([stored({ history })])
    expect(currentState(result.opportunities[0])).toMatchObject({
      stage: 'offer',
      offerType: null,
    })
    expect(result.problems.map((p) => p.field)).toEqual(['history.0'])
  })

  it("clears details that do not belong to the event's stage, and says so", () => {
    const history = [
      stageEvent('2026-11-02', 'applied', { offerType: 'verbal' }),
    ]
    const result = readStoredOpportunities([stored({ history })])
    expect(result.opportunities[0].history).toEqual([
      stageEvent('2026-11-02', 'applied'),
    ])
    expect(result.problems.map((p) => p.field)).toEqual(['history.0'])
  })

  it('reads "closed automatically" as false unless it is true', () => {
    const closed = (closedAutomatically: unknown) =>
      stored({
        history: [
          stageEvent('2026-11-02', 'closed', {
            closedReason: 'no-response',
            closedAutomatically,
          }),
        ],
      })
    const read = (data: unknown) =>
      currentState(readStoredOpportunities([data]).opportunities[0])
        .closedAutomatically
    expect(read(closed(true))).toBe(true)
    expect(read(closed(undefined))).toBe(false)
    expect(read(closed('yes'))).toBe(false)
  })

  it('keeps saved text that is over the limits: data is never thrown away for length', () => {
    const notes = 'a'.repeat(6000)
    const result = readStoredOpportunities([stored({ notes })])
    expect(result.opportunities[0].notes).toBe(notes)
    expect(result.problems).toEqual([])
  })

  it.each([
    [[[]]],
    [[{ company: {}, role: [], links: [null, 1] }]],
    [[{ ...stored(), links: [{ url: 42 }] }]],
    [[stored({ deadline: 20261130 })]],
    [[stored({ history: [null, 1, { type: 'stage' }, { type: 'referral' }] })]],
    [
      [
        stored({
          history: [stageEvent('2026-11-02', 'applied'), { date: {} }],
        }),
      ],
    ],
  ])('never throws on strange data (%#)', (data) => {
    expect(() => readStoredOpportunities(data)).not.toThrow()
  })
})
