import * as ExpoNotifications from 'expo-notifications'
import { Platform } from 'react-native'

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
  await ExpoNotifications.cancelAllScheduledNotificationsAsync()
}
