import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Anthropic from '@anthropic-ai/sdk'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getSaySystemPrompt, isValidPersonaId, SAY_CANARY, type SayPersonaId } from './sayPrompt'
import { chatsCollectionRef, messagesCollectionRef } from './sayPaths'

if (getApps().length === 0) {
  initializeApp()
}

const MAX_NAME_CHARS = 60
const MAX_SUMMARY_CHARS = 400
const MAX_OPENING_CHARS = 1000
const PRIOR_DAY_MESSAGE_CAP = 60
const MAX_MSG_CONTENT_CHARS = 2000
const SAFE_FALLBACK = "Something quiet settled here. Say more when you're ready."

interface StartSayChatData {
  personaId: SayPersonaId
  userName?: string
  clientDay: string
  prevDayStartMs: number
  prevDayEndMs: number
}

interface StartSayChatResult {
  chatId: string
}

interface StoredMessage {
  role: 'user' | 'assistant' | 'reachOut'
  content: string
  createdAt?: Timestamp
}

/**
 * Sanitize a user-supplied display name before it reaches the system prompt.
 * Mirrors sanitizeFirstName in generateSayResponse.ts: strips < >, control
 * chars/newlines, and ${ template-escape sequences. Returns undefined when the
 * result is empty/whitespace.
 */
function sanitizeFirstName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const stripped = value
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\$\{/g, '')
    .trim()
    .slice(0, MAX_NAME_CHARS)
    .trim()
  return stripped.length > 0 ? stripped : undefined
}

/**
 * Sanitize prior-day message content before feeding it to Claude for
 * summarization. Mirrors sanitizeUserText in ../prompt.ts (strips < >) plus the
 * control-char / template-escape stripping used for names, so stored history
 * cannot inject instructions into the summarization turn.
 */
function sanitizeMessageText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\$\{/g, '')
    .trim()
    .slice(0, MAX_MSG_CONTENT_CHARS)
}

/** Truncate the generated opening to a sentence boundary within the cap. */
function truncateToSentence(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const lastBoundary = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('!\n'),
    slice.lastIndexOf('?\n'),
  )
  if (lastBoundary > 0) return slice.slice(0, lastBoundary + 1).trimEnd()
  return slice.trimEnd()
}

/** YYYY-MM-DD shape check — no parsing beyond structure. */
function isValidClientDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

interface PriorDayMessage {
  role: 'user' | 'assistant'
  content: string
  atMs: number
}

/**
 * Gather this persona's PREVIOUS-local-day messages across all of its chats.
 *
 * Index-light strategy: list the persona's chat docs, then for each chat run a
 * range query on its own `messages` subcollection filtered by
 * createdAt ∈ [prevDayStartMs, prevDayEndMs). A single-field range on
 * createdAt inside one subcollection uses the automatic single-field index, so
 * no composite index is required. Results are merged, sorted chronologically,
 * and capped. Only user/assistant roles are kept (reachOut openers excluded).
 */
async function gatherPriorDayMessages(
  db: FirebaseFirestore.Firestore,
  uid: string,
  personaId: SayPersonaId,
  prevDayStartMs: number,
  prevDayEndMs: number,
): Promise<PriorDayMessage[]> {
  const start = Timestamp.fromMillis(prevDayStartMs)
  const end = Timestamp.fromMillis(prevDayEndMs)

  const chatsSnap = await chatsCollectionRef(db, uid, personaId).get()
  const collected: PriorDayMessage[] = []

  for (const chatDoc of chatsSnap.docs) {
    if (collected.length >= PRIOR_DAY_MESSAGE_CAP * 2) break
    try {
      const msgSnap = await messagesCollectionRef(db, uid, personaId, chatDoc.id)
        .where('createdAt', '>=', start)
        .where('createdAt', '<', end)
        .orderBy('createdAt', 'asc')
        .get()
      for (const m of msgSnap.docs) {
        const data = m.data() as StoredMessage
        if ((data.role === 'user' || data.role === 'assistant') && typeof data.content === 'string') {
          const atMs = data.createdAt?.toMillis() ?? 0
          collected.push({ role: data.role, content: data.content, atMs })
        }
      }
    } catch (err) {
      // Per-chat query failure is non-fatal — skip this chat, keep going.
      console.error('say.start.prior_day_query_failed', { uid, code: (err as Error).message })
    }
  }

  collected.sort((a, b) => a.atMs - b.atMs)
  return collected.slice(0, PRIOR_DAY_MESSAGE_CAP)
}

export const startSayChat = onCall(
  { region: 'us-central1', invoker: 'public', secrets: ['ANTHROPIC_API_KEY'] },
  async (request): Promise<StartSayChatResult> => {
    // STEP 1: Auth check.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to use Say.')
    }
    const uid = request.auth.uid

    // STEP 2: Schema validation.
    const raw = request.data as Partial<StartSayChatData> | undefined
    if (!raw) {
      throw new HttpsError('invalid-argument', 'Request body is required')
    }
    if (!isValidPersonaId(raw.personaId)) {
      throw new HttpsError('invalid-argument', 'personaId is invalid')
    }
    const personaId: SayPersonaId = raw.personaId
    if (!isValidClientDay(raw.clientDay)) {
      throw new HttpsError('invalid-argument', 'clientDay must be YYYY-MM-DD')
    }
    const clientDay = raw.clientDay
    if (
      typeof raw.prevDayStartMs !== 'number' ||
      typeof raw.prevDayEndMs !== 'number' ||
      !Number.isFinite(raw.prevDayStartMs) ||
      !Number.isFinite(raw.prevDayEndMs) ||
      raw.prevDayStartMs < 0 ||
      raw.prevDayEndMs <= raw.prevDayStartMs
    ) {
      throw new HttpsError('invalid-argument', 'prevDay bounds are invalid')
    }
    const prevDayStartMs = raw.prevDayStartMs
    const prevDayEndMs = raw.prevDayEndMs
    const safeFirstName = sanitizeFirstName(raw.userName)

    const db = getFirestore()

    // STEP 3: Create a fresh chat (session) doc with a Firestore auto-id.
    let chatId: string
    try {
      const chatRef = chatsCollectionRef(db, uid, personaId).doc()
      await chatRef.set({
        createdAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        preview: '',
      })
      chatId = chatRef.id
    } catch (err) {
      console.error('say.start.create_chat_failed', { uid, code: (err as Error).message })
      throw new HttpsError('internal', 'Could not start a new chat')
    }

    // STEP 4: Opening-frequency guard — opener runs at most once per persona
    // per LOCAL day. If already generated for clientDay, return the plain chat.
    const stateRef = db.collection('sayState').doc(uid)
    try {
      const stateSnap = await stateRef.get()
      const stateData = stateSnap.data() as Record<string, { openingGeneratedForDay?: string }> | undefined
      if (stateData?.[personaId]?.openingGeneratedForDay === clientDay) {
        return { chatId }
      }
    } catch (err) {
      // If the guard read fails, do NOT risk a duplicate opener — skip the
      // opener and return the plain chat. Fail safe on cost + frequency.
      console.error('say.start.state_read_failed', { uid, code: (err as Error).message })
      return { chatId }
    }

    // STEP 5: Gather this persona's prior-day messages.
    let priorMessages: PriorDayMessage[]
    try {
      priorMessages = await gatherPriorDayMessages(db, uid, personaId, prevDayStartMs, prevDayEndMs)
    } catch (err) {
      console.error('say.start.gather_failed', { uid, code: (err as Error).message })
      return { chatId }
    }

    // STEP 6: No prior-day activity → plain empty chat, no opener.
    if (priorMessages.length === 0) {
      return { chatId }
    }

    // STEP 7: Messages exist but no API key → skip gracefully (mirror mock path).
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return { chatId }
    }

    const client = new Anthropic({ apiKey })

    // STEP 8a: Summarize prior day into a short "mental summary".
    // Every message string is sanitized before it is fed to the model.
    const transcript = priorMessages
      .map((m) => {
        const speaker = m.role === 'user' ? 'Them' : 'You'
        return `${speaker}: ${sanitizeMessageText(m.content)}`
      })
      .filter((line) => line.length > 0)
      .join('\n')

    let daySummary = ''
    try {
      const summaryCompletion = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 120,
        system:
          'You compress a conversation into a short mental note for yourself. ' +
          'Write 1 to 2 sentences capturing what the person was going through — ' +
          'their emotional state and situation, not a transcript. No names, no ' +
          'quotes, no advice. Plain, warm, private. This is a note to self.',
        messages: [
          {
            role: 'user',
            content: `Here is yesterday's conversation. Summarize what they were going through in 1 to 2 sentences:\n\n${transcript}`,
          },
        ],
      })
      const block = summaryCompletion.content[0]
      if (block && block.type === 'text') {
        daySummary = block.text.trim().slice(0, MAX_SUMMARY_CHARS)
      }
    } catch (err) {
      console.error('say.start.summary_failed', { uid, code: (err as Error).message })
      return { chatId }
    }

    if (daySummary.length === 0) {
      return { chatId }
    }
    if (daySummary.includes(SAY_CANARY)) {
      console.error('say.start.summary_canary_leak', { uid })
      return { chatId }
    }

    // STEP 8a (persist): store the mental summary on the chat doc.
    try {
      await chatsCollectionRef(db, uid, personaId).doc(chatId).set({ daySummary }, { merge: true })
    } catch (err) {
      console.error('say.start.store_summary_failed', { uid, code: (err as Error).message })
      // Non-fatal — proceed to generate the opener.
    }

    // STEP 8b: Generate a gentle, non-prying check-up opening, in voice.
    let opening: string
    try {
      const openingCompletion = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: getSaySystemPrompt(personaId, safeFirstName),
        messages: [
          {
            role: 'user',
            content:
              "Open a brand-new conversation. Gently check in on how they're doing today, " +
              `lightly referencing yesterday via this summary: '${daySummary}'. ` +
              'Stay in voice, 1 to 3 sentences, warm, not interrogating, no advice, ' +
              "do not say 'I remember you said'.",
          },
        ],
      })
      const block = openingCompletion.content[0]
      if (!block || block.type !== 'text') {
        throw new Error('unexpected_opening_format')
      }
      opening = truncateToSentence(block.text.trim(), MAX_OPENING_CHARS)
    } catch (err) {
      console.error('say.start.opening_failed', { uid, code: (err as Error).message })
      return { chatId }
    }

    if (opening.length === 0) {
      return { chatId }
    }
    if (opening.includes(SAY_CANARY)) {
      console.error('say.start.opening_canary_leak', { uid })
      opening = SAFE_FALLBACK
    }

    // STEP 8c: Write the opening as the chat's FIRST message (role: reachOut),
    // mirroring the insert in deliverReachOutForUser.ts.
    try {
      await messagesCollectionRef(db, uid, personaId, chatId).add({
        role: 'reachOut',
        content: opening,
        createdAt: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      console.error('say.start.persist_opening_failed', { uid, code: (err as Error).message })
      // Opener could not be stored; return the chat anyway (empty).
      return { chatId }
    }

    // Update chat preview + lastMessageAt.
    try {
      await chatsCollectionRef(db, uid, personaId).doc(chatId).set(
        {
          lastMessageAt: FieldValue.serverTimestamp(),
          preview: opening.slice(0, 80),
        },
        { merge: true },
      )
    } catch (err) {
      console.error('say.start.update_chat_meta_failed', { uid, code: (err as Error).message })
    }

    // STEP 8d: Mark the opener as generated for this persona + local day.
    try {
      await stateRef.set(
        { [personaId]: { openingGeneratedForDay: clientDay } },
        { merge: true },
      )
    } catch (err) {
      console.error('say.start.mark_guard_failed', { uid, code: (err as Error).message })
      // Non-fatal — worst case the opener could regenerate; bounded by cost.
    }

    // STEP 9: Return the chat id.
    return { chatId }
  },
)
