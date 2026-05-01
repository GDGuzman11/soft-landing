import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { deliverReachOutForUser } from './deliverReachOutForUser'

if (getApps().length === 0) {
  initializeApp()
}

export const maybeDeliverReachOut = onCall(
  { region: 'us-central1', invoker: 'public' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to use Say.')
    }
    const uid = request.auth.uid
    const raw = request.data as { userTimezoneOffset?: number } | undefined
    const offsetHours = typeof raw?.userTimezoneOffset === 'number' ? raw.userTimezoneOffset : 0
    return deliverReachOutForUser(uid, offsetHours, getFirestore())
  },
)
