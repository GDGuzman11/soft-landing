export type EmotionId = 'stressed' | 'tired' | 'sad' | 'neutral' | 'good'

export interface GenerateLetterData {
  emotionId: EmotionId
  verseBody: string
  reference: string
  userInput?: string
  userName: string
  hourOfDay?: number
}

export interface GenerateLetterResult {
  letter: string | null
  showCrisisPrompt: boolean
}
