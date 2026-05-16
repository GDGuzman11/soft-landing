/**
 * Pure date helpers for The Path calendar.
 * All date strings are local-time YYYY-MM-DD (no UTC drift across day boundaries).
 */

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfWeek(dateStr: string): string {
  // Returns Sunday (YYYY-MM-DD) of the week containing dateStr.
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - d.getDay())
  return toIsoDate(d)
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toIsoDate(d)
}

export function buildWeekSlots(sundayDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(sundayDate, i))
}

export function buildMonthSlots(year: number, month: number): (string | null)[] {
  // Returns 42 slots (6 rows x 7 cols). null = padding outside the current month.
  const firstDay = new Date(year, month, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const slots: (string | null)[] = []
  for (let i = 0; i < firstDay; i++) slots.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = String(d).padStart(2, '0')
    const mm = String(month + 1).padStart(2, '0')
    slots.push(`${year}-${mm}-${dd}`)
  }
  while (slots.length < 42) slots.push(null)
  return slots
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}
