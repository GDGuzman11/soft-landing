// revenueCatWebhook.ts — RevenueCat → Firestore users/{uid}.isPremium, the
// single server-trusted source of premium state (closes the local-only bypass,
// BUG-026). DORMANT until activation: RevenueCat won't call it until you set the
// webhook URL + secret in the dashboard, and deploy it (needs the secret).
//
// Setup (Part C): the app configures RevenueCat with appUserID = Firebase uid,
// so event.app_user_id === uid. In RevenueCat set the webhook Authorization
// header to `Bearer <REVENUECAT_WEBHOOK_SECRET>` (stored via
// `firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET`).

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'

if (getApps().length === 0) {
  initializeApp()
}

interface RcEvent {
  type?: string
  app_user_id?: string
  entitlement_ids?: string[]
  product_id?: string
  expiration_at_ms?: number
}

export const revenueCatWebhook = onRequest(
  { region: 'us-central1', secrets: ['REVENUECAT_WEBHOOK_SECRET'] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET
    const auth = req.get('authorization') || ''
    if (!secret || auth !== `Bearer ${secret}`) {
      res.status(401).send('Unauthorized')
      return
    }

    const event = (req.body?.event ?? {}) as RcEvent
    const uid = typeof event.app_user_id === 'string' ? event.app_user_id : ''
    if (!uid) {
      // Nothing to map — ack so RevenueCat doesn't retry.
      res.status(200).send('ignored')
      return
    }

    const expiresMs = typeof event.expiration_at_ms === 'number' ? event.expiration_at_ms : 0
    const hasEntitlement = Array.isArray(event.entitlement_ids) && event.entitlement_ids.includes('premium')
    const deactivating = event.type === 'EXPIRATION' || event.type === 'SUBSCRIPTION_PAUSED'
    const isPremium = !deactivating && hasEntitlement && (expiresMs === 0 || expiresMs > Date.now())

    try {
      await getFirestore().collection('users').doc(uid).set(
        {
          isPremium,
          productId: typeof event.product_id === 'string' ? event.product_id : null,
          expiresAt: expiresMs ? Timestamp.fromMillis(expiresMs) : null,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      )
    } catch (err) {
      console.error('revenuecat.webhook.write_failed', { uid, code: (err as Error).message })
      res.status(500).send('write failed')
      return
    }
    res.status(200).send('ok')
  },
)
