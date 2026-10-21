/**
 * Device-LOCAL calendar day key, formatted YYYY-MM-DD.
 *
 * Use this instead of `new Date().toISOString().slice(0, 10)` for anything that
 * represents "what day is it for the user" — streaks, daily check-in counts,
 * the home 7-day window. `toISOString()` is UTC, which rolls over at the wrong
 * local clock time and makes the app jump to a "new day" early (the bug this fixes).
 */
export function localDayKey(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
