import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, type CollectionReference, type Query } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { initializeApp, getApps } from 'firebase-admin/app'

if (getApps().length === 0) {
  initializeApp()
}

// Firestore commits cap at 500 writes per batch.
const BATCH_SIZE = 400

/**
 * Repeatedly fetch and batch-delete from a query until empty. Used for
 * collections that may exceed a single batch (e.g. /say/{uid}/messages/).
 */
async function deleteQueryInBatches(query: Query): Promise<void> {
  const db = getFirestore()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await query.limit(BATCH_SIZE).get()
    if (snap.empty) return
    const batch = db.batch()
    snap.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    if (snap.size < BATCH_SIZE) return
  }
}

/**
 * Best-effort delete of a single document. Swallows not-found.
 */
async function deleteDocSafe(ref: FirebaseFirestore.DocumentReference): Promise<void> {
  try {
    await ref.delete()
  } catch (err) {
    console.error('deleteUserData.doc_delete_failed', {
      path: ref.path,
      code: (err as Error).message,
    })
  }
}

/**
 * GDPR Article 17 + App Store Guideline 5.1.1(v) compliance.
 * Authenticated users can delete only their own data.
 *
 * Order: Firestore subcollections first, then top-level usage docs,
 * then audit write, then Firebase Auth user. Auth deletion is last so
 * a partial failure does not orphan an authenticated session against
 * already-deleted data.
 */
export const deleteUserData = onCall(
  { region: 'us-central1' },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to delete your account.')
    }
    const uid = request.auth.uid
    const db = getFirestore()

    try {
      // 1. Delete all per-voice message subcollections (may exceed one batch each).
      for (const voiceId of ['kind', 'still', 'steady', 'wise']) {
        const voiceRef: CollectionReference = db.collection('say').doc(uid).collection(voiceId)
        await deleteQueryInBatches(voiceRef)
      }

      // After voice collections, drop the parent /say/{uid} doc itself if it exists.
      await deleteDocSafe(db.collection('say').doc(uid))

      // 2. /letterUsage/{uid}
      await deleteDocSafe(db.collection('letterUsage').doc(uid))

      // 3. /sayUsage/{uid}
      await deleteDocSafe(db.collection('sayUsage').doc(uid))

      // 4. /sayState/{uid} — unread/delivery state per voice
      await deleteDocSafe(db.collection('sayState').doc(uid))

      // 5. /sayReachOutDelivery/{uid} — reach-out rate limit tracking
      await deleteDocSafe(db.collection('sayReachOutDelivery').doc(uid))

      // 6. /pushTokens/{uid} — Expo push token + premium flag + muted-voices preferences
      await deleteDocSafe(db.collection('pushTokens').doc(uid))

      // 7. Compliance audit — admin-only collection (rules block all client access).
      await db.collection('deletionAudit').doc(uid).set({
        uid,
        deletedAt: FieldValue.serverTimestamp(),
        status: 'complete',
      })

      // 8. Firebase Auth user — last so we don't orphan auth against partial state.
      try {
        await getAuth().deleteUser(uid)
      } catch (err) {
        // If the user record is already gone, treat as success; surface other errors.
        const message = (err as Error).message
        if (!message.toLowerCase().includes('no user record')) {
          console.error('deleteUserData.auth_delete_failed', { uid, code: message })
          throw new HttpsError('internal', 'Could not complete account deletion')
        }
      }

      return { success: true }
    } catch (err) {
      if (err instanceof HttpsError) throw err
      console.error('deleteUserData.failed', { uid, code: (err as Error).message })
      throw new HttpsError('internal', 'Could not complete account deletion')
    }
  },
)
