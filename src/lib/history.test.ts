import { describe, expect, it } from 'vitest'
import {
  type ChangeResult,
  changeReferral,
  changeStage,
  editEventDate,
  markOfferWritten,
  markTakeHomeSubmitted,
  recordFollowUp,
  recordResponse,
  removeEvent,
  suggestedStageAfterClosed,
} from './history'
import { currentState, type Opportunity } from './opportunity'
import {
  createOpportunity,
  type NewOpportunityInput,
} from './opportunity-validation'

const TODAY = '2026-11-11' // a Wednesday

/** A new opportunity whose starting stage is dated Nov 2. */
function start(input: Partial<NewOpportunityInput> = {}): Opportunity {
  const result = createOpportunity(
    { company: 'Acme', role: 'Designer', stageDate: '2026-11-02', ...input },
    { id: 'opp-1', today: TODAY },
  )
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.opportunity
}

/** The opportunity from a change that's expected to work. */
function saved(result: ChangeResult): Opportunity {
  if (!result.ok) throw new Error(`Expected success, got: ${result.message}`)
  return result.opportunity
}

/** The message from a change that's expected to be refused. */
function refused(result: ChangeResult): string {
  if (result.ok) throw new Error('Expected the change to be refused')
  return result.message
}

/** Interested (Nov 2) → Applied (Nov 3) → HR screen (Nov 5). */
function inHrScreen(): Opportunity {
  let opportunity = start()
  opportunity = saved(
    changeStage(opportunity, { stage: 'applied', date: '2026-11-03' }, TODAY),
  )
  return saved(
    changeStage(opportunity, { stage: 'hr-screen', date: '2026-11-05' }, TODAY),
  )
}

const stageOf = (opportunity: Opportunity) => currentState(opportunity).stage

describe('changeStage', () => {
  it('moves forward and records a dated event, dated today by default', () => {
    const opportunity = saved(changeStage(start(), { stage: 'applied' }, TODAY))
    expect(stageOf(opportunity)).toBe('applied')
    expect(opportunity.history.at(-1)).toEqual({
      type: 'stage',
      date: TODAY,
      stage: 'applied',
      offerType: null,
      closedReason: null,
      closedAutomatically: false,
    })
  })

  it('records a chosen past date, for things logged after they happened', () => {
    const opportunity = saved(
      changeStage(start(), { stage: 'applied', date: '2026-11-04' }, TODAY),
    )
    expect(opportunity.history.at(-1)?.date).toBe('2026-11-04')
  })

  it('leaves the original opportunity unchanged', () => {
    const original = start()
    changeStage(original, { stage: 'applied' }, TODAY)
    expect(stageOf(original)).toBe('interested')
    expect(original.history).toHaveLength(1)
  })

  it('can move backward', () => {
    const opportunity = saved(
      changeStage(inHrScreen(), { stage: 'applied' }, TODAY),
    )
    expect(stageOf(opportunity)).toBe('applied')
    expect(opportunity.history).toHaveLength(4)
  })

  it('can skip stages', () => {
    expect(
      stageOf(saved(changeStage(start(), { stage: 'final-round' }, TODAY))),
    ).toBe('final-round')
  })

  it('refuses a move to the stage it is already at', () => {
    expect(refused(changeStage(start(), { stage: 'interested' }, TODAY))).toBe(
      "It's already at Interested.",
    )
  })

  it('starts a take-home as received', () => {
    const opportunity = saved(
      changeStage(start(), { stage: 'take-home' }, TODAY),
    )
    expect(currentState(opportunity).takeHomeStatus).toBe('received')
  })

  it.each(['verbal', 'written'] as const)(
    'moves to Offer (%s)',
    (offerType) => {
      const opportunity = saved(
        changeStage(start(), { stage: 'offer', offerType }, TODAY),
      )
      expect(currentState(opportunity)).toMatchObject({
        stage: 'offer',
        offerType,
      })
    },
  )

  it('asks whether an offer is verbal or written', () => {
    expect(refused(changeStage(start(), { stage: 'offer' }, TODAY))).toBe(
      'Choose whether the offer is verbal or written.',
    )
  })

  it('closes with a reason, not automatically unless marked', () => {
    const opportunity = saved(
      changeStage(
        start(),
        { stage: 'closed', closedReason: 'withdrew' },
        TODAY,
      ),
    )
    expect(currentState(opportunity)).toMatchObject({
      stage: 'closed',
      closedReason: 'withdrew',
      closedAutomatically: false,
    })
  })

  it('can mark a close as automatic (for the 6-week rule)', () => {
    const opportunity = saved(
      changeStage(
        start({ stage: 'applied' }),
        { stage: 'closed', closedReason: 'no-response', automatic: true },
        TODAY,
      ),
    )
    expect(currentState(opportunity).closedAutomatically).toBe(true)
  })

  it('asks why when closing without a reason', () => {
    expect(refused(changeStage(start(), { stage: 'closed' }, TODAY))).toBe(
      'Choose why it closed.',
    )
  })

  it("clears the old stage's fields", () => {
    let opportunity = saved(
      changeStage(start(), { stage: 'offer', offerType: 'verbal' }, TODAY),
    )
    opportunity = saved(
      changeStage(
        opportunity,
        { stage: 'closed', closedReason: 'declined-offer' },
        TODAY,
      ),
    )
    expect(currentState(opportunity).offerType).toBeNull()
    opportunity = saved(
      changeStage(opportunity, { stage: 'final-round' }, TODAY),
    )
    expect(currentState(opportunity)).toMatchObject({
      closedReason: null,
      closedAutomatically: false,
    })
  })

  it('moves out of Closed to the suggested stage', () => {
    let opportunity = saved(
      changeStage(
        inHrScreen(),
        { stage: 'closed', closedReason: 'rejected', date: '2026-11-09' },
        TODAY,
      ),
    )
    const suggested = suggestedStageAfterClosed(opportunity)
    expect(suggested).toBe('hr-screen')
    opportunity = saved(changeStage(opportunity, { stage: 'hr-screen' }, TODAY))
    expect(currentState(opportunity)).toMatchObject({
      stage: 'hr-screen',
      closedReason: null,
    })
  })

  it('moves out of Closed to a stage other than the suggested one', () => {
    let opportunity = saved(
      changeStage(
        inHrScreen(),
        { stage: 'closed', closedReason: 'rejected' },
        TODAY,
      ),
    )
    opportunity = saved(
      changeStage(opportunity, { stage: 'interested' }, TODAY),
    )
    expect(stageOf(opportunity)).toBe('interested')
  })

  it('allows the same day as the latest event', () => {
    const opportunity = saved(
      changeStage(
        inHrScreen(),
        { stage: 'final-round', date: '2026-11-05' },
        TODAY,
      ),
    )
    expect(stageOf(opportunity)).toBe('final-round')
  })

  it('refuses a date in the future', () => {
    expect(
      refused(
        changeStage(start(), { stage: 'applied', date: '2026-11-12' }, TODAY),
      ),
    ).toBe('This is after today (Nov 11). Choose Nov 11 or earlier.')
  })

  it('refuses a date before the latest event, and names it', () => {
    expect(
      refused(
        changeStage(
          inHrScreen(),
          { stage: 'final-round', date: '2026-11-04' },
          TODAY,
        ),
      ),
    ).toBe(
      'This is before the date it moved to HR screen (Nov 5). Choose Nov 5 or later.',
    )
  })

  it('refuses a date that is not real', () => {
    expect(
      refused(
        changeStage(start(), { stage: 'applied', date: '2026-11-31' }, TODAY),
      ),
    ).toBe('Use a real date, like 2026-11-30.')
  })
})

describe('suggestedStageAfterClosed', () => {
  it('suggests the stage it was at before it closed', () => {
    const opportunity = saved(
      changeStage(
        inHrScreen(),
        { stage: 'closed', closedReason: 'rejected' },
        TODAY,
      ),
    )
    expect(suggestedStageAfterClosed(opportunity)).toBe('hr-screen')
  })

  it('suggests nothing when it is not closed', () => {
    expect(suggestedStageAfterClosed(inHrScreen())).toBeNull()
  })

  it('uses the most recent close', () => {
    let opportunity = saved(
      changeStage(
        inHrScreen(),
        { stage: 'closed', closedReason: 'rejected' },
        TODAY,
      ),
    )
    opportunity = saved(changeStage(opportunity, { stage: 'applied' }, TODAY))
    opportunity = saved(
      changeStage(
        opportunity,
        { stage: 'closed', closedReason: 'withdrew' },
        TODAY,
      ),
    )
    expect(suggestedStageAfterClosed(opportunity)).toBe('applied')
  })

  it('suggests nothing when it was created closed', () => {
    expect(
      suggestedStageAfterClosed(
        start({ stage: 'closed', closedReason: 'rejected' }),
      ),
    ).toBeNull()
  })
})

describe('changeReferral', () => {
  it('records each change and follows the latest', () => {
    let opportunity = saved(
      changeReferral(
        start(),
        { referral: 'requested', date: '2026-11-03' },
        TODAY,
      ),
    )
    expect(currentState(opportunity).referral).toBe('requested')
    opportunity = saved(
      changeReferral(opportunity, { referral: 'referred' }, TODAY),
    )
    expect(currentState(opportunity).referral).toBe('referred')
    expect(opportunity.history.at(-1)).toEqual({
      type: 'referral',
      date: TODAY,
      referral: 'referred',
    })
  })

  it('refuses a change to the referral it already has', () => {
    expect(refused(changeReferral(start(), { referral: 'none' }, TODAY))).toBe(
      'The referral is already None.',
    )
  })

  it('inserts a backdated referral change in date order', () => {
    const opportunity = saved(
      changeReferral(
        inHrScreen(),
        { referral: 'requested', date: '2026-11-04' },
        TODAY,
      ),
    )
    expect(opportunity.history.map((e) => e.type)).toEqual([
      'stage',
      'stage',
      'referral',
      'stage',
    ])
    expect(currentState(opportunity)).toMatchObject({
      stage: 'hr-screen',
      referral: 'requested',
    })
  })

  it('keeps a later referral change current when an earlier one is added', () => {
    let opportunity = saved(
      changeReferral(
        inHrScreen(),
        { referral: 'referred', date: '2026-11-10' },
        TODAY,
      ),
    )
    opportunity = saved(
      changeReferral(
        opportunity,
        { referral: 'requested', date: '2026-11-04' },
        TODAY,
      ),
    )
    expect(currentState(opportunity).referral).toBe('referred')
  })

  it('refuses a date before the first event', () => {
    expect(
      refused(
        changeReferral(
          inHrScreen(),
          { referral: 'requested', date: '2026-11-01' },
          TODAY,
        ),
      ),
    ).toBe(
      'This is before the date it moved to Interested (Nov 2). Choose Nov 2 or later.',
    )
  })

  it('refuses a date in the future', () => {
    expect(
      refused(
        changeReferral(
          inHrScreen(),
          { referral: 'requested', date: '2026-11-12' },
          TODAY,
        ),
      ),
    ).toBe('This is after today (Nov 11). Choose Nov 11 or earlier.')
  })
})

describe('markTakeHomeSubmitted', () => {
  const atTakeHome = () =>
    saved(
      changeStage(start(), { stage: 'take-home', date: '2026-11-04' }, TODAY),
    )

  it('marks a received take-home as submitted', () => {
    const opportunity = saved(markTakeHomeSubmitted(atTakeHome(), {}, TODAY))
    expect(currentState(opportunity).takeHomeStatus).toBe('submitted')
    expect(opportunity.history.at(-1)).toEqual({
      type: 'take-home-submitted',
      date: TODAY,
    })
  })

  it('refuses when not at the take-home stage', () => {
    expect(refused(markTakeHomeSubmitted(start(), {}, TODAY))).toBe(
      'This only applies at the Take-home assignment stage.',
    )
  })

  it('refuses when already submitted', () => {
    const opportunity = saved(markTakeHomeSubmitted(atTakeHome(), {}, TODAY))
    expect(refused(markTakeHomeSubmitted(opportunity, {}, TODAY))).toBe(
      'The take-home is already marked submitted.',
    )
  })

  it('follows the date rules', () => {
    expect(
      refused(
        markTakeHomeSubmitted(atTakeHome(), { date: '2026-11-03' }, TODAY),
      ),
    ).toBe(
      'This is before the date it moved to Take-home assignment (Nov 4). Choose Nov 4 or later.',
    )
  })
})

describe('markOfferWritten', () => {
  const verbalOffer = () =>
    saved(
      changeStage(
        start(),
        { stage: 'offer', offerType: 'verbal', date: '2026-11-06' },
        TODAY,
      ),
    )

  it('changes a verbal offer to written', () => {
    const opportunity = saved(markOfferWritten(verbalOffer(), {}, TODAY))
    expect(currentState(opportunity).offerType).toBe('written')
    expect(opportunity.history.at(-1)).toEqual({
      type: 'offer-written',
      date: TODAY,
    })
  })

  it('refuses when not at the Offer stage', () => {
    expect(refused(markOfferWritten(start(), {}, TODAY))).toBe(
      'This only applies at the Offer stage.',
    )
  })

  it('refuses when the offer is already written', () => {
    const written = saved(
      changeStage(start(), { stage: 'offer', offerType: 'written' }, TODAY),
    )
    expect(refused(markOfferWritten(written, {}, TODAY))).toBe(
      'The offer is already written.',
    )
  })

  it('follows the date rules', () => {
    expect(
      refused(markOfferWritten(verbalOffer(), { date: '2026-11-12' }, TODAY)),
    ).toBe('This is after today (Nov 11). Choose Nov 11 or earlier.')
  })
})

describe('recordFollowUp and recordResponse', () => {
  it.each([
    ['recordFollowUp', recordFollowUp, 'followed-up'],
    ['recordResponse', recordResponse, 'got-response'],
  ] as const)(
    '%s adds a dated event and leaves the stage alone',
    (_name, record, type) => {
      const opportunity = saved(
        record(inHrScreen(), { date: '2026-11-09' }, TODAY),
      )
      expect(opportunity.history.at(-1)).toEqual({ type, date: '2026-11-09' })
      expect(stageOf(opportunity)).toBe('hr-screen')
    },
  )

  it('allows several on the same day', () => {
    let opportunity = saved(recordFollowUp(inHrScreen(), {}, TODAY))
    opportunity = saved(recordFollowUp(opportunity, {}, TODAY))
    opportunity = saved(recordResponse(opportunity, {}, TODAY))
    expect(opportunity.history.slice(-3).map((e) => e.date)).toEqual([
      TODAY,
      TODAY,
      TODAY,
    ])
  })

  it('inserts a backdated one in date order, after events on the same day', () => {
    // Catching up: HR screen is recorded (Nov 5), then a follow-up from Nov 4.
    let opportunity = saved(
      recordFollowUp(inHrScreen(), { date: '2026-11-04' }, TODAY),
    )
    opportunity = saved(
      recordResponse(opportunity, { date: '2026-11-03' }, TODAY),
    )
    expect(opportunity.history.map((e) => [e.type, e.date])).toEqual([
      ['stage', '2026-11-02'],
      ['stage', '2026-11-03'],
      ['got-response', '2026-11-03'],
      ['followed-up', '2026-11-04'],
      ['stage', '2026-11-05'],
    ])
    expect(stageOf(opportunity)).toBe('hr-screen')
  })

  it('refuses a date in the future or before the first event', () => {
    expect(
      refused(recordResponse(inHrScreen(), { date: '2026-11-12' }, TODAY)),
    ).toBe('This is after today (Nov 11). Choose Nov 11 or earlier.')
    expect(
      refused(recordFollowUp(inHrScreen(), { date: '2026-11-01' }, TODAY)),
    ).toBe(
      'This is before the date it moved to Interested (Nov 2). Choose Nov 2 or later.',
    )
  })
})

describe('editEventDate', () => {
  // inHrScreen(): [0] Interested Nov 2, [1] Applied Nov 3, [2] HR screen Nov 5

  it('changes the date when it stays in order', () => {
    const opportunity = saved(
      editEventDate(inHrScreen(), { index: 1, date: '2026-11-04' }, TODAY),
    )
    expect(opportunity.history.map((e) => e.date)).toEqual([
      '2026-11-02',
      '2026-11-04',
      '2026-11-05',
    ])
    expect(stageOf(opportunity)).toBe('hr-screen')
  })

  it('allows the same day as the events before and after', () => {
    const opportunity = inHrScreen()
    expect(
      editEventDate(opportunity, { index: 1, date: '2026-11-02' }, TODAY).ok,
    ).toBe(true)
    expect(
      editEventDate(opportunity, { index: 1, date: '2026-11-05' }, TODAY).ok,
    ).toBe(true)
  })

  it('lets the first event move as early as needed', () => {
    const opportunity = saved(
      editEventDate(inHrScreen(), { index: 0, date: '2025-06-01' }, TODAY),
    )
    expect(opportunity.history[0].date).toBe('2025-06-01')
  })

  it('lets the latest event move up to today', () => {
    expect(
      editEventDate(inHrScreen(), { index: 2, date: TODAY }, TODAY).ok,
    ).toBe(true)
  })

  it('refuses a date in the future', () => {
    expect(
      refused(
        editEventDate(inHrScreen(), { index: 2, date: '2026-11-20' }, TODAY),
      ),
    ).toBe('This is after today (Nov 11). Choose Nov 11 or earlier.')
  })

  it('refuses a date before the event before it', () => {
    expect(
      refused(
        editEventDate(inHrScreen(), { index: 2, date: '2026-11-01' }, TODAY),
      ),
    ).toBe(
      'This is before the date it moved to Applied (Nov 3). Choose Nov 3 or later.',
    )
  })

  it('refuses a date after the event after it', () => {
    expect(
      refused(
        editEventDate(inHrScreen(), { index: 1, date: '2026-11-06' }, TODAY),
      ),
    ).toBe(
      'This is after the date it moved to HR screen (Nov 5). Choose Nov 5 or earlier.',
    )
  })

  it('leaves the history unchanged when refused', () => {
    const opportunity = inHrScreen()
    editEventDate(opportunity, { index: 1, date: '2026-11-06' }, TODAY)
    expect(opportunity.history[1].date).toBe('2026-11-03')
  })

  it.each([
    [
      (o: Opportunity) =>
        changeReferral(o, { referral: 'referred', date: '2026-11-07' }, TODAY),
      'the date the referral changed to Referred',
    ],
    [
      (o: Opportunity) => recordFollowUp(o, { date: '2026-11-07' }, TODAY),
      'the date you followed up',
    ],
    [
      (o: Opportunity) => recordResponse(o, { date: '2026-11-07' }, TODAY),
      'the date you got a response',
    ],
    [
      (o: Opportunity) =>
        changeStage(
          o,
          { stage: 'closed', closedReason: 'rejected', date: '2026-11-07' },
          TODAY,
        ),
      'the date it moved to Closed',
    ],
  ])(
    'names the neighbouring event in plain words (%#)',
    (addEvent, description) => {
      const opportunity = saved(addEvent(inHrScreen()))
      expect(
        refused(
          editEventDate(opportunity, { index: 2, date: '2026-11-08' }, TODAY),
        ),
      ).toBe(`This is after ${description} (Nov 7). Choose Nov 7 or earlier.`)
    },
  )

  it('names a submitted take-home and a written offer in plain words', () => {
    let opportunity = saved(
      changeStage(start(), { stage: 'take-home', date: '2026-11-03' }, TODAY),
    )
    opportunity = saved(
      markTakeHomeSubmitted(opportunity, { date: '2026-11-04' }, TODAY),
    )
    expect(
      refused(
        editEventDate(opportunity, { index: 1, date: '2026-11-05' }, TODAY),
      ),
    ).toBe(
      'This is after the date the take-home was submitted (Nov 4). Choose Nov 4 or earlier.',
    )
    opportunity = saved(
      changeStage(
        opportunity,
        { stage: 'offer', offerType: 'verbal', date: '2026-11-06' },
        TODAY,
      ),
    )
    opportunity = saved(
      markOfferWritten(opportunity, { date: '2026-11-08' }, TODAY),
    )
    expect(
      refused(
        editEventDate(opportunity, { index: 3, date: '2026-11-09' }, TODAY),
      ),
    ).toBe(
      'This is after the date the offer became written (Nov 8). Choose Nov 8 or earlier.',
    )
  })

  it('shows the year when the date is in another year', () => {
    let opportunity = start({ stageDate: '2025-12-28' })
    opportunity = saved(
      changeStage(opportunity, { stage: 'applied', date: '2026-01-05' }, TODAY),
    )
    expect(
      refused(
        editEventDate(opportunity, { index: 1, date: '2025-12-27' }, TODAY),
      ),
    ).toBe(
      'This is before the date it moved to Interested (Dec 28, 2025). Choose Dec 28, 2025 or later.',
    )
  })

  it('refuses a date that is not real', () => {
    expect(
      refused(
        editEventDate(inHrScreen(), { index: 1, date: '2026-02-30' }, TODAY),
      ),
    ).toBe('Use a real date, like 2026-11-30.')
  })

  it('refuses an event that is not in the history', () => {
    expect(
      refused(editEventDate(inHrScreen(), { index: 7, date: TODAY }, TODAY)),
    ).toBe("That event isn't in the history anymore.")
  })
})

describe('removeEvent', () => {
  it('removing the latest stage event goes back to the stage before', () => {
    const opportunity = saved(removeEvent(inHrScreen(), { index: 2 }))
    expect(stageOf(opportunity)).toBe('applied')
    expect(opportunity.history).toHaveLength(2)
  })

  it('removing a middle stage event keeps the current stage', () => {
    const opportunity = saved(removeEvent(inHrScreen(), { index: 1 }))
    expect(
      opportunity.history.map((e) => (e.type === 'stage' ? e.stage : e.type)),
    ).toEqual(['interested', 'hr-screen'])
    expect(currentState(opportunity)).toMatchObject({
      stage: 'hr-screen',
      referral: 'none',
    })
  })

  it('removing the first stage event is fine when others remain', () => {
    expect(stageOf(saved(removeEvent(inHrScreen(), { index: 0 })))).toBe(
      'hr-screen',
    )
  })

  it('removing the Closed event reopens it as it was, with its details', () => {
    let opportunity = saved(
      changeStage(start(), { stage: 'take-home', date: '2026-11-03' }, TODAY),
    )
    opportunity = saved(
      markTakeHomeSubmitted(opportunity, { date: '2026-11-04' }, TODAY),
    )
    opportunity = saved(
      changeStage(
        opportunity,
        { stage: 'closed', closedReason: 'rejected' },
        TODAY,
      ),
    )
    opportunity = saved(removeEvent(opportunity, { index: 3 }))
    expect(currentState(opportunity)).toMatchObject({
      stage: 'take-home',
      takeHomeStatus: 'submitted',
      closedReason: null,
    })
  })

  it('removing an automatic close reopens it too', () => {
    let opportunity = saved(
      changeStage(
        start({ stage: 'applied' }),
        { stage: 'closed', closedReason: 'no-response', automatic: true },
        TODAY,
      ),
    )
    opportunity = saved(removeEvent(opportunity, { index: 1 }))
    expect(currentState(opportunity)).toMatchObject({
      stage: 'applied',
      closedAutomatically: false,
    })
  })

  it('refuses to remove the only stage event, even with other events', () => {
    const opportunity = saved(recordFollowUp(start(), {}, TODAY))
    expect(refused(removeEvent(opportunity, { index: 0 }))).toBe(
      "This is its only stage, so it can't be removed. Change the stage instead.",
    )
  })

  it('removing a referral change goes back to the referral before', () => {
    let opportunity = saved(
      changeReferral(
        start(),
        { referral: 'requested', date: '2026-11-03' },
        TODAY,
      ),
    )
    opportunity = saved(
      changeReferral(
        opportunity,
        { referral: 'referred', date: '2026-11-04' },
        TODAY,
      ),
    )
    expect(
      currentState(saved(removeEvent(opportunity, { index: 2 }))).referral,
    ).toBe('requested')
    expect(
      currentState(saved(removeEvent(opportunity, { index: 1 }))).referral,
    ).toBe('referred')
  })

  it('removing "submitted" or "written" goes back to received or verbal', () => {
    const takeHome = saved(
      markTakeHomeSubmitted(
        saved(changeStage(start(), { stage: 'take-home' }, TODAY)),
        {},
        TODAY,
      ),
    )
    expect(
      currentState(saved(removeEvent(takeHome, { index: 2 }))).takeHomeStatus,
    ).toBe('received')
    const offer = saved(
      markOfferWritten(
        saved(
          changeStage(start(), { stage: 'offer', offerType: 'verbal' }, TODAY),
        ),
        {},
        TODAY,
      ),
    )
    expect(
      currentState(saved(removeEvent(offer, { index: 2 }))).offerType,
    ).toBe('verbal')
  })

  it('removing a stage leaves later events that no longer apply without effect', () => {
    let opportunity = saved(
      changeStage(start(), { stage: 'take-home', date: '2026-11-03' }, TODAY),
    )
    opportunity = saved(
      markTakeHomeSubmitted(opportunity, { date: '2026-11-04' }, TODAY),
    )
    opportunity = saved(removeEvent(opportunity, { index: 1 }))
    expect(currentState(opportunity)).toMatchObject({
      stage: 'interested',
      takeHomeStatus: null,
    })
  })

  it('removing a follow-up leaves the state alone', () => {
    const opportunity = saved(
      removeEvent(saved(recordFollowUp(inHrScreen(), {}, TODAY)), { index: 3 }),
    )
    expect(opportunity.history).toHaveLength(3)
    expect(stageOf(opportunity)).toBe('hr-screen')
  })

  it('refuses an event that is not in the history', () => {
    expect(refused(removeEvent(inHrScreen(), { index: -1 }))).toBe(
      "That event isn't in the history anymore.",
    )
  })
})

describe('every change is calm and never throws', () => {
  it('returns messages instead of throwing on bad input', () => {
    const opportunity = inHrScreen()
    const attempts = [
      () =>
        changeStage(opportunity, { stage: 'applied', date: 'tomorrow' }, TODAY),
      () => editEventDate(opportunity, { index: 99, date: '' }, TODAY),
      () => removeEvent(opportunity, { index: 1.5 }),
      () => markOfferWritten(opportunity, { date: '2026-13-01' }, TODAY),
    ]
    for (const attempt of attempts) {
      expect(attempt).not.toThrow()
      expect(refused(attempt())).not.toMatch(
        /invalid|error|must|required|wrong|!/i,
      )
    }
  })
})
