import { getFunctions, httpsCallable } from 'firebase/functions'
import app from './firebase'
import type { EmotionId } from '../types'

type LetterPayload = {
  emotionId: EmotionId
  verseBody: string
  reference: string
  modernText?: string
  userInput?: string
  userName: string
  hourOfDay?: number
  faithBackground?: string | null
  primaryIntent?: string | null
  lifeStage?: string | null
}

type LetterResult = {
  letter: string | null
  showCrisisPrompt: boolean
  blocked?: boolean
  rateLimited?: boolean
}

/**
 * Calls the `generateLetter` Cloud Function and returns a normalized result.
 *
 * Contract: ALWAYS resolves with { letter, showCrisisPrompt } shape.
 * - `letter`: the generated string, or `null` if generation failed/blocked
 * - `showCrisisPrompt`: boolean — true when crisis keywords were detected
 *   server-side and the caller must route the user to crisis resources
 *   instead of rendering the letter
 * - `blocked` / `rateLimited`: optional flags to distinguish failure modes
 *
 * This function never throws. All errors are flattened into a result object
 * so callers can render UI without try/catch.
 */
export async function generateLetter(payload: LetterPayload): Promise<LetterResult> {
  try {
    const functions = getFunctions(app, 'us-central1')
    const fn = httpsCallable<LetterPayload, LetterResult>(functions, 'generateLetter')
    const result = await fn(payload)
    return result.data
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'functions/resource-exhausted') {
      return { letter: null, showCrisisPrompt: false, rateLimited: true }
    }
    return { letter: null, showCrisisPrompt: false }
  }
}
