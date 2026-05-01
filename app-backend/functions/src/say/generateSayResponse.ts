import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Anthropic from '@anthropic-ai/sdk'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'
import { filterUserInput } from '../inputFilter'
import { containsCrisisContent } from '../crisisKeywords'
import { checkSayRateLimit } from './sayRateLimit'
import { getSaySystemPrompt, isValidPersonaId, SAY_CANARY, type SayPersonaId } from './sayPrompt'

if (getApps().length === 0) {
  initializeApp()
}

const MAX_MESSAGE_CHARS = 2000
const MAX_RESPONSE_CHARS = 2000
const HISTORY_LIMIT = 30
const JAILBREAK_WINDOW = 3
const SAFE_FALLBACK = "Something quiet settled here. Say more when you're ready."

interface GenerateSayData {
  message: string
  personaId: SayPersonaId
}

interface GenerateSayResult {
  response?: string
  blocked?: boolean
  showCrisisPrompt?: boolean
  rateLimited?: boolean
  rateLimitType?: 'daily' | 'burst'
}

interface StoredMessage {
  role: 'user' | 'assistant'
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

    const db = getFirestore()
    const messagesRef = db.collection('say').doc(uid).collection(personaId)

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
    try {
      const recentUserSnap = await messagesRef
        .where('role', '==', 'user')
        .orderBy('createdAt', 'desc')
        .limit(JAILBREAK_WINDOW)
        .get()
      const recentUserContent = recentUserSnap.docs
        .map((d) => (d.data() as StoredMessage).content)
        .filter((c): c is string => typeof c === 'string')
        .join('\n')
      const windowText = `${recentUserContent}\n${trimmedMessage}`
      const windowFilter = filterUserInput(windowText)
      if (!windowFilter.safe) {
        return { blocked: true }
      }
    } catch (err) {
      // If the scan itself fails, fail closed on the explicit single-message
      // filter result we already have (which was safe). Log only metadata.
      console.error('say.jailbreak_window_scan_failed', { uid, code: (err as Error).message })
    }

    // STEP 6: Rate limit check — RevenueCat server-side check is Phase 2.
    const isPremium = false
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
    let history: ClaudeMessage[] = []
    try {
      const historySnap = await messagesRef.orderBy('createdAt', 'asc').limit(HISTORY_LIMIT).get()
      history = historySnap.docs
        .map((d) => d.data() as StoredMessage)
        .filter((m): m is StoredMessage =>
          (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
        )
        .map((m) => ({ role: m.role, content: m.content }))
    } catch (err) {
      console.error('say.history_load_failed', { uid, code: (err as Error).message })
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
    const systemPrompt = getSaySystemPrompt(personaId)

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
      const claudeMessages: ClaudeMessage[] = [
        ...history,
        { role: 'user', content: trimmedMessage },
      ]

      const completion = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: claudeMessages,
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

    // STEP 12
    return { response: responseText }
  },
)
