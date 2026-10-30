// sayTitle.ts — shared helper to label a Say chat with a short title + one-line
// summary for the Journal/Everyday list rows. Used by startSayLetterChat (from
// the letter + reflection) and generateSayResponse (backfilled from the first
// exchange of an everyday chat).

import Anthropic from '@anthropic-ai/sdk'

const MAX_TITLE_CHARS = 60
const MAX_SUMMARY_CHARS = 160

export interface TitleSummary {
  title: string
  summary: string
}

/** Strip control chars + template-escape sequences before a string reaches Claude. */
export function sanitizeForTitle(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\$\{/g, '')
    .trim()
    .slice(0, 1500)
}

function stripQuotes(s: string): string {
  return s.replace(/^["'“‘]+|["'”’]+$/g, '').trim()
}

/**
 * Generate a short title (2–5 words) + one-line summary from a transcript.
 * Returns null on any failure — callers treat the label as optional.
 */
export async function generateTitleAndSummary(
  client: Anthropic,
  transcript: string,
): Promise<TitleSummary | null> {
  try {
    const completion = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 80,
      system:
        'You label a short, private journal conversation for a list view. ' +
        'Reply with exactly two lines and nothing else:\n' +
        'TITLE: 2 to 5 words, plain, sentence case, no quotes, no trailing period.\n' +
        'SUMMARY: one sentence, 18 words or fewer, third person, no names, no quotes, ' +
        'describing what it was about (e.g. "Talked about feeling overwhelmed and ways to find calm").',
      messages: [{ role: 'user', content: `Conversation:\n\n${transcript}\n\nLabel it.` }],
    })
    const block = completion.content[0]
    if (!block || block.type !== 'text') return null
    const lines = block.text
      .trim()
      .split('\n')
      .map((l) => l.replace(/^\s*(TITLE|SUMMARY)\s*[:\-–]\s*/i, '').trim())
      .filter((l) => l.length > 0)
    const title = stripQuotes(lines[0] ?? '').slice(0, MAX_TITLE_CHARS).trim()
    const summary = stripQuotes(lines[1] ?? '').slice(0, MAX_SUMMARY_CHARS).trim()
    if (!title) return null
    return { title, summary }
  } catch {
    return null
  }
}
