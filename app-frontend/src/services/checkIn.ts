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
  const settings = await getSettings()
  if (settings.subscription.tier === 'premium') return true

  const count = await getTodayCheckInCount()
  return count < FREE_CHECKINS_PER_DAY
}

export async function performCheckIn(emotionId: EmotionId): Promise<CheckInResult> {
  const settings = await getSettings()
  const message = selectMessage(emotionId, settings.subscription.tier)

  const event: CheckInEvent = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    emotionId,
    messageId: message.id,
    saved: false,
  }

  await addCheckIn(event)
  await incrementCheckInCount()

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
  await saveMessage(entry)
  return entry
}
