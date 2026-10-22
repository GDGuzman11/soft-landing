import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { isValidPersonaId, type SayPersonaId } from './sayPrompt'
import { messagesCollectionRef } from './sayPaths'

if (getApps().length === 0) {
  initializeApp()
}

const VALID_REASONS = ['harmful', 'inaccurate', 'other'] as const
type ReportReason = (typeof VALID_REASONS)[number]

interface ReportData {
  personaId: SayPersonaId
  chatId: string
  messageId: string
  reason: ReportReason
}

/**
 * User-initiated report of an objectionable AI (Say) message — the in-app
 * reporting mechanism required by App Store Review Guideline 1.2 for UGC/AI apps.
 *
 * The reported message's content is fetched server-side (not trusted from the
 * client) and stored in the admin-only `sayReports` collection for review in the
 * Firebase console. Writes go through the Admin SDK, which bypasses the
 * deny-all client rule on `sayReports`.
 */
export const reportSayMessage = onCall(
  { region: 'us-central1', invoker: 'public' },
  async (request): Promise<{ ok: true }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to report a message.')
    }
    const uid = request.auth.uid
    const data = (request.data ?? {}) as Partial<ReportData>

    const personaId = data.personaId
    if (!isValidPersonaId(personaId)) {
      throw new HttpsError('invalid-argument', 'Invalid persona.')
    }
    const chatId = typeof data.chatId === 'string' ? data.chatId.slice(0, 200) : ''
    const messageId = typeof data.messageId === 'string' ? data.messageId.slice(0, 200) : ''
    if (!chatId || !messageId) {
      throw new HttpsError('invalid-argument', 'Missing chat or message.')
    }
    const reason: ReportReason = VALID_REASONS.includes(data.reason as ReportReason)
      ? (data.reason as ReportReason)
      : 'other'

    const db = getFirestore()

    // Fetch the reported message server-side so the stored content is trustworthy.
    let content: string | null = null
    let role: string | null = null
    try {
      const snap = await messagesCollectionRef(db, uid, personaId, chatId).doc(messageId).get()
      if (snap.exists) {
        const d = snap.data() as { content?: unknown; role?: unknown }
        content = typeof d.content === 'string' ? d.content.slice(0, 2000) : null
        role = typeof d.role === 'string' ? d.role : null
      }
    } catch (err) {
      console.error('say.report_fetch_failed', { uid, code: (err as Error).message })
    }

    try {
      await db.collection('sayReports').add({
        uid,
        personaId,
        chatId,
        messageId,
        role,
        content,
        reason,
        status: 'open',
        createdAt: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      console.error('say.report_write_failed', { uid, code: (err as Error).message })
      throw new HttpsError('internal', 'Could not submit the report. Please try again.')
    }

    console.log('say.message_reported', { uid, personaId, reason })
    return { ok: true }
  },
)
