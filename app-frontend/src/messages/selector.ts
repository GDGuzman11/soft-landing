import type { EmotionId, Message, Tier } from '../types'
import { getMessageMetadata, updateMessageMetadata } from '../storage/storage'
import { V1_UNLOCK_ALL } from '../constants'
import versesData from './verses.json'

const RECENT_PENALTY_HOURS = 48
const RECENT_PENALTY_FACTOR = 0.2

const INTENT_TAG_MAP: Record<string, string[]> = {
  peace:    ['comfort', 'rest', 'presence'],
  strength: ['perseverance', 'strength', 'courage'],
  comfort:  ['grief', 'comfort', 'healing'],
  guidance: ['wisdom', 'direction', 'trust'],
}

/** Shape of a verse entry in the bundled `verses.json` (built by scripts/build-verses.mjs). */
interface RawVerse {
  id: string
  emotionId: EmotionId
  body: string
  modernText?: string
  reference: string
  message: string
  tags: string[]
  tier: Tier
  weight: number
}

const ALL_VERSES = versesData as unknown as RawVerse[]
const BY_ID = new Map<string, RawVerse>(ALL_VERSES.map((v) => [v.id, v]))

function toMessage(v: RawVerse): Message {
  return {
    id: v.id,
    emotionId: v.emotionId,
    body: v.body,
    ...(v.modernText ? { modernText: v.modernText } : {}),
    reference: v.reference,
    message: v.message,
    tags: v.tags,
    tier: v.tier,
    weight: v.weight,
    usageCount: 0,
    lastUsed: null,
  }
}

/** Look up a verse by its stable id (e.g. "sad-012"). Offline, from verses.json. */
export function getVerseById(id: string): Message | null {
  const v = BY_ID.get(id)
  return v ? toMessage(v) : null
}

/** Filter a pool down to the tier the user is allowed to see. */
function filterByTier(verses: Message[], tier: Tier): Message[] {
  // Free-first V1: everyone sees the full pool. V1.1 re-gates via RevenueCat.
  if (V1_UNLOCK_ALL) return verses
  return verses.filter((v) => tier === 'premium' || v.tier === 'free')
}

/**
 * The full verse pool for an emotion, read from the bundled `verses.json`.
 * Fully offline — no network, no cache. Verse text + the per-verse message are
 * baked in at build time from the curated refs (scripts/verse-refs.json) joined
 * against the bundled KJV + WEB datasets.
 *
 * Kept async so existing callers (selectMessage, performCheckIn) are unchanged.
 */
async function fetchVersePool(emotionId: EmotionId, tier: Tier): Promise<Message[]> {
  const pool = ALL_VERSES.filter((v) => v.emotionId === emotionId).map(toMessage)
  return filterByTier(pool, tier)
}

/** Overlay stored usage metadata (lastUsed/usageCount) onto a pool. */
function applyMetadata(
  pool: Message[],
  meta: Record<string, { lastUsed: string; usageCount: number }>
): Message[] {
  return pool.map((m) => ({
    ...m,
    lastUsed: meta[m.id]?.lastUsed ?? m.lastUsed,
    usageCount: meta[m.id]?.usageCount ?? m.usageCount,
  }))
}

function effectiveWeight(message: Message, now: Date, intentTags: string[]): number {
  const tagBoost = intentTags.some((tag) => message.tags.includes(tag)) ? 1.5 : 1

  if (!message.lastUsed) return message.weight * tagBoost

  const hoursSinceUsed = (now.getTime() - new Date(message.lastUsed).getTime()) / 3_600_000
  if (hoursSinceUsed < RECENT_PENALTY_HOURS) {
    return message.weight * RECENT_PENALTY_FACTOR * tagBoost
  }
  return message.weight * tagBoost
}

/** Weighted random pick over a pool using effectiveWeight. */
function weightedPick(pool: Message[], now: Date, intentTags: string[]): Message {
  const weights = pool.map((m) => effectiveWeight(m, now, intentTags))
  const total = weights.reduce((sum, w) => sum + w, 0)

  let rand = Math.random() * total
  let selected = pool[pool.length - 1]
  for (let i = 0; i < pool.length; i++) {
    rand -= weights[i]
    if (rand <= 0) {
      selected = pool[i]
      break
    }
  }
  return selected
}

/**
 * Pick a single verse for the given emotion + tier, applying intent-tag boosting
 * and a 48h anti-repetition penalty. Records the selection via
 * `updateMessageMetadata` so the anti-repetition window applies on later calls.
 */
export async function selectMessage(
  emotionId: EmotionId,
  tier: Tier,
  primaryIntent?: string | null
): Promise<Message> {
  const now = new Date()
  const meta = await getMessageMetadata()
  const intentTags = primaryIntent ? (INTENT_TAG_MAP[primaryIntent] ?? []) : []

  const pool = applyMetadata(await fetchVersePool(emotionId, tier), meta)
  if (pool.length === 0) throw new Error(`No messages found for emotion: ${emotionId}`)

  const selected = weightedPick(pool, now, intentTags)
  await updateMessageMetadata(selected.id)
  return selected
}

/**
 * Pick a *different* verse for the "New verse" button: excludes `excludeId`,
 * applies the same weighting, and does NOT write usage metadata (browsing
 * alternatives has no side effects). Falls back to the full pool if excluding
 * leaves nothing.
 */
export async function fetchFreshVerse(
  emotionId: EmotionId,
  tier: Tier,
  excludeId: string,
  primaryIntent?: string | null
): Promise<Message> {
  const now = new Date()
  const meta = await getMessageMetadata()
  const intentTags = primaryIntent ? (INTENT_TAG_MAP[primaryIntent] ?? []) : []

  const full = applyMetadata(await fetchVersePool(emotionId, tier), meta)
  if (full.length === 0) throw new Error(`No verses found for emotion: ${emotionId}`)

  const pool = full.filter((m) => m.id !== excludeId)
  return weightedPick(pool.length > 0 ? pool : full, now, intentTags)
}
