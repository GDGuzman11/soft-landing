import type { EmotionId, Message, Tier } from '../types'
import catalog from './catalog.json'

const RECENT_PENALTY_HOURS = 48
const RECENT_PENALTY_FACTOR = 0.2

function effectiveWeight(message: Message, now: Date): number {
  if (!message.lastUsed) return message.weight

  const hoursSinceUsed = (now.getTime() - new Date(message.lastUsed).getTime()) / 3_600_000
  if (hoursSinceUsed < RECENT_PENALTY_HOURS) {
    return message.weight * RECENT_PENALTY_FACTOR
  }
  return message.weight
}

export function selectMessage(emotionId: EmotionId, tier: Tier): Message {
  const now = new Date()
  const pool = (catalog as Message[]).filter(
    (m) => m.emotionId === emotionId && (tier === 'premium' || m.tier === 'free')
  )

  if (pool.length === 0) throw new Error(`No messages found for emotion: ${emotionId}`)

  const weights = pool.map((m) => effectiveWeight(m, now))
  const total = weights.reduce((sum, w) => sum + w, 0)

  let rand = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return pool[i]
  }

  return pool[pool.length - 1]
}
