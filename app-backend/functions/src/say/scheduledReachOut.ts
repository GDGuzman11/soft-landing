import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { deliverReachOutForUser } from './deliverReachOutForUser'

if (getApps().length === 0) {
  initializeApp()
}

export const scheduledReachOut = onSchedule(
  { schedule: 'every 30 minutes', region: 'us-central1' },
  async () => {
    const db = getFirestore()
    const tokenSnaps = await db.collection('pushTokens').get()

    await Promise.allSettled(
      tokenSnaps.docs
        .filter((doc) => {
          const d = doc.data()
          return d.token && d.isPremium === true
        })
        .map(async (doc) => {
          const { timezoneOffset } = doc.data() as { timezoneOffset?: number }
          await deliverReachOutForUser(doc.id, timezoneOffset ?? 0, db)
        }),
    )
  },
)
