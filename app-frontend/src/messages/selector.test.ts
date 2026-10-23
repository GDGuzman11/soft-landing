/**
 * Unit tests for the bundled-JSON verse selector (post-Firestore migration).
 *
 * Covers:
 *   - selectMessage returns an emotion-appropriate verse and records usage
 *   - Tier filtering (free never yields premium when V1_UNLOCK_ALL is off)
 *   - fetchFreshVerse excludes the current verse ("New verse" button)
 *   - getVerseById lookup
 *   - Reflection one-liner loader avoids immediate repeats
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { EmotionId } from '../types'

// Tier filtering is bypassed app-wide in V1 via V1_UNLOCK_ALL; force it off here
// so these tests exercise the underlying tier gate (re-enabled in V1.1).
vi.mock('../constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../constants')>()),
  V1_UNLOCK_ALL: false,
}))

vi.mock('../storage/storage', () => ({
  getMessageMetadata: vi.fn(),
  updateMessageMetadata: vi.fn(),
}))

import { selectMessage, fetchFreshVerse, getVerseById } from './selector'
import { getReflectionLine } from './reflections'
import { getMessageMetadata, updateMessageMetadata } from '../storage/storage'

const getMetaMock = getMessageMetadata as unknown as Mock
const updateMetaMock = updateMessageMetadata as unknown as Mock

const EMOTIONS: EmotionId[] = ['good', 'neutral', 'tired', 'sad', 'stressed']

beforeEach(() => {
  vi.clearAllMocks()
  getMetaMock.mockResolvedValue({})
  updateMetaMock.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('selectMessage', () => {
  it('returns a verse that matches the requested emotion', async () => {
    for (const emotion of EMOTIONS) {
      const msg = await selectMessage(emotion, 'free')
      expect(msg.emotionId).toBe(emotion)
      expect(typeof msg.body).toBe('string')
      expect(msg.body.length).toBeGreaterThan(0)
      expect(typeof msg.reference).toBe('string')
    }
  })

  it('records the selection via updateMessageMetadata', async () => {
    const msg = await selectMessage('sad', 'free')
    expect(updateMetaMock).toHaveBeenCalledWith(msg.id)
  })

  it('exposes modernText (WEB) when present', async () => {
    const msg = await selectMessage('stressed', 'free')
    // Every curated verse currently resolves a WEB rendering.
    expect(typeof msg.modernText).toBe('string')
  })
})

describe('tier filtering (V1_UNLOCK_ALL off)', () => {
  it('never returns a premium verse on the free tier', async () => {
    for (let i = 0; i < 60; i++) {
      const msg = await selectMessage('stressed', 'free')
      expect(msg.tier).toBe('free')
    }
  })
})

describe('fetchFreshVerse', () => {
  it('never returns the excluded verse', async () => {
    const first = await selectMessage('sad', 'free')
    for (let i = 0; i < 40; i++) {
      const next = await fetchFreshVerse('sad', 'free', first.id)
      expect(next.id).not.toBe(first.id)
      expect(next.emotionId).toBe('sad')
    }
  })

  it('does not record usage metadata (browsing has no side effects)', async () => {
    const first = await selectMessage('good', 'free')
    updateMetaMock.mockClear()
    await fetchFreshVerse('good', 'free', first.id)
    expect(updateMetaMock).not.toHaveBeenCalled()
  })
})

describe('getVerseById', () => {
  it('resolves a known id and returns null for an unknown one', () => {
    const v = getVerseById('good-001')
    expect(v).not.toBeNull()
    expect(v?.emotionId).toBe('good')
    expect(getVerseById('does-not-exist')).toBeNull()
  })
})

describe('getReflectionLine', () => {
  it('returns a non-empty line for every emotion', () => {
    for (const emotion of EMOTIONS) {
      const { line, index } = getReflectionLine(emotion)
      expect(line.length).toBeGreaterThan(0)
      expect(index).toBeGreaterThanOrEqual(0)
    }
  })

  it('avoids the excluded index so "New line" changes the prompt', () => {
    for (let i = 0; i < 40; i++) {
      const { index } = getReflectionLine('tired', 0)
      expect(index).not.toBe(0)
    }
  })
})
