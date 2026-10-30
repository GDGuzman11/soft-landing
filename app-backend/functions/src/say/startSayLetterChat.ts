// startSayLetterChat.ts — create a "journal" Say chat seeded from a generated
// "Dear You" letter + the user's reflection. The chosen voice opens by engaging
// with what they wrote/received; the chat is tagged kind:'journal' so it shows
// under the voice's Journal Entries tab. Mirrors startSayChat's safety posture.

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Anthropic from '@anthropic-ai/sdk'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getSaySystemPrompt, isValidPersonaId, SAY_CANARY, type SayPersonaId } from './sayPrompt'
import { chatsCollectionRef, messagesCollectionRef } from './sayPaths'
import { checkSayChatCreationLimit } from './sayChatCreationLimit'
import { containsCrisisContent } from '../crisisKeywords'
import { generateTitleAndSummary, sanitizeForTitle } from './sayTitle'
import { ENFORCE_PREMIUM, isUserPremium, isPremiumVoice } from '../premium'

if (getApps().length === 0) {
  initializeApp()
}

const MAX_NAME_CHARS = 60
const MAX_LETTER_CHARS = 4000
const MAX_REFLECTION_CHARS = 2500
const MAX_REF_CHARS = 120
const MAX_OPENING_CHARS = 1000
const SAFE_FALLBACK = "Something quiet settled here. Say more when you're ready."

const CRISIS_OPENER =
  "I've been sitting with what you wrote. Before anything else — if things are heavy right now, " +
  "you don't have to carry it alone. The 988 Suicide & Crisis Lifeline is there any time " +
  "(call or text 988), and you can text HOME to 741741 for the Crisis Text Line. " +
  "I'm here too, whenever you want to talk."

interface StartSayLetterChatData {
  personaId: SayPersonaId
  userName?: string
  letter: string
  reflection?: string
  emotionId?: string
  verseReference?: string
}

interface StartSayLetterChatResult {
  chatId: string
}

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

function truncateToSentence(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const lastBoundary = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  )
  if (lastBoundary > 0) return slice.slice(0, lastBoundary + 1).trimEnd()
  return slice.trimEnd()
}

export const startSayLetterChat = onCall(
  { region: 'us-central1', invoker: 'public', secrets: ['ANTHROPIC_API_KEY'] },
  async (request): Promise<StartSayLetterChatResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to use Say.')
    }
    const uid = request.auth.uid

    const raw = request.data as Partial<StartSayLetterChatData> | undefined
    if (!raw) throw new HttpsError('invalid-argument', 'Request body is required')
    if (!isValidPersonaId(raw.personaId)) {
      throw new HttpsError('invalid-argument', 'personaId is invalid')
    }
    const personaId: SayPersonaId = raw.personaId
    if (typeof raw.letter !== 'string' || raw.letter.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'letter is required')
    }

    const letter = sanitizeForTitle(raw.letter).replace(/\[\[|\]\]/g, '').slice(0, MAX_LETTER_CHARS)
    const reflection =
      typeof raw.reflection === 'string' ? sanitizeForTitle(raw.reflection).slice(0, MAX_REFLECTION_CHARS) : ''
    const verseReference =
      typeof raw.verseReference === 'string' ? sanitizeForTitle(raw.verseReference).slice(0, MAX_REF_CHARS) : ''
    const emotionId = typeof raw.emotionId === 'string' ? sanitizeForTitle(raw.emotionId).slice(0, 20) : ''
    const safeFirstName = sanitizeFirstName(raw.userName)

    // Premium-only voices gated server-side (INERT until ENFORCE_PREMIUM).
    if (ENFORCE_PREMIUM && isPremiumVoice(personaId) && !(await isUserPremium(uid))) {
      throw new HttpsError('permission-denied', 'This voice is part of Soft Landing Premium.')
    }

    const db = getFirestore()

    // Rate-limit chat creation BEFORE creating any doc (shared counter with startSayChat).
    try {
      await checkSayChatCreationLimit(uid)
    } catch (err) {
      if (err instanceof Error && err.message === 'SAY_CHAT_DAILY_LIMIT') {
        throw new HttpsError('resource-exhausted', 'Too many new chats today. Try again tomorrow.')
      }
      if (err instanceof Error && err.message === 'SAY_CHAT_BURST_LIMIT') {
        throw new HttpsError('resource-exhausted', 'Slow down a moment, then start your chat.')
      }
      console.error('say.letter.chat_limit_storage_failed', { uid, code: (err as Error).message })
    }

    // Create the journal chat doc.
    let chatId: string
    const chatRef = chatsCollectionRef(db, uid, personaId).doc()
    try {
      await chatRef.set({
        createdAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        preview: '',
        kind: 'journal',
        // Stored so the voice can remember the moment across the whole chat
        // (injected into the system prompt by generateSayResponse).
        letterText: letter.slice(0, 1600),
        ...(reflection ? { reflectionText: reflection.slice(0, 2000) } : {}),
        ...(emotionId ? { emotionId } : {}),
        ...(verseReference ? { verseReference } : {}),
      })
      chatId = chatRef.id
    } catch (err) {
      console.error('say.letter.create_chat_failed', { uid, code: (err as Error).message })
      throw new HttpsError('internal', 'Could not start a new chat')
    }

    // Crisis-safe: if the reflection shows crisis signals, open with resources.
    const crisis = containsCrisisContent(reflection) || containsCrisisContent(letter)
    if (crisis) {
      await writeOpener(db, uid, personaId, chatId, CRISIS_OPENER)
      try {
        await chatRef.set({ title: 'A heavy moment', summary: 'Opened up about something painful.' }, { merge: true })
      } catch {
        /* non-fatal */
      }
      return { chatId }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return { chatId }
    }
    const client = new Anthropic({ apiKey })

    // Title + summary for the Journal Entries list row.
    try {
      const transcript =
        `${reflection ? `They wrote: ${reflection}\n` : ''}` +
        `The letter they received${verseReference ? ` (with ${verseReference})` : ''}: ${letter}`
      const ts = await generateTitleAndSummary(client, transcript)
      if (ts) await chatRef.set({ title: ts.title, summary: ts.summary }, { merge: true })
    } catch (err) {
      console.error('say.letter.title_failed', { uid, code: (err as Error).message })
    }

    // Persona-voiced opener that engages with the letter + reflection.
    let opening: string
    try {
      const seed =
        'The person just finished a check-in and received a short, personal letter. ' +
        `Here is the letter they received:\n"""${letter}"""\n\n` +
        (reflection ? `Here is what they wrote themselves first:\n"""${reflection}"""\n\n` : '') +
        'Open a new conversation about this. Engage with something specific they wrote or received, ' +
        'gently name what they seem to be sitting with, and invite them to keep talking. ' +
        'Stay fully in voice, 1 to 3 sentences, warm, no advice, do not quote the letter back at ' +
        "length, do not say 'I read your letter'."
      const completion = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: getSaySystemPrompt(personaId, safeFirstName),
        messages: [{ role: 'user', content: seed }],
      })
      const block = completion.content[0]
      if (!block || block.type !== 'text') throw new Error('unexpected_opening_format')
      opening = truncateToSentence(block.text.trim(), MAX_OPENING_CHARS)
    } catch (err) {
      console.error('say.letter.opening_failed', { uid, code: (err as Error).message })
      return { chatId }
    }

    if (opening.length === 0) return { chatId }
    if (opening.includes(SAY_CANARY)) {
      console.error('say.letter.opening_canary_leak', { uid })
      opening = SAFE_FALLBACK
    }

    await writeOpener(db, uid, personaId, chatId, opening)
    return { chatId }
  },
)

/** Write the opener as the chat's first message (role: reachOut) + update meta. */
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
    console.error('say.letter.persist_opening_failed', { uid, code: (err as Error).message })
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
    console.error('say.letter.update_chat_meta_failed', { uid, code: (err as Error).message })
  }
}
