import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Anthropic from '@anthropic-ai/sdk'
import { buildPrompt } from './prompt'
import { containsCrisisContent } from './crisisKeywords'
import type { GenerateLetterData, GenerateLetterResult } from './types'

export const generateLetter = onCall(
  { region: 'us-central1' },
  async (request): Promise<GenerateLetterResult> => {
    // Firebase onCall v2 auto-verifies Firebase Auth JWT
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to write a letter.')
    }

    const data = request.data as GenerateLetterData
    const { emotionId, verseBody, reference, userInput, userName } = data

    // Input validation
    if (!verseBody || typeof verseBody !== 'string' || verseBody.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'verseBody is required')
    }
    if (!emotionId || !['stressed', 'tired', 'sad', 'neutral', 'good'].includes(emotionId)) {
      throw new HttpsError('invalid-argument', 'Valid emotionId is required')
    }
    if (userInput !== undefined && userInput.length > 1000) {
      throw new HttpsError('invalid-argument', 'Message too long — keep it under 1000 characters')
    }

    // Crisis detection — surface resources instead of generating a letter
    // userInput is never logged for privacy
    if (userInput && containsCrisisContent(userInput)) {
      return { letter: null, showCrisisPrompt: true }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new HttpsError('internal', 'Service configuration error')
    }

    const client = new Anthropic({ apiKey })

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: buildPrompt({
              emotionId,
              verseBody,
              reference,
              userInput: userInput?.trim() || undefined,
              userName: userName?.trim() || 'friend',
            }),
          },
        ],
      })

      const letterContent = response.content[0]
      if (letterContent.type !== 'text') {
        throw new HttpsError('internal', 'Unexpected response format')
      }

      return { letter: letterContent.text, showCrisisPrompt: false }
    } catch (err) {
      // Re-throw HttpsErrors as-is
      if (err instanceof HttpsError) throw err
      // Wrap unexpected errors
      throw new HttpsError('internal', 'Failed to generate letter')
    }
  }
)
