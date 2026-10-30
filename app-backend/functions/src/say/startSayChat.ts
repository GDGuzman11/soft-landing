import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Anthropic from '@anthropic-ai/sdk'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getSaySystemPrompt, isValidPersonaId, SAY_CANARY, type SayPersonaId } from './sayPrompt'
import { chatsCollectionRef, messagesCollectionRef } from './sayPaths'
import { checkSayChatCreationLimit } from './sayChatCreationLimit'
import { containsCrisisContent } from '../crisisKeywords'

if (getApps().length === 0) {
  initializeApp()
}

const MAX_NAME_CHARS = 60
const MAX_SUMMARY_CHARS = 400
const MAX_OPENING_CHARS = 1000
const PRIOR_DAY_MESSAGE_CAP = 60
const MAX_MSG_CONTENT_CHARS = 2000
const SAFE_FALLBACK = "Something quiet settled here. Say more when you're ready."

// Server-side opener cooldown. The expensive summary+opener path may fire at
// most once per persona per ~20h, reserved atomically in a transaction keyed on
// a SERVER timestamp (sayState/{uid}.{personaId}.lastOpeningAt). clientDay is
// NEVER used as the guard key — a hostile client could vary it to bypass.
const OPENING_COOLDOWN_MS = 20 * 60 * 60 * 1000

// Warmth-first crisis opener used instead of a cheerful AI opener when prior-day
// content contains crisis signals. Wording mirrors the resources surfaced
// elsewhere (sayPrompt crisis protocol, letter-compose, Say crisis UI).
const CRISIS_OPENER =
  "I've been thinking about you. Before anything else — if things are heavy right now, " +
  "you don't have to carry it alone. The 988 Suicide & Crisis Lifeline is there any time " +
  "(call or text 988), and you can text HOME to 741741 for the Crisis Text Line. " +
  "I'm here too, whenever you want to talk."

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

interface SayStateVoice {
  lastOpeningAt?: Timestamp
}

/**
 * Sanitize a user-supplied display name before it reaches the system prompt.
 * Mirrors sanitizeFirstName in generateSayResponse.ts.
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
 * Sanitize prior-day message content before feeding it to Claude. Mirrors
 * sanitizeUserText in ../prompt.ts plus control-char / template-escape stripping.
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

/** YYYY-MM-DD shape check — used only to validate the field, not as a guard key. */
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
 * Index-light: list chat docs, then per-chat range query on createdAt within
 * one subcollection (single-field auto index; no composite index needed).
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
      console.error('say.start.prior_day_query_failed', { uid, code: (err as Error).message })
    }
  }

  collected.sort((a, b) => a.atMs - b.atMs)
  return collected.slice(0, PRIOR_DAY_MESSAGE_CAP)
}

/**
 * Atomically reserve the once-per-cooldown opener slot for this persona.
 * Reads sayState/{uid}.{personaId}.lastOpeningAt (a SERVER Timestamp); if it is
 * absent or older than OPENING_COOLDOWN_MS, writes a fresh server timestamp
 * INSIDE the same transaction and returns true (reserve-before-generate).
 * Returns false if another call already holds the slot. This prevents
 * concurrent/spam calls from both triggering Claude, independent of clientDay.
 */
async function reserveOpenerSlot(
  db: FirebaseFirestore.Firestore,
  uid: string,
  personaId: SayPersonaId,
): Promise<boolean> {
  const stateRef = db.collection('sayState').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(stateRef)
    const stateData = snap.data() as Record<string, SayStateVoice> | undefined
    const lastOpeningAt = stateData?.[personaId]?.lastOpeningAt
    const lastMs = lastOpeningAt?.toMillis() ?? 0
    if (Date.now() - lastMs < OPENING_COOLDOWN_MS) {
      return false
    }
    // Reserve the slot now, before any Claude call.
    tx.set(stateRef, { [personaId]: { lastOpeningAt: FieldValue.serverTimestamp() } }, { merge: true })
    return true
  })
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

    // STEP 3: Rate-limit chat creation (C1b) BEFORE creating any doc, so a
    // hostile client cannot spam unbounded chat docs. Separate counter — does
    // NOT consume the user's 100/day message cap.
    try {
      await checkSayChatCreationLimit(uid)
    } catch (err) {
      if (err instanceof Error && err.message === 'SAY_CHAT_DAILY_LIMIT') {
        throw new HttpsError('resource-exhausted', 'Too many new chats today. Try again tomorrow.')
      }
      if (err instanceof Error && err.message === 'SAY_CHAT_BURST_LIMIT') {
        throw new HttpsError('resource-exhausted', 'Slow down a moment, then start your chat.')
      }
      // Storage failure is non-fatal — continue (mirrors generateLetter posture).
      console.error('say.start.chat_limit_storage_failed', { uid, code: (err as Error).message })
    }

    // STEP 4: Create a fresh chat (session) doc with a Firestore auto-id, now
    // that the creation-rate check has passed.
    let chatId: string
    const chatRef = chatsCollectionRef(db, uid, personaId).doc()
    try {
      await chatRef.set({
        createdAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        preview: '',
        kind: 'everyday',
      })
      chatId = chatRef.id
    } catch (err) {
      console.error('say.start.create_chat_failed', { uid, code: (err as Error).message })
      throw new HttpsError('internal', 'Could not start a new chat')
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

    // STEP 7: Reserve the once-per-cooldown opener slot ATOMICALLY on a
    // server-derived signal (C1a). If we don't get the slot, skip the expensive
    // path entirely and return a plain chat. Reserving here, before any Claude
    // call, is what makes concurrent/spam calls safe.
    let reserved: boolean
    try {
      reserved = await reserveOpenerSlot(db, uid, personaId)
    } catch (err) {
      // Fail safe: if the reservation transaction fails, do NOT generate (avoid
      // duplicate/uncapped Claude calls). Return the plain chat.
      console.error('say.start.reserve_failed', { uid, code: (err as Error).message })
      return { chatId }
    }
    if (!reserved) {
      return { chatId }
    }

    // STEP 8: Crisis routing (M1). If prior-day content shows crisis signals,
    // do NOT generate a cheerful AI opener. Write a warmth-first, non-cheerful
    // check-in with the crisis resources, and skip the Claude opener entirely.
    const crisisDetected = priorMessages.some((m) => containsCrisisContent(m.content))
    if (crisisDetected) {
      await writeOpener(db, uid, personaId, chatId, CRISIS_OPENER)
      return { chatId }
    }

    // STEP 9: Messages exist but no API key → skip gracefully (mirror mock path).
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return { chatId }
    }

    const client = new Anthropic({ apiKey })

    // STEP 10a: Summarize prior day into a short "mental summary". Every message
    // string is sanitized before it is fed to the model.
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
    // Defense in depth: if the summary itself surfaced crisis language, route to
    // the crisis opener rather than a cheerful one.
    if (containsCrisisContent(daySummary)) {
      await writeOpener(db, uid, personaId, chatId, CRISIS_OPENER)
      return { chatId }
    }

    // Store the mental summary on the chat doc.
    try {
      await chatRef.set({ daySummary }, { merge: true })
    } catch (err) {
      console.error('say.start.store_summary_failed', { uid, code: (err as Error).message })
    }

    // STEP 10b: Generate a gentle, non-prying check-up opening, in voice.
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

    // STEP 10c: Write the opening as the chat's FIRST message.
    await writeOpener(db, uid, personaId, chatId, opening)

    // STEP 11: Return the chat id.
    return { chatId }
  },
)

/**
 * Write an opener as the chat's FIRST message (role: reachOut, mirroring
 * deliverReachOutForUser) and update the chat preview + lastMessageAt.
 * Non-fatal on any write error — the chat already exists either way.
 */
async function writeOpener(
  db: FirebaseFirestore.Firestore,
  uid: string,
  personaId: SayPersonaId,
  chatId: string,
  opening: string,
): Promise<void> {
  try {
    await messagesCollectionRef(db, uid, personaId, chatId).add({
      role: 'reachOut',
      content: opening,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    console.error('say.start.persist_opening_failed', { uid, code: (err as Error).message })
    return
  }
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
}
