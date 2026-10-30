// premium.ts — server-trusted premium gating. Everything here is INERT until
// ENFORCE_PREMIUM is flipped true (post-TestFlight): callers guard every new
// limit/gate on ENFORCE_PREMIUM, so with it false the app behaves exactly as
// it did before (everyone gets the generous free caps, all voices open).

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'

if (getApps().length === 0) {
  initializeApp()
}

// MASTER server-side switch. Keep false for TestFlight. Flip true at launch
// alongside the frontend V1_UNLOCK_ALL=false.
export const ENFORCE_PREMIUM = false

// Free tier: AI "Dear You" letters per day (the verse itself is always free).
export const FREE_LETTERS_PER_DAY = 1

// Premium-only voices (Kind is the free voice).
const PREMIUM_VOICES = new Set(['still', 'steady', 'wise'])
export function isPremiumVoice(personaId: string): boolean {
  return PREMIUM_VOICES.has(personaId)
}

/**
 * Server-trusted premium check. Reads users/{uid}.isPremium, written only by
 * the RevenueCat webhook (never the client). Returns false on any miss/expiry.
 */
export async function isUserPremium(uid: string): Promise<boolean> {
  try {
    const snap = await getFirestore().collection('users').doc(uid).get()
    const d = snap.data()
    if (!d || d.isPremium !== true) return false
    const exp = d.expiresAt
    if (exp && typeof exp.toMillis === 'function' && exp.toMillis() < Date.now()) return false
    return true
  } catch {
    return false
  }
}

function utcDayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Free-tier daily letter cap. Throws 'LETTER_DAILY_LIMIT' when the free user
 * has already used FREE_LETTERS_PER_DAY today. Uses separate fields on the
 * existing letterUsage/{uid} doc (daily*), so it coexists with the hourly
 * abuse guard in rateLimit.ts. Only call when ENFORCE_PREMIUM && !isPremium.
 */
export async function checkLetterDailyLimit(uid: string): Promise<void> {
  const db = getFirestore()
  const ref = db.collection('letterUsage').doc(uid)
  const today = utcDayKey(new Date())
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? (snap.data() as { dailyKey?: string; dailyCount?: number }) : {}
    const sameDay = data.dailyKey === today
    const dailyCount = sameDay ? data.dailyCount ?? 0 : 0
    if (dailyCount >= FREE_LETTERS_PER_DAY) {
      throw new Error('LETTER_DAILY_LIMIT')
    }
    tx.set(ref, { dailyKey: today, dailyCount: dailyCount + 1, lastLetterAt: FieldValue.serverTimestamp() }, { merge: true })
  })
}
