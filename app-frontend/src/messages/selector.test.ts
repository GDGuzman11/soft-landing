/**
 * Unit tests for the Firestore-backed verse selector.
 *
 * Covers:
 *   - Firestore fetch + 24h AsyncStorage cache lifecycle
 *   - Stale-cache fallback on network failure
 *   - Tier filtering (free vs premium)
 *   - Anti-repetition weighting (regression — must still work post-rewrite)
 *   - Intent-tag boosting
 *   - The new optional `modernText` field (mapped from Firestore `web` field)
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { EmotionId, Message, Tier } from '../types'

// --- Mocks --------------------------------------------------------------

vi.mock('../services/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ __collection: name })),
  query: vi.fn((coll: unknown, ...constraints: unknown[]) => ({ __query: { coll, constraints } })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ __where: { field, op, value } })),
  getDocs: vi.fn(),
}))

vi.mock('../storage/storage', () => ({
  getMessageMetadata: vi.fn(),
  updateMessageMetadata: vi.fn(),
}))

// Imported after mocks so the module under test picks them up.
import { selectMessage } from './selector'
import { getDocs } from 'firebase/firestore'
import { getMessageMetadata, updateMessageMetadata } from '../storage/storage'

// --- Helpers ------------------------------------------------------------

interface FakeFirestoreDoc {
  id: string
  data: () => unknown
}

/** Build a fake Firestore QuerySnapshot whose `forEach` mirrors the real API. */
function makeSnapshot(docs: FakeFirestoreDoc[]): { forEach: (cb: (d: FakeFirestoreDoc) => void) => void } {
  return {
    forEach(cb) {
      docs.forEach(cb)
    },
  }
}

/** Build a single Firestore-shaped verse doc with the given fields. */
function verseDoc(opts: {
  id: string
  reference: string
  kjv: string
  web: string | null
  emotionId: EmotionId
  tier: Tier
  weight?: number
  tags?: string[]
}): FakeFirestoreDoc {
  return {
    id: opts.id,
    data: () => ({
      reference: opts.reference,
      kjv: opts.kjv,
      web: opts.web,
      emotionTags: [opts.emotionId],
      emotionMeta: {
        [opts.emotionId]: {
          tier: opts.tier,
          weight: opts.weight ?? 10,
          tags: opts.tags ?? [],
        },
      },
    }),
  }
}

const cacheKey = (e: EmotionId) => `@soft_landing/verse_pool/${e}`

const setItem = AsyncStorage.setItem as unknown as Mock
const getItem = AsyncStorage.getItem as unknown as Mock
const getDocsMock = getDocs as unknown as Mock
const getMetaMock = getMessageMetadata as unknown as Mock
const updateMetaMock = updateMessageMetadata as unknown as Mock

beforeEach(() => {
  vi.clearAllMocks()
  // Default: empty metadata store.
  getMetaMock.mockResolvedValue({})
  updateMetaMock.mockResolvedValue(undefined)
  setItem.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// --- Test Group 1: Firestore fetch + cache ------------------------------

describe('selector: Firestore fetch and cache', () => {
  it('1.1 — cache miss: fetches Firestore, writes cache, returns a tier-correct message', async () => {
    getItem.mockResolvedValueOnce(null)
    getDocsMock.mockResolvedValueOnce(
      makeSnapshot([
        verseDoc({ id: 'v1', reference: 'Psalm 34:18', kjv: 'The LORD is nigh...', web: 'The Lord is close...', emotionId: 'sad', tier: 'free' }),
        verseDoc({ id: 'v2', reference: 'Psalm 147:3', kjv: 'He healeth the broken...', web: 'He heals the broken-hearted', emotionId: 'sad', tier: 'free' }),
        verseDoc({ id: 'v3', reference: 'Romans 8:28', kjv: 'And we know...', web: 'We know that...', emotionId: 'sad', tier: 'premium' }),
      ])
    )

    const msg = await selectMessage('sad', 'free')

    expect(setItem).toHaveBeenCalledWith(cacheKey('sad'), expect.any(String))
    const writtenRaw = setItem.mock.calls.find((c) => c[0] === cacheKey('sad'))?.[1] as string
    const writtenPayload = JSON.parse(writtenRaw) as { fetchedAt: string; verses: Message[] }
    expect(writtenPayload.verses).toHaveLength(3) // full pool cached, both tiers
    expect(typeof writtenPayload.fetchedAt).toBe('string')

    expect(msg.emotionId).toBe('sad')
    expect(msg.tier).toBe('free') // free user must get free message
    expect(msg.body.length).toBeGreaterThan(0)
  })

  it('1.2 — cache hit (fresh): skips Firestore and returns from cache', async () => {
    const cached = {
      fetchedAt: new Date().toISOString(),
      verses: [
        { id: 'c1', emotionId: 'stressed', body: 'KJV body 1', modernText: 'plain 1', reference: 'Phil 4:6', tags: [], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
        { id: 'c2', emotionId: 'stressed', body: 'KJV body 2', modernText: 'plain 2', reference: 'Matt 11:28', tags: [], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
      ] as Message[],
    }
    getItem.mockResolvedValueOnce(JSON.stringify(cached))

    const msg = await selectMessage('stressed', 'free')

    expect(getDocsMock).not.toHaveBeenCalled()
    expect(['c1', 'c2']).toContain(msg.id)
  })

  it('1.3 — cache hit (stale > 24h): refetches Firestore and overwrites cache', async () => {
    const stale = {
      fetchedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      verses: [
        { id: 'old1', emotionId: 'stressed', body: 'old', tags: [], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
      ] as Message[],
    }
    getItem.mockResolvedValueOnce(JSON.stringify(stale))
    getDocsMock.mockResolvedValueOnce(
      makeSnapshot([
        verseDoc({ id: 'fresh1', reference: 'Phil 4:6', kjv: 'Be careful for nothing', web: 'Do not be anxious', emotionId: 'stressed', tier: 'free' }),
      ])
    )

    await selectMessage('stressed', 'free')

    expect(getDocsMock).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledWith(cacheKey('stressed'), expect.any(String))
  })

  it('1.4 — Firestore error with stale cache: returns a verse from the stale cache', async () => {
    const stale = {
      fetchedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      verses: [
        { id: 'stale1', emotionId: 'sad', body: 'stale verse 1', tags: [], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
        { id: 'stale2', emotionId: 'sad', body: 'stale verse 2', tags: [], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
      ] as Message[],
    }
    getItem.mockResolvedValueOnce(JSON.stringify(stale))
    getDocsMock.mockRejectedValueOnce(new Error('network down'))

    const msg = await selectMessage('sad', 'free')

    expect(['stale1', 'stale2']).toContain(msg.id)
  })

  it('1.5 — Firestore error with no cache: throws a user-friendly error', async () => {
    getItem.mockResolvedValueOnce(null)
    getDocsMock.mockRejectedValueOnce(new Error('network down'))

    await expect(selectMessage('sad', 'free')).rejects.toThrow(/connection|try again/i)
  })

  it('1.6 — tier filtering: free users only see free; premium users see both tiers', async () => {
    // First call: free user
    getItem.mockResolvedValueOnce(null)
    getDocsMock.mockResolvedValueOnce(
      makeSnapshot([
        verseDoc({ id: 'tf', reference: 'r', kjv: 'free body', web: null, emotionId: 'tired', tier: 'free' }),
        verseDoc({ id: 'tp', reference: 'r', kjv: 'premium body', web: null, emotionId: 'tired', tier: 'premium' }),
      ])
    )
    const freeMsg = await selectMessage('tired', 'free')
    expect(freeMsg.id).toBe('tf')
    expect(freeMsg.tier).toBe('free')

    // Now simulate a fresh cache hit for the premium user (full pool was cached).
    const cached = {
      fetchedAt: new Date().toISOString(),
      verses: [
        { id: 'tf', emotionId: 'tired', body: 'free body', tags: [], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
        { id: 'tp', emotionId: 'tired', body: 'premium body', tags: [], tier: 'premium', weight: 10, usageCount: 0, lastUsed: null },
      ] as Message[],
    }

    // Run the premium pick many times — both ids should appear in the pool.
    const seen = new Set<string>()
    for (let i = 0; i < 50; i++) {
      getItem.mockResolvedValueOnce(JSON.stringify(cached))
      const m = await selectMessage('tired', 'premium')
      seen.add(m.id)
    }
    expect(seen.has('tf')).toBe(true)
    expect(seen.has('tp')).toBe(true)
  })
})

// --- Test Group 2: Anti-repetition weighting (regression) ---------------

describe('selector: anti-repetition weighting (regression)', () => {
  /** Build a fresh-cache payload for the given verses to bypass Firestore. */
  function freshCache(emotionId: EmotionId, verses: Message[]): string {
    return JSON.stringify({ fetchedAt: new Date().toISOString(), verses })
  }

  it('2.1 — recently-used verse is selected significantly less often than an unused one', async () => {
    const verses: Message[] = [
      { id: 'A', emotionId: 'sad', body: 'A', tags: [], tier: 'free', weight: 10, usageCount: 1, lastUsed: null },
      { id: 'B', emotionId: 'sad', body: 'B', tags: [], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
    ]
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    getMetaMock.mockResolvedValue({
      A: { lastUsed: oneHourAgo, usageCount: 1 },
    })

    const counts: Record<string, number> = { A: 0, B: 0 }
    // Sweep Math.random uniformly across the [0,1) interval.
    let seed = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      const r = (seed % 100) / 100
      seed++
      return r
    })

    for (let i = 0; i < 100; i++) {
      getItem.mockResolvedValueOnce(freshCache('sad', verses))
      const m = await selectMessage('sad', 'free')
      counts[m.id]++
    }

    randSpy.mockRestore()

    // B (unused, weight 10) vs A (penalty 0.2 → effective weight 2). Expect ~5:1.
    expect(counts.B).toBeGreaterThan(counts.A * 3)
  })

  it('2.2 — verse last used >48h ago is selected at full weight (roughly even split)', async () => {
    const verses: Message[] = [
      { id: 'A', emotionId: 'sad', body: 'A', tags: [], tier: 'free', weight: 10, usageCount: 1, lastUsed: null },
      { id: 'B', emotionId: 'sad', body: 'B', tags: [], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
    ]
    const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString()
    getMetaMock.mockResolvedValue({
      A: { lastUsed: fiftyHoursAgo, usageCount: 1 },
    })

    const counts: Record<string, number> = { A: 0, B: 0 }
    let seed = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      const r = (seed % 100) / 100
      seed++
      return r
    })

    for (let i = 0; i < 100; i++) {
      getItem.mockResolvedValueOnce(freshCache('sad', verses))
      const m = await selectMessage('sad', 'free')
      counts[m.id]++
    }

    randSpy.mockRestore()

    // Both verses at full weight 10 — distribution should be near 50/50.
    // Tolerance: each within 40-60.
    expect(counts.A).toBeGreaterThanOrEqual(40)
    expect(counts.A).toBeLessThanOrEqual(60)
    expect(counts.B).toBeGreaterThanOrEqual(40)
    expect(counts.B).toBeLessThanOrEqual(60)
  })

  it('2.3 — intent tag boost: matching-tag verse is preferred over a non-matching one', async () => {
    const verses: Message[] = [
      { id: 'A', emotionId: 'sad', body: 'A', tags: ['grief'], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
      { id: 'B', emotionId: 'sad', body: 'B', tags: ['strength'], tier: 'free', weight: 10, usageCount: 0, lastUsed: null },
    ]

    const counts: Record<string, number> = { A: 0, B: 0 }
    let seed = 0
    const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      const r = (seed % 100) / 100
      seed++
      return r
    })

    for (let i = 0; i < 100; i++) {
      getItem.mockResolvedValueOnce(JSON.stringify({ fetchedAt: new Date().toISOString(), verses }))
      const m = await selectMessage('sad', 'free', 'comfort')
      counts[m.id]++
    }

    randSpy.mockRestore()

    // A is in INTENT_TAG_MAP['comfort'] (matches "grief") → 1.5x boost; B is plain.
    // Effective weights: A=15, B=10 → expect A picked roughly 60/40.
    expect(counts.A).toBeGreaterThan(counts.B)
  })
})

// --- Test Group 3: modernText field (new) -------------------------------

describe('selector: modernText field (new)', () => {
  it('3.1 — modernText is mapped from the Firestore `web` field', async () => {
    getItem.mockResolvedValueOnce(null)
    getDocsMock.mockResolvedValueOnce(
      makeSnapshot([
        verseDoc({
          id: 'mt1',
          reference: 'Psalm 34:18',
          kjv: 'The LORD is nigh unto them that are of a broken heart',
          web: 'The Lord is close to those with a broken heart',
          emotionId: 'sad',
          tier: 'free',
        }),
      ])
    )

    const msg = await selectMessage('sad', 'free')
    expect(msg.modernText).toBe('The Lord is close to those with a broken heart')
  })

  it('3.2 — null `web` field maps to undefined modernText', async () => {
    getItem.mockResolvedValueOnce(null)
    getDocsMock.mockResolvedValueOnce(
      makeSnapshot([
        verseDoc({
          id: 'mt2',
          reference: 'Psalm 23:1',
          kjv: 'The LORD is my shepherd',
          web: null,
          emotionId: 'sad',
          tier: 'free',
        }),
      ])
    )

    const msg = await selectMessage('sad', 'free')
    expect(msg.modernText).toBeUndefined()
  })

  it('3.3 — cache round-trips modernText correctly', async () => {
    const cached = {
      fetchedAt: new Date().toISOString(),
      verses: [
        {
          id: 'rt1',
          emotionId: 'sad',
          body: 'KJV text',
          modernText: 'Plain text here',
          reference: 'Psalm 1:1',
          tags: [],
          tier: 'free',
          weight: 10,
          usageCount: 0,
          lastUsed: null,
        },
      ] as Message[],
    }
    getItem.mockResolvedValueOnce(JSON.stringify(cached))

    const msg = await selectMessage('sad', 'free')
    expect(msg.modernText).toBe('Plain text here')
  })
})
