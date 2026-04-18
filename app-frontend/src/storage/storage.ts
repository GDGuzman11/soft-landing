import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AppSettings, CheckInEvent, SavedMessage } from '../types'

const KEYS = {
  SETTINGS: '@soft_landing/settings',
  CHECK_INS: '@soft_landing/check_ins',
  SAVED_MESSAGES: '@soft_landing/saved_messages',
} as const

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  haptics: true,
  notifications: {
    enabled: false,
    frequency: 'off',
    times: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  subscription: {
    tier: 'free',
    entitlements: [],
    expiresAt: null,
    isTrialing: false,
  },
  onboardingComplete: false,
  faithIntroComplete: false,
  checkInsToday: 0,
  lastCheckInDate: null,
}

async function get<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

async function set<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value))
}

export async function getSettings(): Promise<AppSettings> {
  const stored = await get<Partial<AppSettings>>(KEYS.SETTINGS, {})
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await set(KEYS.SETTINGS, settings)
}

export async function getCheckIns(): Promise<CheckInEvent[]> {
  return get<CheckInEvent[]>(KEYS.CHECK_INS, [])
}

export async function addCheckIn(event: CheckInEvent): Promise<void> {
  const events = await getCheckIns()
  await set(KEYS.CHECK_INS, [event, ...events])
}

export async function getSavedMessages(): Promise<SavedMessage[]> {
  return get<SavedMessage[]>(KEYS.SAVED_MESSAGES, [])
}

export async function saveMessage(entry: SavedMessage): Promise<void> {
  const saved = await getSavedMessages()
  await set(KEYS.SAVED_MESSAGES, [entry, ...saved])
}

export async function deleteSavedMessage(id: string): Promise<void> {
  const saved = await getSavedMessages()
  await set(KEYS.SAVED_MESSAGES, saved.filter((m) => m.id !== id))
}

export async function getTodayCheckInCount(): Promise<number> {
  const settings = await getSettings()
  const today = new Date().toISOString().slice(0, 10)

  if (settings.lastCheckInDate !== today) return 0
  return settings.checkInsToday
}

export async function incrementCheckInCount(): Promise<number> {
  const settings = await getSettings()
  const today = new Date().toISOString().slice(0, 10)

  const isNewDay = settings.lastCheckInDate !== today
  const newCount = isNewDay ? 1 : settings.checkInsToday + 1

  await saveSettings({
    ...settings,
    checkInsToday: newCount,
    lastCheckInDate: today,
  })

  return newCount
}
