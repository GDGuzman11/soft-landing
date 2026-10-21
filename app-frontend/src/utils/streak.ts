import type { CheckInEvent } from '@/types'
import { localDayKey } from './day'

export function calcStreak(checkIns: CheckInEvent[]): number {
  if (checkIns.length === 0) return 0
  const dates = [...new Set(checkIns.map((e) => localDayKey(new Date(e.timestamp))))]
    .sort()
    .reverse()
  let streak = 0
  let cursor = localDayKey()
  for (const date of dates) {
    if (date === cursor) {
      streak++
      const [y, m, d] = cursor.split('-').map(Number)
      cursor = localDayKey(new Date(y, m - 1, d - 1))
    } else if (date < cursor) {
      break
    }
  }
  return streak
}

export function hasTodayCheckIn(checkIns: CheckInEvent[]): boolean {
  const today = localDayKey()
  return checkIns.some((e) => localDayKey(new Date(e.timestamp)) === today)
}
