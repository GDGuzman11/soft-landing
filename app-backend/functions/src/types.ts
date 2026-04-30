export type EmotionId = 'stressed' | 'tired' | 'sad' | 'neutral' | 'good'

export type FaithBackground = 'established' | 'exploring' | 'between'
export type PrimaryIntent = 'peace' | 'strength' | 'comfort' | 'guidance' | 'exploring'
export type LifeStage = 'early' | 'middle' | 'later'

export interface GenerateLetterData {
  emotionId: EmotionId
  verseBody: string
  modernText?: string
  reference: string
  userInput?: string
  userName?: string
  hourOfDay?: number
  faithBackground?: FaithBackground | null
  primaryIntent?: PrimaryIntent | null
  lifeStage?: LifeStage | null
}

export interface GenerateLetterResult {
  letter: string | null
  showCrisisPrompt: boolean
  blocked?: boolean
  rateLimited?: boolean
}
