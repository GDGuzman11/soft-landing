import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { REACH_OUT_POOLS } from './reachOutMessages'
import { type SayPersonaId } from './sayPrompt'

if (getApps().length === 0) {
  initializeApp()
}

const ALL_PERSONAS: readonly SayPersonaId[] = ['kind', 'still', 'steady', 'wise']
const DAILY_LIMIT = 1
const WEEKLY_LIMIT = 3
const REACH_OUT_COOLDOWN_MS = 48 * 60 * 60 * 1000
const ACTIVE_CONVO_WINDOW_MS = 24 * 60 * 60 * 1000
const RECENTLY_USED_MAX = 60

interface MaybeDeliverReachOutData {
  userTimezoneOffset?: number
}

interface MaybeDeliverReachOutResult {
  delivered: boolean
  personaId?: string
}

interface ReachOutDeliveryDoc {
  dailyCount: number
  dailyResetAt: Timestamp
  weeklyCount: number
  weeklyResetAt: Timestamp
  recentlyUsed: string[]
}

interface VoiceState {
  hasUnread?: boolean
  muted?: boolean
  lastReachOutAt?: Timestamp
}

type SayStateDoc = Record<string, VoiceState>

function isInValidTimeWindow(offsetHours: number): boolean {
  const nowUtc = Date.now()
  const localMs = nowUtc + offsetHours * 60 * 60 * 1000
  const localHour = new Date(localMs).getUTCHours()
  // Valid: 8-10am or 9-11pm local
  return (localHour >= 8 && localHour < 10) || (localHour >= 21 && localHour < 23)
}

function nextUtcMidnight(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
}

function nextMondayUtcMidnight(): Date {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday))
}

export const maybeDeliverReachOut = onCall(
  { region: 'us-central1', invoker: 'public' },
  async (request): Promise<MaybeDeliverReachOutResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to use Say.')
    }
    const uid = request.auth.uid
    const raw = request.data as Partial<MaybeDeliverReachOutData> | undefined
    const offsetHours = typeof raw?.userTimezoneOffset === 'number' ? raw.userTimezoneOffset : 0

    // Check time window
    if (!isInValidTimeWindow(offsetHours)) {
      return { delivered: false }
    }

    const db = getFirestore()
    const deliveryRef = db.collection('sayReachOutDelivery').doc(uid)
    const stateRef = db.collection('sayState').doc(uid)
    const now = Date.now()

    // Load delivery doc
    const deliverySnap = await deliveryRef.get()
    const delivery = deliverySnap.data() as ReachOutDeliveryDoc | undefined

    // Check and reset daily counter
    let dailyCount = delivery?.dailyCount ?? 0
    const dailyResetAt = delivery?.dailyResetAt?.toMillis() ?? 0
    if (now >= dailyResetAt) dailyCount = 0

    if (dailyCount >= DAILY_LIMIT) return { delivered: false }

    // Check and reset weekly counter
    let weeklyCount = delivery?.weeklyCount ?? 0
    const weeklyResetAt = delivery?.weeklyResetAt?.toMillis() ?? 0
    if (now >= weeklyResetAt) weeklyCount = 0

    if (weeklyCount >= WEEKLY_LIMIT) return { delivered: false }

    const recentlyUsed: string[] = delivery?.recentlyUsed ?? []

    // Load sayState (single doc with map fields keyed by personaId)
    const stateSnap = await stateRef.get().catch(() => null)
    const stateData = stateSnap?.data() as SayStateDoc | undefined

    // Find eligible voices
    const eligibleVoices: SayPersonaId[] = []
    const messageCounts: Record<string, number> = {}

    for (const personaId of ALL_PERSONAS) {
      const voiceState = stateData?.[personaId]

      // Check muted
      if (voiceState?.muted) continue

      // Check 48h cooldown since last reach-out to this voice
      const lastReachOut = voiceState?.lastReachOutAt?.toMillis() ?? 0
      if (now - lastReachOut < REACH_OUT_COOLDOWN_MS) continue

      // Check if user has sent messages in last 24h to this voice (active conversation)
      try {
        const recentUserSnap = await db
          .collection('say').doc(uid).collection(personaId)
          .where('role', '==', 'user')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get()
        if (!recentUserSnap.empty) {
          const lastMsg = recentUserSnap.docs[0].data()
          const lastMsgTime = (lastMsg.createdAt as Timestamp | undefined)?.toMillis() ?? 0
          if (now - lastMsgTime < ACTIVE_CONVO_WINDOW_MS) continue
        }
        messageCounts[personaId] = recentUserSnap.size
      } catch {
        // Count query failed — still eligible, just skip message count preference
        messageCounts[personaId] = 0
      }

      eligibleVoices.push(personaId)
    }

    if (eligibleVoices.length === 0) return { delivered: false }

    // Prefer voices the user has engaged with (non-zero message count)
    const engaged = eligibleVoices.filter((v) => (messageCounts[v] ?? 0) > 0)
    const pool = engaged.length > 0 ? engaged : eligibleVoices
    const personaId = pool[Math.floor(Math.random() * pool.length)]
    if (!personaId) return { delivered: false }

    // Pick a message not used recently
    const voicePool = REACH_OUT_POOLS[personaId]
    if (!voicePool || voicePool.length === 0) return { delivered: false }

    // recentlyUsed entries: "personaId:index"
    const usedIndices = new Set(
      recentlyUsed
        .filter((k) => k.startsWith(`${personaId}:`))
        .map((k) => parseInt(k.split(':')[1] ?? '-1', 10)),
    )
    const availableIndices = voicePool
      .map((_, i) => i)
      .filter((i) => !usedIndices.has(i))
    const pickFrom = availableIndices.length > 0 ? availableIndices : voicePool.map((_, i) => i)
    const pickedIndex = pickFrom[Math.floor(Math.random() * pickFrom.length)]
    if (typeof pickedIndex !== 'number') return { delivered: false }
    const picked = voicePool[pickedIndex]
    if (!picked) return { delivered: false }

    // Write the reach-out message to /say/{uid}/{personaId}/
    const msgRef = db.collection('say').doc(uid).collection(personaId).doc()
    await msgRef.set({
      role: 'reachOut',
      content: picked.text,
      ...(picked.reference ? { reference: picked.reference } : {}),
      createdAt: FieldValue.serverTimestamp(),
    })

    // Update /sayState/{uid} — merge the per-voice map field.
    await stateRef.set(
      {
        [personaId]: {
          hasUnread: true,
          lastReachOutAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    )

    // Update delivery rate-limit doc
    const newRecentlyUsed = [...recentlyUsed, `${personaId}:${pickedIndex}`].slice(-RECENTLY_USED_MAX)

    const newDailyResetAt = now >= dailyResetAt ? nextUtcMidnight() : new Date(dailyResetAt)
    const newWeeklyResetAt = now >= weeklyResetAt ? nextMondayUtcMidnight() : new Date(weeklyResetAt)

    await deliveryRef.set(
      {
        dailyCount: dailyCount + 1,
        dailyResetAt: Timestamp.fromDate(newDailyResetAt),
        weeklyCount: weeklyCount + 1,
        weeklyResetAt: Timestamp.fromDate(newWeeklyResetAt),
        recentlyUsed: newRecentlyUsed,
      },
      { merge: true },
    )

    return { delivered: true, personaId }
  },
)
