import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { httpsCallable, getFunctions } from 'firebase/functions'
import { generateLetter } from '../letterService'
import type { EmotionId } from '../../types'

// Mock firebase/functions — every test controls the callable's return/throw.
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
  getFunctions: vi.fn(() => ({})),
}))

// Mock the firebase app module so importing letterService does not try to
// initializeApp or read EXPO_PUBLIC_* env vars.
vi.mock('../firebase', () => ({
  default: { name: 'mock-app' },
}))

// letterService references __DEV__ inside its catch block. In a Node/Vitest
// environment that global is not defined; declaring it here prevents a
// ReferenceError from masking the actual error path under test.
;(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false

const mockedHttpsCallable = httpsCallable as unknown as Mock
const mockedGetFunctions = getFunctions as unknown as Mock

const basePayload = {
  emotionId: 'sad' as EmotionId,
  verseBody: 'The Lord is close to the brokenhearted.',
  reference: 'Psalm 34:18',
  modernText: 'God is near to those who are hurting.',
  userInput: 'I had a hard day.',
  userName: 'Gabe',
  hourOfDay: 14,
  faithBackground: 'established' as const,
  primaryIntent: 'comfort' as const,
  lifeStage: 'middle' as const,
}

describe('letterService: generateLetter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetFunctions.mockReturnValue({})
  })

  it('should return the letter and showCrisisPrompt:false when the callable resolves with a happy-path payload', async () => {
    const callable = vi.fn().mockResolvedValue({
      data: {
        letter: 'Dear friend,\n\nYou are loved.\n\nWith you in this.',
        showCrisisPrompt: false,
      },
    })
    mockedHttpsCallable.mockReturnValue(callable)

    const result = await generateLetter(basePayload)

    expect(result.letter).toBe('Dear friend,\n\nYou are loved.\n\nWith you in this.')
    expect(result.showCrisisPrompt).toBe(false)
    expect(result.blocked).toBeUndefined()
    expect(result.rateLimited).toBeUndefined()
  })

  it('should return blocked:true when the callable signals blocked content', async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { letter: null, showCrisisPrompt: false, blocked: true },
    })
    mockedHttpsCallable.mockReturnValue(callable)

    const result = await generateLetter(basePayload)

    expect(result.blocked).toBe(true)
    expect(result.letter).toBeNull()
    expect(result.showCrisisPrompt).toBe(false)
    expect(result.rateLimited).toBeUndefined()
  })

  it('should return showCrisisPrompt:true when the callable signals crisis content', async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { letter: null, showCrisisPrompt: true },
    })
    mockedHttpsCallable.mockReturnValue(callable)

    const result = await generateLetter(basePayload)

    expect(result.showCrisisPrompt).toBe(true)
    expect(result.letter).toBeNull()
    expect(result.blocked).toBeUndefined()
    expect(result.rateLimited).toBeUndefined()
  })

  it('should return rateLimited:true when the callable throws functions/resource-exhausted', async () => {
    const err = Object.assign(new Error('quota exceeded'), {
      code: 'functions/resource-exhausted',
    })
    const callable = vi.fn().mockRejectedValue(err)
    mockedHttpsCallable.mockReturnValue(callable)

    const result = await generateLetter(basePayload)

    expect(result.rateLimited).toBe(true)
    expect(result.letter).toBeNull()
    expect(result.showCrisisPrompt).toBe(false)
    expect(result.blocked).toBeUndefined()
  })

  it('should return a clean failure result when the callable throws a generic error', async () => {
    const callable = vi.fn().mockRejectedValue(new Error('network down'))
    mockedHttpsCallable.mockReturnValue(callable)

    const result = await generateLetter(basePayload)

    expect(result.letter).toBeNull()
    expect(result.showCrisisPrompt).toBe(false)
    expect(result.rateLimited).toBeUndefined()
    expect(result.blocked).toBeUndefined()
  })

  describe('emotionId passthrough', () => {
    it('should forward emotionId "stressed" to the callable payload unchanged', async () => {
      const callable = vi.fn().mockResolvedValue({
        data: { letter: 'ok', showCrisisPrompt: false },
      })
      mockedHttpsCallable.mockReturnValue(callable)

      await generateLetter({ ...basePayload, emotionId: 'stressed' })

      expect(callable).toHaveBeenCalledTimes(1)
      const arg = callable.mock.calls[0]![0] as { emotionId: EmotionId }
      expect(arg.emotionId).toBe('stressed')
    })

    it('should forward emotionId "good" to the callable payload unchanged', async () => {
      const callable = vi.fn().mockResolvedValue({
        data: { letter: 'ok', showCrisisPrompt: false },
      })
      mockedHttpsCallable.mockReturnValue(callable)

      await generateLetter({ ...basePayload, emotionId: 'good' })

      expect(callable).toHaveBeenCalledTimes(1)
      const arg = callable.mock.calls[0]![0] as { emotionId: EmotionId }
      expect(arg.emotionId).toBe('good')
    })
  })
})
