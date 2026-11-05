import type { Review, ReviewInput } from './review'
import { parseReviewInput, parseStoredReview } from './validation'

export type SaveResult =
  | { ok: true; review: Review; created: boolean }
  | { ok: false; message: string }

/**
 * Where check-ins live. Components only talk to this interface, so the
 * localStorage implementation can be swapped for a real database later.
 */
export interface ReviewStore {
  /** All check-ins, newest week first. */
  list(): Promise<Review[]>
  /**
   * With an id: updates that check-in. Without one: updates the check-in for
   * the same week if there is one, otherwise creates a new check-in.
   * Refuses to leave two check-ins on the same week.
   */
  save(input: ReviewInput, id?: string): Promise<SaveResult>
  /** Deletes a check-in. Unknown ids are ignored. */
  remove(id: string): Promise<void>
}

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export const STORAGE_KEY = 'job-tracker:reviews:v1'

export const sortByWeekDesc = (reviews: Review[]): Review[] =>
  [...reviews].sort((a, b) => b.weekOf.localeCompare(a.weekOf))

type LocalStorageStoreOptions = {
  /** Defaults to the browser's localStorage. */
  storage?: KeyValueStorage
  key?: string
  createId?: () => string
}

export function createLocalStorageStore(
  options: LocalStorageStoreOptions = {},
): ReviewStore {
  const key = options.key ?? STORAGE_KEY
  const backupKey = `${key}:backup`
  const createId = options.createId ?? (() => crypto.randomUUID())
  const getStorage = () => options.storage ?? globalThis.localStorage

  // Keeps a copy of stored data we could not fully read, so the next save
  // doesn't silently destroy it.
  const backUp = (raw: string) => {
    try {
      getStorage().setItem(backupKey, raw)
    } catch {
      // Nothing more we can do; reading still continues with what was valid.
    }
  }

  const read = (): Review[] => {
    let raw: string | null
    try {
      raw = getStorage().getItem(key)
    } catch {
      return []
    }
    if (!raw) return []

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      backUp(raw)
      return []
    }
    if (!Array.isArray(data)) {
      backUp(raw)
      return []
    }

    const reviews = data
      .map(parseStoredReview)
      .filter((review): review is Review => review !== null)
    if (reviews.length !== data.length) backUp(raw)
    return sortByWeekDesc(reviews)
  }

  const write = (reviews: Review[]) => {
    getStorage().setItem(key, JSON.stringify(sortByWeekDesc(reviews)))
  }

  return {
    async list() {
      return read()
    },

    async save(input, id) {
      const parsed = parseReviewInput(input)
      if (!parsed.ok) return parsed
      const value = parsed.value

      const reviews = read()
      const existing = id
        ? reviews.find((review) => review.id === id)
        : reviews.find((review) => review.weekOf === value.weekOf)
      if (id && !existing) {
        return { ok: false, message: 'That check-in no longer exists.' }
      }
      const clash = reviews.some(
        (review) =>
          review.id !== existing?.id && review.weekOf === value.weekOf,
      )
      if (clash) {
        return {
          ok: false,
          message:
            'A check-in for that week already exists. Edit that one instead.',
        }
      }

      const review: Review = { ...value, id: existing?.id ?? createId() }
      const next = existing
        ? reviews.map((item) => (item.id === existing.id ? review : item))
        : [...reviews, review]
      try {
        write(next)
      } catch {
        return {
          ok: false,
          message: 'Could not save. Browser storage may be full or turned off.',
        }
      }
      return { ok: true, review, created: !existing }
    },

    async remove(id) {
      const reviews = read()
      if (!reviews.some((review) => review.id === id)) return
      write(reviews.filter((review) => review.id !== id))
    },
  }
}
