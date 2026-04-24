import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'

if (getApps().length === 0) {
  initializeApp()
}

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 20

interface UsageDoc {
  count: number
  windowStart: number
}

export async function checkRateLimit(uid: string): Promise<void> {
  const db = getFirestore()
  const ref = db.collection('letterUsage').doc(uid)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const now = Date.now()

    if (!snap.exists) {
      tx.set(ref, { count: 1, windowStart: now })
      return
    }

    const data = snap.data() as UsageDoc
    const windowExpired = now - data.windowStart > WINDOW_MS

    if (windowExpired) {
      tx.set(ref, { count: 1, windowStart: now })
      return
    }

    if (data.count >= MAX_REQUESTS) {
      throw new Error('RATE_LIMIT_EXCEEDED')
    }

    tx.update(ref, { count: FieldValue.increment(1) })
  })
}
