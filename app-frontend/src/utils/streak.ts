import type { CheckInEvent } from '@/types'

export function calcStreak(checkIns: CheckInEvent[]): number {
  if (checkIns.length === 0) return 0
  const dates = [...new Set(checkIns.map((e) => e.timestamp.slice(0, 10)))]
    .sort()
    .reverse()
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  let cursor = today
  for (const date of dates) {
    if (date === cursor) {
      streak++
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().slice(0, 10)
    } else if (date < cursor) {
      break
    }
  }
  return streak
}

export function hasTodayCheckIn(checkIns: CheckInEvent[]): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return checkIns.some((e) => e.timestamp.slice(0, 10) === today)
}
