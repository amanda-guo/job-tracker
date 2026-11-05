import { describe, expect, it } from 'vitest'
import type { Review } from './review'
import {
  createLocalStorageStore,
  type KeyValueStorage,
  STORAGE_KEY,
} from './storage'
import { makeInput, makeReview } from './test-fixtures'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const storage: KeyValueStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
  return { data, storage }
}

function setup(initial: Record<string, string> = {}) {
  const { data, storage } = memoryStorage(initial)
  let next = 0
  const store = createLocalStorageStore({
    storage,
    createId: () => `id-${++next}`,
  })
  return { data, storage, store }
}

const saveOk = async (
  store: ReturnType<typeof setup>['store'],
  ...args: Parameters<ReturnType<typeof setup>['store']['save']>
) => {
  const result = await store.save(...args)
  if (!result.ok) throw new Error(`expected ok, got: ${result.message}`)
  return result
}

describe('createLocalStorageStore', () => {
  it('starts empty', async () => {
    const { store } = setup()
    expect(await store.list()).toEqual([])
  })

  it('creates a check-in and persists it for a new store on the same storage', async () => {
    const { store, storage } = setup()
    const result = await saveOk(store, makeInput())

    expect(result.created).toBe(true)
    expect(result.review).toEqual({ id: 'id-1', ...makeInput() })
    const reopened = createLocalStorageStore({ storage })
    expect(await reopened.list()).toEqual([result.review])
  })

  it('lists newest week first', async () => {
    const { store } = setup()
    await saveOk(store, makeInput({ weekOf: '2026-10-19' }))
    await saveOk(store, makeInput({ weekOf: '2026-11-02' }))
    await saveOk(store, makeInput({ weekOf: '2026-10-26' }))

    expect((await store.list()).map((r) => r.weekOf)).toEqual([
      '2026-11-02',
      '2026-10-26',
      '2026-10-19',
    ])
  })

  it('without an id, updates the existing check-in for that week', async () => {
    const { store } = setup()
    await saveOk(store, makeInput({ applications: 1 }))
    const result = await saveOk(store, makeInput({ applications: 7 }))

    expect(result.created).toBe(false)
    expect(result.review.id).toBe('id-1')
    const reviews = await store.list()
    expect(reviews).toHaveLength(1)
    expect(reviews[0].applications).toBe(7)
  })

  it('with an id, updates that check-in and can move it to a free week', async () => {
    const { store } = setup()
    await saveOk(store, makeInput())
    const result = await saveOk(
      store,
      makeInput({ weekOf: '2026-11-09', win: 'Moved' }),
      'id-1',
    )

    expect(result.created).toBe(false)
    expect(await store.list()).toEqual([
      { id: 'id-1', ...makeInput({ weekOf: '2026-11-09', win: 'Moved' }) },
    ])
  })

  it('refuses to move a check-in onto a week that already has one', async () => {
    const { store } = setup()
    await saveOk(store, makeInput({ weekOf: '2026-11-02' }))
    await saveOk(store, makeInput({ weekOf: '2026-11-09' }))
    const before = await store.list()

    const result = await store.save(makeInput({ weekOf: '2026-11-02' }), 'id-2')

    expect(result).toEqual({
      ok: false,
      message:
        'A check-in for that week already exists. Edit that one instead.',
    })
    expect(await store.list()).toEqual(before)
  })

  it('refuses to update an id that does not exist', async () => {
    const { store } = setup()
    expect(await store.save(makeInput(), 'missing')).toEqual({
      ok: false,
      message: 'That check-in no longer exists.',
    })
    expect(await store.list()).toEqual([])
  })

  it('validates input before saving', async () => {
    const { store } = setup()
    const result = await store.save(makeInput({ weekOf: 'not-a-date' }))
    expect(result).toEqual({ ok: false, message: 'Choose a valid week.' })
    expect(await store.list()).toEqual([])
  })

  it('removes a check-in and ignores unknown ids', async () => {
    const { store } = setup()
    await saveOk(store, makeInput({ weekOf: '2026-11-02' }))
    await saveOk(store, makeInput({ weekOf: '2026-11-09' }))

    await store.remove('id-1')
    await store.remove('missing')

    expect((await store.list()).map((r) => r.id)).toEqual(['id-2'])
  })

  it('treats unreadable JSON as empty, backs it up, and can save afterwards', async () => {
    const { store, data } = setup({ [STORAGE_KEY]: '{not json' })

    expect(await store.list()).toEqual([])
    expect(data.get(`${STORAGE_KEY}:backup`)).toBe('{not json')
    await saveOk(store, makeInput())
    expect(await store.list()).toHaveLength(1)
  })

  it('skips invalid records, keeps valid ones, and backs up the original', async () => {
    const valid: Review = makeReview({ id: 'good' })
    const raw = JSON.stringify([valid, { id: 'bad', weekOf: 'nope' }, 7])
    const { store, data } = setup({ [STORAGE_KEY]: raw })

    expect(await store.list()).toEqual([valid])
    expect(data.get(`${STORAGE_KEY}:backup`)).toBe(raw)
  })

  it('does not write a backup when stored data is clean', async () => {
    const { store, data } = setup()
    await saveOk(store, makeInput())
    await store.list()
    expect(data.has(`${STORAGE_KEY}:backup`)).toBe(false)
  })

  it('reports a failed write instead of throwing', async () => {
    const store = createLocalStorageStore({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
      },
    })
    expect(await store.save(makeInput())).toEqual({
      ok: false,
      message: 'Could not save. Browser storage may be full or turned off.',
    })
  })

  it('treats unavailable storage as empty when reading', async () => {
    const store = createLocalStorageStore({
      storage: {
        getItem: () => {
          throw new Error('SecurityError')
        },
        setItem: () => {},
      },
    })
    expect(await store.list()).toEqual([])
  })
})
