import * as ExpoNotifications from 'expo-notifications'
import { Platform } from 'react-native'
import { getAuth } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/services/firebase'

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

const CHANNEL_ID = 'soft-landing-daily'
const NOTIFICATION_ID = 'daily-reminder'

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await ExpoNotifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily Reminder',
      importance: ExpoNotifications.AndroidImportance.DEFAULT,
      sound: null,
    })
  }

  const { status: existing } = await ExpoNotifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await ExpoNotifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleDaily(time: string): Promise<void> {
  if (!/^\d{1,2}:\d{2}$/.test(time)) throw new Error(`Invalid time format: ${time}`)
  await cancelAll()

  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  await ExpoNotifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'Soft Landing',
      body: 'Take a moment. Find rest in His Word.',
      sound: false,
    },
    trigger: {
      type: ExpoNotifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  })
}

export async function cancelAll(): Promise<void> {
  await ExpoNotifications.cancelScheduledNotificationAsync(NOTIFICATION_ID)
}

export async function registerPushToken(isPremium: boolean): Promise<void> {
  try {
    const user = getAuth().currentUser
    if (!user) return

    // Request permission first
    const { status } = await ExpoNotifications.requestPermissionsAsync()
    if (status !== 'granted') return

    // Get Expo push token (throws in Expo Go / simulator — that's fine)
    const { data: token } = await ExpoNotifications.getExpoPushTokenAsync({
      projectId: '2d79e638-f797-42ff-86b3-94f5c20fa6ff',
    })

    const timezoneOffset = -new Date().getTimezoneOffset() / 60

    await setDoc(
      doc(db, 'pushTokens', user.uid),
      { token, isPremium, timezoneOffset, updatedAt: serverTimestamp() },
      { merge: true }
    )
  } catch {
    // Expo Go / simulator / permission denied — silent skip
  }
}

export async function previewReachOut(voiceName: string, message: string): Promise<void> {
  const { status } = await ExpoNotifications.requestPermissionsAsync()
  if (status !== 'granted') return

  await ExpoNotifications.scheduleNotificationAsync({
    content: { title: voiceName, body: message, sound: true },
    trigger: { type: ExpoNotifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  })
}
