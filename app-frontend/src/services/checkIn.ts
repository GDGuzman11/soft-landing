import type { CheckInEvent, EmotionId, Message, SavedMessage } from '../types'
import { generateId } from '../utils/id'
import { selectMessage } from '../messages/selector'
import {
  addCheckIn,
  getTodayCheckInCount,
  getSettings,
  incrementCheckInCount,
  saveMessage,
} from '../storage/storage'
import { FREE_CHECKINS_PER_DAY } from '../constants'

export interface CheckInResult {
  event: CheckInEvent
  message: Message
}

export async function canCheckIn(): Promise<boolean> {
  try {
    const settings = await getSettings()
    if (settings.subscription.tier === 'premium') return true
    const count = await getTodayCheckInCount()
    return count < FREE_CHECKINS_PER_DAY
  } catch {
    return true // fail open — don't block the user if storage is unavailable
  }
}

export async function performCheckIn(emotionId: EmotionId): Promise<CheckInResult> {
  const tier = await getSettings().then((s) => s.subscription.tier).catch(() => 'free' as const)
  const message = selectMessage(emotionId, tier)

  const event: CheckInEvent = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    emotionId,
    messageId: message.id,
    saved: false,
  }

  try {
    await addCheckIn(event)
    await incrementCheckInCount()
  } catch {
    // non-fatal — message still shows even if we can't persist
  }

  return { event, message }
}

export async function bookmarkMessage(
  checkInId: string,
  messageId: string
): Promise<SavedMessage> {
  const entry: SavedMessage = {
    id: generateId(),
    checkInId,
    messageId,
    savedAt: new Date().toISOString(),
  }
  try {
    await saveMessage(entry)
  } catch {
    // non-fatal
  }
  return entry
}
