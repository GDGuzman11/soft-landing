import { getSettings, saveSettings } from '@/storage/storage'

/** Minimum age to use Soft Landing (App Store 16+ gate). */
export const MIN_AGE = 16

/** Auto-format a date of birth as MM-DD-YYYY while typing (digits only; dashes inserted). */
export function formatDob(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length > 4) return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`
  if (d.length > 2) return `${d.slice(0, 2)}-${d.slice(2)}`
  return d
}

/** Parse MM-DD-YYYY and return age in whole years, or null if invalid. The date of birth is never stored. */
export function ageFromDob(input: string): number | null {
  const m = input.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (!m) return null
  const month = parseInt(m[1], 10)
  const day = parseInt(m[2], 10)
  const year = parseInt(m[3], 10)
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  const now = new Date()
  let age = now.getFullYear() - year
  const beforeBirthday =
    now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)
  if (beforeBirthday) age -= 1
  return age
}

/** Whether this device has already passed the 16+ gate. */
export async function isAgeVerified(): Promise<boolean> {
  try {
    const s = await getSettings()
    return s.ageVerified === true
  } catch {
    return false
  }
}

/** Persist that the 16+ gate has been satisfied (best-effort; the DOB itself is never stored). */
export async function markAgeVerified(): Promise<void> {
  try {
    const s = await getSettings()
    await saveSettings({ ...s, ageVerified: true })
  } catch {
    // non-fatal — the age check already passed; persistence is best-effort
  }
}
