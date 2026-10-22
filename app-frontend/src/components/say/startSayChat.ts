// Shared "start a new chat" helper for the Say feature.
//
// Lives under src/components/say/ (owned by the frontend agent) as a plain
// module — not a React component — so it stays out of app/ where Expo Router
// would otherwise treat it as a route.
//
// Firestore contract (must match backend exactly). Chat docs live DIRECTLY in
// the persona collection — there is NO literal 'chats' segment — to keep valid
// Firestore path arity (collections need an odd segment count):
//   say/{uid}/{personaId}/{chatId}
//     → { createdAt, lastMessageAt, preview, daySummary? }
//   say/{uid}/{personaId}/{chatId}/messages/{msgId}
//     → { role:'user'|'assistant'|'reachOut', content, reference?, createdAt }
//
// Backend callable:
//   startSayChat({ personaId, userName?, clientDay, prevDayStartMs, prevDayEndMs })
//     → { chatId }

import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import { getSettings, localDayKey } from '@/storage/storage'
import app from '@/services/firebase'

export type SayPersonaId = 'kind' | 'still' | 'steady' | 'wise'

type StartSayChatInput = {
  personaId: SayPersonaId
  userName?: string
  clientDay: string
  prevDayStartMs: number
  prevDayEndMs: number
}

type StartSayChatResult = { chatId: string }

// UTC epoch-ms bounds of the user's PREVIOUS local calendar day.
// Built with local `new Date(y, m, d)` constructors so the boundaries land on
// the user's local midnight, then read as .getTime() (UTC epoch ms).
//   start = local midnight at the START of yesterday
//   end   = local midnight at the START of today (exclusive upper bound)
function previousLocalDayBoundsMs(now: Date = new Date()): {
  prevDayStartMs: number
  prevDayEndMs: number
} {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  )
  return {
    prevDayStartMs: yesterdayStart.getTime(),
    prevDayEndMs: todayStart.getTime(),
  }
}

// First-name derivation — mirrors the SayPayload userName logic in the thread
// screen: AppSettings.name (first space-delimited token) with auth displayName
// as fallback.
async function deriveFirstName(): Promise<string> {
  try {
    const s = await getSettings()
    const source = (s.name || getAuth().currentUser?.displayName || '').trim()
    return source.split(/\s+/)[0] || ''
  } catch {
    const fallback = (getAuth().currentUser?.displayName || '').trim()
    return fallback.split(/\s+/)[0] || ''
  }
}

// Calls the backend `startSayChat` callable and returns the new chatId.
// All date math is computed CLIENT-side using LOCAL dates.
export async function startSayChat(personaId: SayPersonaId): Promise<string> {
  const now = new Date()
  const clientDay = localDayKey(now)
  const { prevDayStartMs, prevDayEndMs } = previousLocalDayBoundsMs(now)
  const firstName = await deriveFirstName()

  const input: StartSayChatInput = {
    personaId,
    clientDay,
    prevDayStartMs,
    prevDayEndMs,
    ...(firstName ? { userName: firstName } : {}),
  }

  const fn = httpsCallable<StartSayChatInput, StartSayChatResult>(
    getFunctions(app, 'us-central1'),
    'startSayChat',
  )
  const { data } = await fn(input)
  return data.chatId
}
