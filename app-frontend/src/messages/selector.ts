import AsyncStorage from '@react-native-async-storage/async-storage'
import { collection, getDocs, query, where } from 'firebase/firestore'
import type { EmotionId, Message, Tier } from '../types'
import { db } from '../services/firebase'
import { getMessageMetadata, updateMessageMetadata } from '../storage/storage'

const RECENT_PENALTY_HOURS = 48
const RECENT_PENALTY_FACTOR = 0.2
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** Prefix for per-emotion verse pool cache keys. Namespaced under `@soft_landing/`. */
const VERSE_POOL_KEY_PREFIX = '@soft_landing/verse_pool/' as const

const INTENT_TAG_MAP: Record<string, string[]> = {
  peace:    ['comfort', 'rest', 'presence'],
  strength: ['perseverance', 'strength', 'courage'],
  comfort:  ['grief', 'comfort', 'healing'],
  guidance: ['wisdom', 'direction', 'trust'],
}

/**
 * Shape of a single verse document in the Firestore `verses` collection.
 * Only the fields consumed by the selector are typed here.
 */
interface VerseDoc {
  reference: string
  kjv: string
  web: string | null
  emotionTags: EmotionId[]
  emotionMeta: Partial<Record<EmotionId, { tier: Tier; weight: number; tags: string[] }>>
}

/** AsyncStorage payload for the per-emotion verse pool cache. */
interface CachedPool {
  fetchedAt: string
  verses: Message[]
}

/** Cache key for an emotion's verse pool. Namespaced under `@soft_landing/`. */
function cacheKey(emotionId: EmotionId): string {
  return `${VERSE_POOL_KEY_PREFIX}${emotionId}`
}

/** Filter a fully-fetched pool down to the tier the user is allowed to see. */
function filterByTier(verses: Message[], tier: Tier): Message[] {
  return verses.filter((v) => tier === 'premium' || v.tier === 'free')
}

/**
 * Map a raw Firestore verse document into the in-app `Message` shape.
 * Returns null if the doc is missing the requested emotion's metadata.
 */
function mapVerseDoc(id: string, data: VerseDoc, emotionId: EmotionId): Message | null {
  const meta = data.emotionMeta[emotionId]
  if (!meta) return null
  return {
    id,
    emotionId,
    body: data.kjv,
    modernText: data.web ?? undefined,
    reference: data.reference,
    tags: meta.tags,
    tier: meta.tier,
    weight: meta.weight,
    usageCount: 0,
    lastUsed: null,
  }
}

/**
 * Fetch the full verse pool for an emotion, with a 24-hour AsyncStorage cache.
 *
 * - On fresh cache (< 24h): returns cached verses, filtered by tier, no network.
 * - On stale or missing cache: queries Firestore, persists the full pool, then
 *   returns the tier-filtered slice.
 * - On Firestore error: falls back to stale cache (any age) if present;
 *   otherwise throws a user-friendly error.
 *
 * The cache stores the full free+premium pool so a tier upgrade does not
 * require an immediate refetch.
 */
async function fetchVersePool(emotionId: EmotionId, tier: Tier): Promise<Message[]> {
  const key = cacheKey(emotionId)

  let cached: CachedPool | null = null
  try {
    const raw = await AsyncStorage.getItem(key)
    if (raw) cached = JSON.parse(raw) as CachedPool
  } catch {
    cached = null
  }

  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime()
    if (age < CACHE_TTL_MS) {
      return filterByTier(cached.verses, tier)
    }
  }

  try {
    const q = query(collection(db, 'verses'), where('emotionTags', 'array-contains', emotionId))
    const snap = await getDocs(q)

    const pool: Message[] = []
    snap.forEach((doc) => {
      const mapped = mapVerseDoc(doc.id, doc.data() as VerseDoc, emotionId)
      if (mapped) pool.push(mapped)
    })

    const payload: CachedPool = { fetchedAt: new Date().toISOString(), verses: pool }
    try {
      await AsyncStorage.setItem(key, JSON.stringify(payload))
    } catch {
      // cache write failure is non-fatal — we still return the fresh pool
    }

    return filterByTier(pool, tier)
  } catch {
    if (cached) {
      // Stale cache fallback when the network is unavailable.
      return filterByTier(cached.verses, tier)
    }
    throw new Error('Unable to load verses. Please check your connection and try again.')
  }
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

/**
 * Pick a single validating message for the given emotion + tier, applying
 * intent-tag boosting and a 48h anti-repetition penalty.
 *
 * Side effect: records the selection via `updateMessageMetadata` so the
 * anti-repetition window applies on subsequent calls.
 */
export async function selectMessage(
  emotionId: EmotionId,
  tier: Tier,
  primaryIntent?: string | null
): Promise<Message> {
  const now = new Date()
  const meta = await getMessageMetadata()

  const intentTags = primaryIntent ? (INTENT_TAG_MAP[primaryIntent] ?? []) : []

  const fetched = await fetchVersePool(emotionId, tier)
  const pool = fetched.map((m) => ({
    ...m,
    lastUsed: meta[m.id]?.lastUsed ?? m.lastUsed,
    usageCount: meta[m.id]?.usageCount ?? m.usageCount,
  }))

  if (pool.length === 0) throw new Error(`No messages found for emotion: ${emotionId}`)

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

  await updateMessageMetadata(selected.id)
  return selected
}
