import type { CheckInEvent, EmotionId, Message, SavedMessage } from '../types'
import { generateId } from '../utils/id'
import { selectMessage } from '../messages/selector'
import {
  addCheckIn,
  getSettings,
  incrementCheckInCount,
  saveMessage,
} from '../storage/storage'

export interface CheckInResult {
  event: CheckInEvent
  message: Message
}

export async function canCheckIn(): Promise<boolean> {
  // BUG-014: quota check disabled for testing — re-enable before App Store submission.
  // Original implementation read subscription tier (premium → unlimited) and
  // compared getTodayCheckInCount() against FREE_CHECKINS_PER_DAY.
  return true
}

export async function performCheckIn(emotionId: EmotionId): Promise<CheckInResult> {
  const settings = await getSettings().catch(() => null)
  const tier = settings?.subscription.tier ?? 'free'
  const primaryIntent = settings?.primaryIntent ?? null
  const message = await selectMessage(emotionId, tier, primaryIntent)

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

type BookmarkExtras = {
  letter?: string
  note?: string
  emotionId?: EmotionId
}

export async function bookmarkMessage(
  checkInId: string,
  messageId: string,
  extras?: BookmarkExtras
): Promise<SavedMessage> {
  const entry: SavedMessage = {
    id: generateId(),
    checkInId,
    messageId,
    savedAt: new Date().toISOString(),
    ...(extras?.note !== undefined && { note: extras.note }),
    ...(extras?.letter !== undefined && { letter: extras.letter }),
    ...(extras?.emotionId !== undefined && { emotionId: extras.emotionId }),
  }
  try {
    await saveMessage(entry)
  } catch {
    // non-fatal
  }
  return entry
}
