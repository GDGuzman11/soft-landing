import { normalizedForms } from './textNormalizer'

// High-risk phrases that trigger the crisis resource screen instead of letter generation.
// The letter is never generated when these are detected — the app surfaces resources instead.
// This list is deliberately conservative. Add phrases but never remove without review.
//
// Normalization is applied before matching, so these phrases also catch:
// - Leet speak: "k1ll my$elf", "su1c1de", "$elf h4rm"
// - Deliberate spacing: "k i l l m y s e l f", "s.u.i.c.i.d.e"
// - Unicode homoglyphs: Cyrillic/Greek lookalike characters substituted for Latin
// - Zero-width invisible characters inserted between letters
export const CRISIS_KEYWORDS: string[] = [
  // ── Explicit self-harm / suicide ──────────────────────────────────────────
  'kill myself',
  'killing myself',
  'kill myself',
  'end my life',
  'end it all',
  'want to die',
  'wanted to die',
  'wanting to die',
  'wanna die',
  'gonna die',
  'rather be dead',
  'suicide',
  'suicidal',
  'self harm',
  'self-harm',
  'selfharm',
  'hurt myself',
  'hurting myself',
  'cut myself',
  'cutting myself',
  'no reason to live',
  'not worth living',
  'life is not worth',
  "life isn't worth",
  'take my own life',
  'take my life',
  'end my pain',
  'off myself',
  'offing myself',
  // ── Social media / coded language ─────────────────────────────────────────
  // "unalive" — coined on TikTok to evade platform filters, widely adopted
  'unalive',
  'unaliving',
  // "sewerslide" — phonetic spelling of "suicide" used online
  'sewerslide',
  // Abbreviations common in texts and online messaging
  'kms',   // kill myself
  'kys',   // kill yourself
  // ── Indirect expressions of hopelessness ──────────────────────────────────
  "can't go on",
  "cannot go on",
  "cant go on",
  'dont want to be here',
  "don't want to be here",
  'do not want to be here',
  'want to disappear',
  'want to vanish',
  'make it stop',
  'not worth it anymore',
  'everyone would be better off',
  'everyone would be better off without me',
  'better off without me',
  'better off dead',
  'give up on life',
  'giving up on life',
  'tired of living',
  'tired of being alive',
  'done with life',
  'done with everything',
  'done with it all',
  'nothing left to live for',
  'nothing to live for',
  'no point in living',
  'no point going on',
  // ── "Not wake up" / sleep as metaphor ─────────────────────────────────────
  'not wake up',
  "won't wake up",
  'wont wake up',
  'never wake up',
  'go to sleep forever',
  'go to sleep and not wake',
  'sleep forever',
  // ── Goodbye / final message language ──────────────────────────────────────
  'final goodbye',
  'goodbye forever',
  'say goodbye for the last time',
  'last time talking',
  'last message',
  'writing this as my last',
  // ── Escape / ending pain ───────────────────────────────────────────────────
  'end the pain',
  'escape the pain',
  'escape it all',
  'escape everything',
  "don't want to exist",
  'dont want to exist',
  'do not want to exist',
  'wish i was dead',
  'wish i were dead',
  'wish i wasnt alive',
  "wish i wasn't alive",
  'wish i was never born',
  'not want to be alive',
  "don't want to be alive",
  'dont want to be alive',
  // ── Going to / planning language ──────────────────────────────────────────
  'going to end it',
  'gonna end it',
  'plan to end it',
  'about to end it',
  'decided to end it',
]

export function containsCrisisContent(text: string): boolean {
  const [formI, formL] = normalizedForms(text)
  return CRISIS_KEYWORDS.some((phrase) => formI.includes(phrase) || formL.includes(phrase))
}
