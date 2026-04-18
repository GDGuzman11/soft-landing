import { View, Text, Switch, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '@/storage/storage'
import type { AppSettings } from '@/types'

const DEFAULT_SETTINGS: Pick<AppSettings, 'haptics' | 'notifications' | 'subscription'> = {
  haptics: true,
  notifications: { enabled: false, frequency: 'off', times: [], timezone: '' },
  subscription: { tier: 'free', entitlements: [], expiresAt: null, isTrialing: false },
}

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
    const enabled = !settings.notifications.enabled
    const updated = {
      ...settings,
      notifications: { ...settings.notifications, enabled },
    }
    setSettings(updated)
    await saveSettings(updated)
  }

  const isPremium = settings?.subscription.tier === 'premium'

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
                {isPremium ? 'Unlimited check-ins' : '3 check-ins per day'}
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

        <View className="flex-row items-center justify-between px-5 py-4 border-t border-border">
          <View>
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
              Nudge to check in each day
            </Text>
          </View>
          <Switch
            value={settings?.notifications.enabled ?? false}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#E8E3DC', true: '#C4956A' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <Text
        className="text-text-secondary text-xs text-center mt-8"
        style={{ fontFamily: 'DMSans_400Regular' }}
      >
        Soft Landing v1.0.0
      </Text>
    </ScrollView>
  )
}
