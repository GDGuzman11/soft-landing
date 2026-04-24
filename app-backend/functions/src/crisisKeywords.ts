// High-risk phrases that trigger the crisis resource screen instead of letter generation.
// The letter is never generated when these are detected — the app surfaces resources instead.
// This list is deliberately conservative. Add phrases but never remove without review.
export const CRISIS_KEYWORDS: string[] = [
  // Explicit self-harm / suicide
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
  "life isn't worth",
  // Indirect expressions of hopelessness
  "can't go on",
  "cannot go on",
  'dont want to be here',
  "don't want to be here",
  'want to disappear',
  'make it stop',
  'not worth it anymore',
  'everyone would be better off',
  'better off without me',
  'give up on life',
  'tired of living',
  'done with life',
  'done with everything',
  'nothing left to live for',
]

export function containsCrisisContent(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some((phrase) => lower.includes(phrase))
}
