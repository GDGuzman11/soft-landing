import { getFunctions, httpsCallable } from 'firebase/functions'
import type { EmotionId } from '../types'

type LetterPayload = {
  emotionId: EmotionId
  verseBody: string
  reference: string
  userInput?: string
  userName: string
}

type LetterResult = {
  letter: string | null
  showCrisisPrompt: boolean
}

export async function generateLetter(payload: LetterPayload): Promise<LetterResult> {
  try {
    const functions = getFunctions()
    const fn = httpsCallable<LetterPayload, LetterResult>(functions, 'generateLetter')
    const result = await fn(payload)
    return result.data
  } catch {
    return { letter: null, showCrisisPrompt: false }
  }
}
