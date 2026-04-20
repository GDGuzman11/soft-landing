import { View, Text, Switch, Pressable, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { getSettings, saveSettings, clearAllData } from '@/storage/storage'
import { requestPermission, scheduleDaily, cancelAll } from '@/services/notifications'
import { signOutUser } from '@/services/auth'
import type { AppSettings } from '@/types'

const DEFAULT_REMINDER_TIME = '08:00'

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  async function toggle(key: 'haptics') {
    if (!settings) return
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    await saveSettings(updated)
  }

  async function toggleNotifications() {
    if (!settings) return
    const enabling = !settings.notifications.enabled

    if (enabling) {
      const granted = await requestPermission()
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Enable notifications in your device Settings to receive daily reminders.',
          [{ text: 'OK' }]
        )
        return
      }

      const time = settings.notifications.times[0] ?? DEFAULT_REMINDER_TIME
      await scheduleDaily(time)

      const updated: AppSettings = {
        ...settings,
        notifications: {
          ...settings.notifications,
          enabled: true,
          frequency: 'daily',
          times: [time],
        },
      }
      setSettings(updated)
      await saveSettings(updated)
    } else {
      await cancelAll()
      const updated: AppSettings = {
        ...settings,
        notifications: {
          ...settings.notifications,
          enabled: false,
          frequency: 'off',
        },
      }
      setSettings(updated)
      await saveSettings(updated)
    }
  }

  const isPremium = settings?.subscription.tier === 'premium'
  const reminderTime = settings?.notifications.times[0] ?? DEFAULT_REMINDER_TIME
  const notificationsEnabled = settings?.notifications.enabled ?? false

  function formatTime(time: string) {
    const [hourStr, minuteStr] = time.split(':')
    const hour = parseInt(hourStr, 10)
    const minute = parseInt(minuteStr, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h = hour % 12 || 12
    return `${h}:${minuteStr.padStart(2, '0')} ${ampm}`
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="px-6 pt-14 pb-4">
        <Text
          className="text-text-primary text-2xl"
          style={{ fontFamily: 'DMSans_500Medium' }}
        >
          Settings
        </Text>
      </View>

      {/* Subscription */}
      <View className="mx-6 mb-6 rounded-2xl overflow-hidden border border-border">
        <View className="px-5 py-4 bg-surface">
          <Text
            className="text-text-secondary text-xs uppercase mb-3"
            style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
          >
            Subscription
          </Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className="text-text-primary text-base"
                style={{ fontFamily: 'DMSans_500Medium' }}
              >
                {isPremium ? 'Premium' : 'Free'}
              </Text>
              <Text
                className="text-text-secondary text-sm mt-0.5"
                style={{ fontFamily: 'DMSans_400Regular' }}
              >
                {isPremium ? 'Unlimited check-ins' : '10 check-ins per day'}
              </Text>
            </View>
            {!isPremium && (
              <Pressable
                onPress={() => router.push('/paywall')}
                className="bg-accent px-4 py-2 rounded-full active:opacity-80"
              >
                <Text
                  className="text-white text-sm"
                  style={{ fontFamily: 'DMSans_500Medium' }}
                >
                  Upgrade
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View className="mx-6 rounded-2xl overflow-hidden border border-border bg-surface">
        <Text
          className="text-text-secondary text-xs uppercase px-5 pt-4 pb-3"
          style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
        >
          Preferences
        </Text>

        <View className="flex-row items-center justify-between px-5 py-4 border-t border-border">
          <View>
            <Text
              className="text-text-primary text-base"
              style={{ fontFamily: 'DMSans_400Regular' }}
            >
              Haptic feedback
            </Text>
            <Text
              className="text-text-secondary text-sm mt-0.5"
              style={{ fontFamily: 'DMSans_400Regular' }}
            >
              Vibration on tap and save
            </Text>
          </View>
          <Switch
            value={settings?.haptics ?? true}
            onValueChange={() => toggle('haptics')}
            trackColor={{ false: '#E8E3DC', true: '#C4956A' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="px-5 py-4 border-t border-border">
          <View className="flex-row items-center justify-between">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                className="text-text-primary text-base"
                style={{ fontFamily: 'DMSans_400Regular' }}
              >
                Daily reminder
              </Text>
              <Text
                className="text-text-secondary text-sm mt-0.5"
                style={{ fontFamily: 'DMSans_400Regular' }}
              >
                {notificationsEnabled
                  ? `Reminder set for ${formatTime(reminderTime)}`
                  : 'Nudge to check in each day'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#E8E3DC', true: '#C4956A' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* About & Credits */}
      <View className="mx-6 mt-6 rounded-2xl overflow-hidden border border-border bg-surface">
        <Text
          className="text-text-secondary text-xs uppercase px-5 pt-4 pb-3"
          style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
        >
          About
        </Text>

        <View className="px-5 py-4 border-t border-border">
          <Text
            style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#3D2F2A', marginBottom: 4 }}
          >
            Scripture
          </Text>
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#A09080', lineHeight: 18 }}
          >
            Scripture taken from the Holy Bible, New International Version®, NIV®{'\n'}
            Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™{'\n'}
            Used by permission. All rights reserved worldwide.
          </Text>
        </View>

        <View className="px-5 py-4 border-t border-border">
          <Text
            style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#3D2F2A', marginBottom: 4 }}
          >
            AI Letters
          </Text>
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#A09080', lineHeight: 18 }}
          >
            Letters are written by AI for spiritual encouragement only — not professional, medical, or mental health advice.
          </Text>
        </View>

        <View className="px-5 py-4 border-t border-border">
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#A09080', lineHeight: 18 }}
          >
            © 2026 Gabe & Jackie De Guzman. All rights reserved.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => {
          Alert.alert(
            'Start over?',
            'This will clear all your saved data and return to the beginning.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear & restart',
                style: 'destructive',
                onPress: async () => {
                  await clearAllData()
                  await signOutUser()
                  router.replace('/welcome')
                },
              },
            ]
          )
        }}
        className="mt-8 mb-2"
        accessibilityRole="button"
        accessibilityLabel="Start over"
      >
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: '#C0A898',
            textAlign: 'center',
          }}
        >
          Start over
        </Text>
      </Pressable>

      <Text
        className="text-text-secondary text-xs text-center mt-2"
        style={{ fontFamily: 'DMSans_400Regular' }}
      >
        Soft Landing v1.1.0
      </Text>
    </ScrollView>
  )
}
