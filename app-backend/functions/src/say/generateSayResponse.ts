import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Anthropic from '@anthropic-ai/sdk'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { filterUserInput } from '../inputFilter'
import { containsCrisisContent } from '../crisisKeywords'
import { checkSayRateLimit } from './sayRateLimit'
import { getSaySystemPrompt, isValidPersonaId, SAY_CANARY, type SayPersonaId } from './sayPrompt'
import { chatDocRef, chatsCollectionRef, messagesCollectionRef } from './sayPaths'
import { generateTitleAndSummary, sanitizeForTitle } from './sayTitle'
import { ENFORCE_PREMIUM, isUserPremium, isPremiumVoice } from '../premium'

if (getApps().length === 0) {
  initializeApp()
}

const MAX_MESSAGE_CHARS = 2000
const MAX_RESPONSE_CHARS = 2000
const HISTORY_LIMIT = 100
const JAILBREAK_WINDOW = 3
const MAX_NAME_CHARS = 60
const SAFE_FALLBACK = "Something quiet settled here. Say more when you're ready."

interface GenerateSayData {
  message: string
  personaId: SayPersonaId
  userName?: string
  chatId: string
}

/**
 * Sanitize a user-supplied display name before it reaches the system prompt.
 * Mirrors sanitizeUserText in ../prompt.ts (strips < >) and additionally blocks
 * newlines/control chars and any ${ template-escape sequence, so a hostile
 * sign-up name cannot inject instructions. Returns undefined when the result is
 * empty/whitespace.
 */
function sanitizeFirstName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const stripped = value
    .replace(/[<>]/g, '')
    // Strip newlines and all control characters (C0 range + DEL).
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Block template-literal escape sequences (mirrors sanitizeVerseText intent).
    .replace(/\$\{/g, '')
    .trim()
    .slice(0, MAX_NAME_CHARS)
    .trim()
  return stripped.length > 0 ? stripped : undefined
}

interface GenerateSayResult {
  response?: string
  blocked?: boolean
  showCrisisPrompt?: boolean
  rateLimited?: boolean
  rateLimitType?: 'daily' | 'burst'
}

interface StoredMessage {
  role: 'user' | 'assistant' | 'reachOut'
  content: string
  createdAt?: Timestamp
}

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Truncate to the last sentence boundary <= MAX_RESPONSE_CHARS.
 * Falls back to a hard cut if no boundary is found in range.
 */
function truncateToSentence(text: string): string {
  if (text.length <= MAX_RESPONSE_CHARS) return text
  const slice = text.slice(0, MAX_RESPONSE_CHARS)
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

/**
 * Collect the most-recent `limit` USER-role message contents across ALL of this
 * persona's chats, newest first. Used to broaden the jailbreak-window scan so a
 * split injection payload spread over separate chats cannot evade it.
 *
 * Index-light: list the persona's chat docs, then per-chat query orders by
 * createdAt desc with a small limit and filters role === 'user' in memory.
 * No composite index required. The merged result is re-sorted by createdAt and
 * sliced to `limit`.
 */
async function gatherRecentUserMessagesAcrossChats(
  db: FirebaseFirestore.Firestore,
  uid: string,
  personaId: SayPersonaId,
  limit: number,
): Promise<string[]> {
  const chatsSnap = await chatsCollectionRef(db, uid, personaId).get()
  const collected: { content: string; atMs: number }[] = []

  for (const chatDoc of chatsSnap.docs) {
    const perChatSnap = await messagesCollectionRef(db, uid, personaId, chatDoc.id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    for (const d of perChatSnap.docs) {
      const data = d.data() as StoredMessage
      if (data.role === 'user' && typeof data.content === 'string') {
        collected.push({ content: data.content, atMs: data.createdAt?.toMillis() ?? 0 })
      }
    }
  }

  return collected
    .sort((a, b) => b.atMs - a.atMs)
    .slice(0, limit)
    .map((m) => m.content)
}

export const generateSayResponse = onCall(
  { region: 'us-central1', invoker: 'public', secrets: ['ANTHROPIC_API_KEY'] },
  async (request): Promise<GenerateSayResult> => {
    // STEP 1: Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to use Say.')
    }
    const uid = request.auth.uid

    // STEP 2: Schema validation
    const raw = request.data as Partial<GenerateSayData> | undefined
    if (!raw || typeof raw.message !== 'string') {
      throw new HttpsError('invalid-argument', 'message is required')
    }
    const trimmedMessage = raw.message.trim()
    if (trimmedMessage.length === 0) {
      throw new HttpsError('invalid-argument', 'message cannot be empty')
    }
    if (trimmedMessage.length > MAX_MESSAGE_CHARS) {
      throw new HttpsError('invalid-argument', 'Message too long — keep it under 2000 characters')
    }
    const personaId: SayPersonaId = isValidPersonaId(raw.personaId) ? raw.personaId : 'kind'
    // Optional first name — validated + sanitized before it reaches the prompt.
    const safeFirstName = sanitizeFirstName(raw.userName)
    // Required chat id — scopes this exchange to one discrete session.
    if (typeof raw.chatId !== 'string' || raw.chatId.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'chatId is required')
    }
    const chatId = raw.chatId.trim()

    const db = getFirestore()
    // Chat (session) doc + its messages subcollection.
    // Contract: say/{uid}/{personaId}/chats/{chatId} with messages nested at
    // say/{uid}/{personaId}/chats/{chatId}/messages/{msgId}. The {personaId}
    // collection now holds chat (session) documents; each chat owns a messages
    // subcollection. See report note on the "chats" path-segment arity.
    const chatRef = chatDocRef(db, uid, personaId, chatId)
    const messagesRef = chatRef.collection('messages')

    // STEP 3: Input injection filter
    const filterResult = filterUserInput(trimmedMessage)
    if (!filterResult.safe) {
      return { blocked: true }
    }

    // STEP 4: Crisis detection — still persist the user's message so the
    // crisis moment is preserved in conversation history for context.
    if (containsCrisisContent(trimmedMessage)) {
      try {
        await messagesRef.add({
          role: 'user',
          content: trimmedMessage,
          createdAt: FieldValue.serverTimestamp(),
        })
      } catch (err) {
        // Persistence failure is non-fatal — we still surface the crisis prompt.
        console.error('say.persist_user_message_failed', { uid, code: (err as Error).message })
      }
      return { showCrisisPrompt: true }
    }

    // STEP 5: Conversation-window jailbreak scan — concatenate the last
    // JAILBREAK_WINDOW user-role messages with the new message and re-filter.
    // Catches payload-splitting attacks across multiple turns.
    //
    // Scope: ACROSS all of this persona's chats, not just the current chatId.
    // Now that messages are nested per chat, a split payload spread over
    // separate chats would evade a single-chat scan. We iterate the persona's
    // chat docs (bounded by the chat-creation cap) and pull each chat's recent
    // user messages. Index-light: each per-chat query orders by createdAt only
    // (single-field auto index) and filters role === 'user' in memory, so no
    // composite index is required.
    try {
      const recentUserContent = await gatherRecentUserMessagesAcrossChats(
        db,
        uid,
        personaId,
        JAILBREAK_WINDOW,
      )
      const windowText = `${recentUserContent.join('\n')}\n${trimmedMessage}`
      const windowFilter = filterUserInput(windowText)
      if (!windowFilter.safe) {
        return { blocked: true }
      }
    } catch (err) {
      // If the scan itself fails, fail closed on the explicit single-message
      // filter result we already have (which was safe). Log only metadata.
      console.error('say.jailbreak_window_scan_failed', { uid, code: (err as Error).message })
    }

    // STEP 6: Premium tier (server-trusted) + rate limit. INERT until
    // ENFORCE_PREMIUM is flipped on: with it false, isPremium=false so everyone
    // gets the free caps exactly as before.
    const isPremium = ENFORCE_PREMIUM ? await isUserPremium(uid) : false
    // Defense in depth: premium-only voices are blocked server-side for free
    // users (the client gate normally prevents ever reaching here).
    if (ENFORCE_PREMIUM && !isPremium && isPremiumVoice(personaId)) {
      throw new HttpsError('permission-denied', 'This voice is part of Soft Landing Premium.')
    }
    try {
      await checkSayRateLimit(uid, isPremium)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'SAY_DAILY_LIMIT') {
        return { rateLimited: true, rateLimitType: 'daily' }
      }
      if (err instanceof Error && err.message === 'SAY_BURST_LIMIT') {
        return { rateLimited: true, rateLimitType: 'burst' }
      }
      // Storage failure is non-fatal — continue, mirroring generateLetter.
      console.error('say.rate_limit_storage_failed', { uid, code: (err as Error).message })
    }

    // STEP 7: Load conversation history for memory.
    // Query the MOST-RECENT HISTORY_LIMIT messages (desc), then reverse back to
    // chronological order (oldest -> newest) so Claude receives recent context
    // in the correct sequence. Previously this loaded the OLDEST N, which caused
    // recent turns to drop out of context once a thread passed N messages.
    let history: ClaudeMessage[] = []
    try {
      const historySnap = await messagesRef.orderBy('createdAt', 'desc').limit(HISTORY_LIMIT).get()
      history = historySnap.docs
        .slice()
        .reverse()
        .map((d) => d.data() as StoredMessage)
        // Include reachOut openers (voiced by the assistant) so the model has the
        // opening message in context — important for letter-seeded journal chats.
        .filter((m): m is StoredMessage & { content: string } =>
          typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant' || m.role === 'reachOut'),
        )
        .map((m): ClaudeMessage => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    } catch (err) {
      console.error('say.history_load_failed', { uid, code: (err as Error).message })
    }

    // STEP 7b: Journal-chat memory. Read the chat doc once and, for letter-seeded
    // chats, build a memory addendum (the user's reflection + the letter they
    // received) so the chosen voice remembers the moment across the whole chat.
    // The same snapshot's `title` is reused for the title backfill below.
    let journalMemory = ''
    let existingTitle: unknown
    try {
      const chatSnap = await chatRef.get()
      existingTitle = chatSnap.get('title')
      if (chatSnap.get('kind') === 'journal') {
        const letterText = typeof chatSnap.get('letterText') === 'string' ? (chatSnap.get('letterText') as string) : ''
        const reflectionText = typeof chatSnap.get('reflectionText') === 'string' ? (chatSnap.get('reflectionText') as string) : ''
        const emo = typeof chatSnap.get('emotionId') === 'string' ? (chatSnap.get('emotionId') as string) : ''
        const ref = typeof chatSnap.get('verseReference') === 'string' ? (chatSnap.get('verseReference') as string) : ''
        if (letterText || reflectionText) {
          journalMemory =
            '\n\nThis conversation began right after a check-in. ' +
            (emo ? `They were feeling ${emo}. ` : '') +
            (reflectionText ? `In their own words, they wrote: "${reflectionText}". ` : '') +
            (letterText ? `The letter they received${ref ? ` (around ${ref})` : ''} said: "${letterText}". ` : '') +
            'You remember this. Bring it in naturally when it helps them, and never recite it back verbatim.'
        }
      }
    } catch (err) {
      console.error('say.journal_memory_load_failed', { uid, code: (err as Error).message })
    }

    // STEP 8: Persist user message via Admin SDK before calling Claude.
    try {
      await messagesRef.add({
        role: 'user',
        content: trimmedMessage,
        createdAt: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      console.error('say.persist_user_message_failed', { uid, code: (err as Error).message })
      throw new HttpsError('internal', 'Could not save your message. Try again.')
    }

    // STEP 9: Call Claude — or write a mock response when no API key is set.
    const apiKey = process.env.ANTHROPIC_API_KEY
    const systemPrompt = getSaySystemPrompt(personaId, safeFirstName) + journalMemory

    if (!apiKey) {
      const mock = "Just here with you. Say more when you're ready."
      try {
        await messagesRef.add({
          role: 'assistant',
          content: mock,
          createdAt: FieldValue.serverTimestamp(),
        })
      } catch (err) {
        console.error('say.persist_mock_response_failed', { uid, code: (err as Error).message })
      }
      return { response: mock }
    }

    let responseText: string
    try {
      const client = new Anthropic({ apiKey })
      // Prompt caching: cache the system prompt (stable) + the conversation
      // prefix by marking the last history message as the cache breakpoint. Only
      // the newest user message is uncached, so repeat turns in an active thread
      // bill the reused context at the cache-read rate (~10% of input). The
      // ephemeral cache TTL is 5 minutes, refreshed on each hit.
      const claudeMessages: Anthropic.MessageParam[] = [
        ...history,
        { role: 'user', content: trimmedMessage },
      ]
      if (history.length > 0) {
        const last = claudeMessages[history.length - 1]
        claudeMessages[history.length - 1] = {
          role: last.role,
          content: [
            {
              type: 'text',
              text: typeof last.content === 'string' ? last.content : '',
              cache_control: { type: 'ephemeral' },
            },
          ],
        }
      }

      const completion = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: claudeMessages,
      })

      // Usage logging (Firebase Functions logs only) for real cost visibility.
      const usage = completion.usage
      console.log('say.usage', {
        uid,
        input: usage.input_tokens,
        output: usage.output_tokens,
        cacheWrite: usage.cache_creation_input_tokens ?? 0,
        cacheRead: usage.cache_read_input_tokens ?? 0,
      })

      const block = completion.content[0]
      if (!block || block.type !== 'text') {
        throw new HttpsError('internal', 'Unexpected response format')
      }
      responseText = block.text
    } catch (err) {
      console.error('say.claude_call_failed', { uid, code: (err as Error).message })
      if (err instanceof HttpsError) throw err
      throw new HttpsError('internal', 'Could not generate a response')
    }

    // STEP 10: Output safety checks.
    // (a) length guard
    responseText = truncateToSentence(responseText)
    // (b) canary leakage check — if the model echoed any part of the buried
    // marker, replace with a safe fallback. The canary was placed in a
    // comment block that has no business appearing in conversational output.
    if (responseText.includes(SAY_CANARY)) {
      console.error('say.canary_leak_detected', { uid })
      responseText = SAFE_FALLBACK
    }

    // STEP 11: Persist AI response.
    try {
      await messagesRef.add({
        role: 'assistant',
        content: responseText,
        createdAt: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      console.error('say.persist_assistant_response_failed', { uid, code: (err as Error).message })
      // Response was generated; surfacing it to the user is more important
      // than failing the whole call. Return without throwing.
    }

    // STEP 11b: Update the chat doc's preview + lastMessageAt (merge).
    // Preview = ~first 80 chars of the latest (assistant) message.
    try {
      await chatRef.set(
        {
          lastMessageAt: FieldValue.serverTimestamp(),
          preview: responseText.slice(0, 80),
        },
        { merge: true },
      )
    } catch (err) {
      console.error('say.update_chat_meta_failed', { uid, code: (err as Error).message })
      // Non-fatal — the message was already persisted.
    }

    // STEP 11c: Backfill a short title + summary for the chat-list row, once,
    // early in the chat's life. Everyday chats have none until the first
    // exchange; journal chats already carry one from startSayLetterChat (the
    // existing-title check skips them). Gated to the first few turns to bound cost.
    if (history.length <= 6 && (typeof existingTitle !== 'string' || existingTitle.length === 0)) {
      try {
        const recent = [
          ...history.slice(-6),
          { role: 'user' as const, content: trimmedMessage },
          { role: 'assistant' as const, content: responseText },
        ]
        const transcript = recent
          .map((m) => `${m.role === 'user' ? 'Them' : 'You'}: ${sanitizeForTitle(m.content)}`)
          .join('\n')
        const ts = await generateTitleAndSummary(new Anthropic({ apiKey }), transcript)
        if (ts) await chatRef.set({ title: ts.title, summary: ts.summary }, { merge: true })
      } catch (err) {
        console.error('say.title_backfill_failed', { uid, code: (err as Error).message })
      }
    }

    // STEP 12
    return { response: responseText }
  },
)
