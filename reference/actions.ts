'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

export type Review = {
  id: string
  weekOf: string
  conversations: number
  outreach: number
  referrals: number
  applications: number
  practice: number
  events: number
  hours: number
  health: 'low' | 'steady' | 'energized'
  win?: string | null
  nextFocus?: string | null
  pivotNote?: string | null
  targets?: Partial<Record<'conversations' | 'outreach' | 'referrals' | 'applications' | 'practice' | 'events', number | null>>
}

export type ActionState = { ok: boolean; message: string; reviews?: Review[]; notionUrl?: string }

const num = (data: FormData, key: string, fallback = 0, max = 999) => {
  const value = Number(data.get(key))
  return Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : fallback
}

async function allReviews(payload: Awaited<ReturnType<typeof getPayload>>) {
  const result = await payload.find({
    collection: 'weekly-reviews',
    limit: 100,
    sort: '-weekOf',
    overrideAccess: false,
  })
  return result.docs.map((review) => ({ ...review, id: String(review.id) }))
}

export async function saveReview(_: ActionState, formData: FormData): Promise<ActionState> {
  const weekOf = String(formData.get('weekOf') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return { ok: false, message: 'Choose a valid week.' }
  const health = String(formData.get('health'))
  if (!['low', 'steady', 'energized'].includes(health)) return { ok: false, message: 'Choose an energy level.' }

  const data = {
    weekOf: new Date(`${weekOf}T12:00:00.000Z`).toISOString(),
    conversations: num(formData, 'conversations'),
    outreach: num(formData, 'outreach'),
    referrals: num(formData, 'referrals'),
    applications: num(formData, 'applications'),
    practice: num(formData, 'practice'),
    events: num(formData, 'events'),
    hours: num(formData, 'hours', 0, 60),
    health: health as Review['health'],
    win: String(formData.get('win') ?? '').slice(0, 500),
    nextFocus: String(formData.get('nextFocus') ?? '').slice(0, 500),
    pivotNote: String(formData.get('pivotNote') ?? '').slice(0, 500),
    targets: {
      conversations: num(formData, 'target-conversations', 5),
      outreach: num(formData, 'target-outreach', 18),
      referrals: num(formData, 'target-referrals', 2),
      applications: num(formData, 'target-applications', 5),
      practice: num(formData, 'target-practice', 2),
      events: num(formData, 'target-events', 1),
    },
  }
  const payload = await getPayload({ config })
  let id = String(formData.get('id') ?? '')
  if (!id) {
    const existingWeek = await payload.find({
      collection: 'weekly-reviews',
      where: { weekOf: { equals: data.weekOf } },
      limit: 1,
      overrideAccess: false,
    })
    id = existingWeek.docs[0] ? String(existingWeek.docs[0].id) : ''
  }
  if (id) {
    await payload.update({ collection: 'weekly-reviews', id, data, overrideAccess: false })
  } else {
    await payload.create({ collection: 'weekly-reviews', data, overrideAccess: false })
  }
  return { ok: true, message: String(formData.get('id') ?? '') ? 'Check-in updated.' : 'Check-in saved.', reviews: await allReviews(payload) }
}

export async function deleteReview(id: string): Promise<ActionState> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'weekly-reviews', id: String(id), overrideAccess: false })
  return { ok: true, message: 'Check-in deleted.', reviews: await allReviews(payload) }
}

export async function saveNotionUrl(url: string): Promise<ActionState> {
  const value = url.trim()
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') throw new Error()
  } catch {
    return { ok: false, message: 'Enter a valid https:// Notion URL.' }
  }
  const payload = await getPayload({ config })
  await payload.updateGlobal({ slug: 'search-settings', data: { notionUrl: value }, overrideAccess: false })
  return { ok: true, message: 'Notion link saved.', notionUrl: value }
}
