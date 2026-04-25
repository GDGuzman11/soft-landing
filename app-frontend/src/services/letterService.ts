import { getFunctions, httpsCallable } from 'firebase/functions'
import app from './firebase'
import type { EmotionId } from '../types'

type LetterPayload = {
  emotionId: EmotionId
  verseBody: string
  reference: string
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

export async function generateLetter(payload: LetterPayload): Promise<LetterResult> {
  try {
    const functions = getFunctions(app, 'us-central1')
    const fn = httpsCallable<LetterPayload, LetterResult>(functions, 'generateLetter')
    const result = await fn(payload)
    return result.data
  } catch (err: any) {
    if (__DEV__) console.error('[letterService] generateLetter failed:', err)
    if (err?.code === 'functions/resource-exhausted') {
      return { letter: null, showCrisisPrompt: false, rateLimited: true }
    }
    return { letter: null, showCrisisPrompt: false }
  }
}
