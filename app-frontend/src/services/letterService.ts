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
  lifeStage?: string | null
}

type LetterResult = {
  letter: string | null
  showCrisisPrompt: boolean
}

export async function generateLetter(payload: LetterPayload): Promise<LetterResult> {
  try {
    const functions = getFunctions(app, 'us-central1')
    const fn = httpsCallable<LetterPayload, LetterResult>(functions, 'generateLetter')
    const result = await fn(payload)
    return result.data
  } catch (err) {
    if (__DEV__) console.error('[letterService] generateLetter failed:', err)
    return { letter: null, showCrisisPrompt: false }
  }
}
