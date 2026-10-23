import type { EmotionId } from '../types'
import data from './reflections.json'

/** Curated reflection one-liners per emotion (see reflections.json). */
const LINES = data as unknown as Record<EmotionId, string[]>

/**
 * Pick a thought-starting one-liner for the given emotion. Pass the current
 * index so the "New line" button avoids repeating the line on screen.
 * Returns the chosen line and its index (so the caller can exclude it next time).
 */
export function getReflectionLine(
  emotionId: EmotionId,
  excludeIndex?: number
): { line: string; index: number } {
  const lines = LINES[emotionId] ?? []
  if (lines.length === 0) return { line: '', index: -1 }
  if (lines.length === 1) return { line: lines[0], index: 0 }

  let idx = Math.floor(Math.random() * lines.length)
  if (excludeIndex !== undefined && idx === excludeIndex) {
    idx = (idx + 1) % lines.length
  }
  return { line: lines[idx], index: idx }
}
