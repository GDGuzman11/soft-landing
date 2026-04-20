// High-risk phrases that trigger the crisis resource screen instead of letter generation.
// The letter is never generated when these are detected — the app surfaces resources instead.
// This list is deliberately conservative. Add phrases but never remove without review.
export const CRISIS_KEYWORDS: string[] = [
  'kill myself',
  'killing myself',
  'end my life',
  'end it all',
  'want to die',
  'wanting to die',
  'rather be dead',
  'suicide',
  'suicidal',
  'self harm',
  'self-harm',
  'hurt myself',
  'hurting myself',
  'cut myself',
  'no reason to live',
  'not worth living',
  'life is not worth',
  'life isn\'t worth',
]

export function containsCrisisContent(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some((phrase) => lower.includes(phrase))
}
