import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Anthropic from '@anthropic-ai/sdk'
import { buildPrompt } from './prompt'
import { containsCrisisContent } from './crisisKeywords'
import { filterUserInput } from './inputFilter'
import { getRandomMockLetter } from './mockLetters'
import { checkRateLimit } from './rateLimit'
import type { GenerateLetterData, GenerateLetterResult } from './types'

const VALID_EMOTIONS = ['stressed', 'tired', 'sad', 'neutral', 'good']
const VALID_FAITH_BACKGROUNDS = ['established', 'exploring', 'between']
const VALID_LIFE_STAGES = ['early', 'middle', 'later']
const VALID_INTENTS = ['peace', 'strength', 'comfort', 'guidance', 'exploring']

function validateInputs(data: GenerateLetterData): void {
  if (!data.verseBody || typeof data.verseBody !== 'string' || data.verseBody.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'verseBody is required')
  }
  if (data.verseBody.length > 1000) {
    throw new HttpsError('invalid-argument', 'verseBody too long')
  }
  if (!data.emotionId || !VALID_EMOTIONS.includes(data.emotionId)) {
    throw new HttpsError('invalid-argument', 'Valid emotionId is required')
  }
  if (data.userInput !== undefined && data.userInput.length > 1000) {
    throw new HttpsError('invalid-argument', 'Message too long — keep it under 1000 characters')
  }
  if (data.reference !== undefined && (typeof data.reference !== 'string' || data.reference.length > 100)) {
    throw new HttpsError('invalid-argument', 'Invalid reference')
  }
  if (data.userName !== undefined && (typeof data.userName !== 'string' || data.userName.length > 100)) {
    throw new HttpsError('invalid-argument', 'Invalid userName')
  }
  if (data.hourOfDay !== undefined && (typeof data.hourOfDay !== 'number' || data.hourOfDay < 0 || data.hourOfDay > 23)) {
    throw new HttpsError('invalid-argument', 'hourOfDay must be 0–23')
  }
  if (data.faithBackground !== undefined && data.faithBackground !== null && !VALID_FAITH_BACKGROUNDS.includes(data.faithBackground)) {
    throw new HttpsError('invalid-argument', 'Invalid faithBackground')
  }
  if (data.primaryIntent !== undefined && data.primaryIntent !== null && !VALID_INTENTS.includes(data.primaryIntent)) {
    throw new HttpsError('invalid-argument', 'Invalid primaryIntent')
  }
  if (data.lifeStage !== undefined && data.lifeStage !== null && !VALID_LIFE_STAGES.includes(data.lifeStage)) {
    throw new HttpsError('invalid-argument', 'Invalid lifeStage')
  }
}

export const generateLetter = onCall(
  { region: 'us-central1', invoker: 'public' },
  async (request): Promise<GenerateLetterResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to write a letter.')
    }

    const data = request.data as GenerateLetterData
    validateInputs(data)

    const { emotionId, verseBody, reference, userInput, userName, hourOfDay, faithBackground, primaryIntent, lifeStage } = data

    console.log('[generateLetter] params', {
      emotionId,
      reference,
      verseLength: verseBody?.length,
      hasUserInput: !!userInput,
      userInputLength: userInput?.length ?? 0,
      faithBackground: faithBackground ?? 'null',
      primaryIntent: primaryIntent ?? 'null',
      lifeStage: lifeStage ?? 'null',
      hourOfDay: hourOfDay ?? 'null',
      uid: request.auth?.uid?.slice(0, 8) + '…',
    })

    // Block malicious input before it reaches the AI
    if (userInput) {
      const filterResult = filterUserInput(userInput)
      if (!filterResult.safe) {
        return { letter: null, showCrisisPrompt: false, blocked: true }
      }
    }

    if (userInput && containsCrisisContent(userInput)) {
      return { letter: null, showCrisisPrompt: true }
    }

    try {
      await checkRateLimit(request.auth.uid)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'RATE_LIMIT_EXCEEDED') {
        throw new HttpsError('resource-exhausted', 'Letter limit reached — try again in an hour.')
      }
      // Rate limit storage failure is non-fatal — continue
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return { letter: getRandomMockLetter(emotionId), showCrisisPrompt: false }
    }

    const client = new Anthropic({ apiKey })

    try {
      const prompt = buildPrompt({
        emotionId,
        verseBody,
        reference,
        userInput: userInput?.trim() || undefined,
        userName: userName?.trim() || 'friend',
        hourOfDay,
        faithBackground: faithBackground as 'established' | 'exploring' | 'between' | null | undefined,
        primaryIntent: primaryIntent as 'peace' | 'strength' | 'comfort' | 'guidance' | 'exploring' | null | undefined,
        lifeStage: lifeStage as 'early' | 'middle' | 'later' | null | undefined,
      })

      console.log('[generateLetter] prompt fingerprint', {
        openingAngle: prompt.user.slice(prompt.user.indexOf('\n\n') + 2, prompt.user.indexOf('\n\n') + 2 + 80).replace(/\n/g, ' '),
        userMessageLength: prompt.user.length,
        systemMessageLength: prompt.system.length,
      })

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        temperature: 1.0,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      })

      const letterContent = response.content[0]
      if (letterContent.type !== 'text') {
        throw new HttpsError('internal', 'Unexpected response format')
      }

      console.log('[generateLetter] claude response', {
        stopReason: response.stop_reason,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        letterLength: letterContent.text.length,
        letterFirstLine: letterContent.text.slice(0, 80).replace(/\n/g, ' '),
      })

      return { letter: letterContent.text, showCrisisPrompt: false }
    } catch (err) {
      if (err instanceof HttpsError) throw err
      throw new HttpsError('internal', 'Failed to generate letter')
    }
  }
)
