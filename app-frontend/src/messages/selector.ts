import type { EmotionId, Message, Tier } from '../types'
import { getMessageMetadata, updateMessageMetadata } from '../storage/storage'
import catalog from './catalog.json'

const RECENT_PENALTY_HOURS = 48
const RECENT_PENALTY_FACTOR = 0.2

const INTENT_TAG_MAP: Record<string, string[]> = {
  peace:    ['comfort', 'rest', 'presence'],
  strength: ['perseverance', 'strength', 'courage'],
  comfort:  ['grief', 'comfort', 'healing'],
  guidance: ['wisdom', 'direction', 'trust'],
}

function effectiveWeight(message: Message, now: Date, intentTags: string[]): number {
  const tagBoost = intentTags.some((tag) => message.tags?.includes(tag)) ? 1.5 : 1

  if (!message.lastUsed) return message.weight * tagBoost

  const hoursSinceUsed = (now.getTime() - new Date(message.lastUsed).getTime()) / 3_600_000
  if (hoursSinceUsed < RECENT_PENALTY_HOURS) {
    return message.weight * RECENT_PENALTY_FACTOR * tagBoost
  }
  return message.weight * tagBoost
}

export async function selectMessage(
  emotionId: EmotionId,
  tier: Tier,
  primaryIntent?: string | null
): Promise<Message> {
  const now = new Date()
  const meta = await getMessageMetadata()

  const intentTags = primaryIntent ? (INTENT_TAG_MAP[primaryIntent] ?? []) : []

  const pool = (catalog as Message[])
    .filter((m) => m.emotionId === emotionId && (tier === 'premium' || m.tier === 'free'))
    .map((m) => ({
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
