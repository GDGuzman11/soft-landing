import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'

if (getApps().length === 0) {
  initializeApp()
}

// Limits — separate from letterUsage so frontend can show distinct copy.
const FREE_DAILY_LIMIT = 20
const PREMIUM_DAILY_LIMIT = 200
const BURST_LIMIT = 5
const BURST_WINDOW_MS = 60 * 1000 // 60 seconds

interface SayUsageDoc {
  dailyCount: number
  dailyResetAt: Timestamp
  lastMessageAt: Timestamp
  burstCount: number
  burstWindowStart: Timestamp
}

/**
 * Returns the UTC midnight that begins the calendar day AFTER `now`.
 * This is the moment dailyCount should next reset.
 */
function nextUtcMidnight(now: Date): Date {
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ))
  return next
}

/**
 * Throws on rate limit:
 *   - 'SAY_DAILY_LIMIT' when dailyCount has hit the cap for the user's tier
 *   - 'SAY_BURST_LIMIT' when more than BURST_LIMIT messages have arrived
 *     inside the last BURST_WINDOW_MS
 *
 * Daily count resets at UTC midnight. We store `dailyResetAt` as the next
 * scheduled reset moment; if `now >= dailyResetAt` we are in a fresh day.
 */
export async function checkSayRateLimit(uid: string, isPremium: boolean): Promise<void> {
  const db = getFirestore()
  const ref = db.collection('sayUsage').doc(uid)
  const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const nowDate = new Date()
    const nowTs = Timestamp.fromDate(nowDate)
    const nextResetTs = Timestamp.fromDate(nextUtcMidnight(nowDate))

    if (!snap.exists) {
      tx.set(ref, {
        dailyCount: 1,
        dailyResetAt: nextResetTs,
        lastMessageAt: nowTs,
        burstCount: 1,
        burstWindowStart: nowTs,
      })
      return
    }

    const data = snap.data() as SayUsageDoc

    // Daily window roll-over: if we've crossed the stored reset moment,
    // start a new day.
    const inNewDay = nowDate.getTime() >= data.dailyResetAt.toMillis()
    const nextDailyCount = inNewDay ? 1 : data.dailyCount + 1
    const nextDailyResetAt = inNewDay ? nextResetTs : data.dailyResetAt

    if (!inNewDay && data.dailyCount >= dailyLimit) {
      throw new Error('SAY_DAILY_LIMIT')
    }

    // Burst window: rolling 60s window
    const burstWindowExpired =
      nowDate.getTime() - data.burstWindowStart.toMillis() > BURST_WINDOW_MS
    const nextBurstCount = burstWindowExpired ? 1 : data.burstCount + 1
    const nextBurstWindowStart = burstWindowExpired ? nowTs : data.burstWindowStart

    if (!burstWindowExpired && data.burstCount >= BURST_LIMIT) {
      throw new Error('SAY_BURST_LIMIT')
    }

    tx.update(ref, {
      dailyCount: nextDailyCount,
      dailyResetAt: nextDailyResetAt,
      lastMessageAt: nowTs,
      burstCount: nextBurstCount,
      burstWindowStart: nextBurstWindowStart,
      // Belt-and-braces: if you ever query, FieldValue.serverTimestamp() on
      // lastMessageAt would also be acceptable. We use client-derived `now`
      // here so the transaction stays deterministic across retries.
    })
  })
}

// Re-exported constants for tests and frontend coordination.
export const SAY_LIMITS = {
  FREE_DAILY_LIMIT,
  PREMIUM_DAILY_LIMIT,
  BURST_LIMIT,
  BURST_WINDOW_MS,
} as const

// Quiet the unused-import warning if FieldValue ends up unused after edits;
// it's exported here so future increments can swap to FieldValue.increment.
void FieldValue
