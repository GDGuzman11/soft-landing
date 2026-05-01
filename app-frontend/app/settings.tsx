import { View, Text, Switch, Pressable, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { getSettings, saveSettings, clearAllData } from '@/storage/storage'
import { requestPermission, scheduleDaily, cancelAll, previewReachOut } from '@/services/notifications'
import { signOutUser } from '@/services/auth'
import type { AppSettings } from '@/types'
import { db } from '@/services/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { useTheme } from '@/theme'

const DEFAULT_REMINDER_TIME = '08:00'

const SECTION_LABEL_STYLE = { fontFamily: 'DMSans_500Medium', letterSpacing: 1 } as const
const LEGAL_ROW_LABEL_STYLE = { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#3D2F2A' } as const
const CHEVRON_STYLE = { fontFamily: 'DMSans_400Regular', fontSize: 18, color: '#C4956A' } as const

const VOICE_IDS = ['kind', 'still', 'steady', 'wise'] as const
type VoiceId = (typeof VOICE_IDS)[number]

const VOICE_LABELS: Record<VoiceId, string> = {
  kind: 'Kind',
  still: 'Still',
  steady: 'Steady',
  wise: 'Wise',
}

const PREVIEW_SAMPLES: Record<VoiceId, { name: string; message: string }> = {
  kind: { name: 'Kind', message: "hey. just wanted to say — today doesn't need to be productive to count." },
  still: { name: 'Still', message: "feet on the floor. one breath. that's the whole text." },
  steady: { name: 'Steady', message: 'still here. still loved. boringly consistent, that part.' },
  wise: { name: 'Wise', message: "even the river bends. that's not failure — that's the shape of getting through." },
}

export default function SettingsScreen() {
  const { colors } = useTheme()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loadError, setLoadError] = useState<boolean>(false)
  const [mutedVoices, setMutedVoices] = useState<VoiceId[]>([])
  const [tokenDocLoaded, setTokenDocLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSettings()
      .then((s) => {
        if (!cancelled) setSettings(s)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    const user = getAuth().currentUser
    if (user) {
      getDoc(doc(db, 'pushTokens', user.uid))
        .then((snap) => {
          if (cancelled) return
          if (snap.exists()) {
            const data = snap.data() as { mutedVoices?: string[] }
            const stored = data.mutedVoices ?? []
            // Filter to known voices to keep state strongly typed
            const filtered = stored.filter((v): v is VoiceId =>
              (VOICE_IDS as readonly string[]).includes(v)
            )
            setMutedVoices(filtered)
          }
          setTokenDocLoaded(true)
        })
        .catch(() => {
          if (!cancelled) setTokenDocLoaded(true)
        })
    } else {
      setTokenDocLoaded(true)
    }

    return () => {
      cancelled = true
    }
  }, [])

  async function toggleVoiceMute(voiceId: VoiceId) {
    const user = getAuth().currentUser
    if (!user) return
    const next = mutedVoices.includes(voiceId)
      ? mutedVoices.filter((v) => v !== voiceId)
      : [...mutedVoices, voiceId]
    setMutedVoices(next)
    await setDoc(
      doc(db, 'pushTokens', user.uid),
      { mutedVoices: next, updatedAt: serverTimestamp() },
      { merge: true }
    )
  }

  async function handlePreview() {
    // Pick first non-muted voice, fallback to Kind
    const voice = VOICE_IDS.find((v) => !mutedVoices.includes(v)) ?? 'kind'
    const sample = PREVIEW_SAMPLES[voice]
    Alert.alert('Lock your screen', 'The notification will arrive in 3 seconds.', [{ text: 'OK' }])
    await previewReachOut(sample.name, sample.message)
  }

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

  function formatTime(time: string) {
    const [hourStr, minuteStr] = time.split(':')
    const hour = parseInt(hourStr, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h = hour % 12 || 12
    return `${h}:${minuteStr.padStart(2, '0')} ${ampm}`
  }

  // Loading state
  if (!settings && !loadError) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: '#FAF8F5' }}
      >
        <Text style={{ fontFamily: 'DMSans_400Regular', color: '#9A8F82' }}>
          Loading…
        </Text>
      </View>
    )
  }

  // Error state
  if (loadError || !settings) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: '#FAF8F5' }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 18,
            color: '#3D2F2A',
            marginBottom: 8,
          }}
        >
          Couldn't load settings
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: '#C4956A',
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 999,
            marginTop: 8,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', color: '#FFFFFF' }}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  const reminderTime = settings.notifications.times[0] ?? DEFAULT_REMINDER_TIME
  const notificationsEnabled = settings.notifications.enabled

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#FAF8F5' }}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* Header */}
      <View
        className="px-6 pt-14 pb-4"
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={{ marginRight: 16 }}
        >
          <Text style={{ fontSize: 28, color: '#3D2F2A', fontFamily: 'DMSans_400Regular' }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 22, color: '#3D2F2A' }}>
          Settings
        </Text>
      </View>

      {/* Preferences */}
      <View className="mx-6 rounded-2xl overflow-hidden border border-border bg-surface">
        <Text
          className="text-text-secondary text-xs uppercase px-5 pt-4 pb-3"
          style={SECTION_LABEL_STYLE}
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
            value={settings.haptics ?? true}
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

      {/* Voice Reach-Outs */}
      <View style={{ marginHorizontal: 24, marginTop: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 11,
              color: colors.sectionLabel,
              textTransform: 'uppercase',
              letterSpacing: 1.6,
            }}
          >
            Voice Reach-Outs
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.amber }}>✦</Text>
        </View>
        <View
          style={{
            backgroundColor: colors.profileCard,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
          }}
        >
          {/* Master enable row */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.inkPrimary }}>
                Voice messages
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: colors.inkMuted,
                  marginTop: 2,
                }}
              >
                Your voices check in — morning & evening
              </Text>
            </View>
            <Switch
              value={settings.notifications.enabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.cardBorder, true: colors.amber }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Toggle voice reach-outs"
            />
          </View>

          {/* Per-voice mute rows + preview — only when enabled and Firestore doc has settled */}
          {settings.notifications.enabled && tokenDocLoaded && (
            <>
              {VOICE_IDS.map((voiceId) => {
                const label = VOICE_LABELS[voiceId]
                const isMuted = mutedVoices.includes(voiceId)
                return (
                  <View
                    key={voiceId}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTopWidth: 1,
                      borderTopColor: colors.cardBorder,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.inkPrimary }}>
                      {label}
                    </Text>
                    <Switch
                      value={!isMuted}
                      onValueChange={() => toggleVoiceMute(voiceId)}
                      trackColor={{ false: colors.cardBorder, true: colors.amber }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel={`Toggle ${label} messages`}
                    />
                  </View>
                )
              })}

              {/* Preview row */}
              <Pressable
                onPress={handlePreview}
                style={({ pressed }) => ({
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTopWidth: 1,
                  borderTopColor: colors.cardBorder,
                  opacity: pressed ? 0.6 : 1,
                })}
                accessibilityRole="button"
                accessibilityLabel="Preview a notification"
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.inkPrimary }}>
                  Preview a notification
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 18, color: colors.amber }}>›</Text>
              </Pressable>
            </>
          )}

          {/* Loading placeholder while Firestore mute doc resolves */}
          {settings.notifications.enabled && !tokenDocLoaded && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>
                Loading voices…
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* About & Credits */}
      <View className="mx-6 mt-6 rounded-2xl overflow-hidden border border-border bg-surface">
        <Text
          className="text-text-secondary text-xs uppercase px-5 pt-4 pb-3"
          style={SECTION_LABEL_STYLE}
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
            Scripture is taken from the King James Version (KJV), which is in the public domain, and the World English Bible (WEB), also in the public domain.
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

      {/* Account */}
      <View className="mx-6 mt-6 rounded-2xl overflow-hidden border border-border bg-surface">
        <Text
          className="text-text-secondary text-xs uppercase px-5 pt-4 pb-3"
          style={SECTION_LABEL_STYLE}
        >
          Account
        </Text>

        <Pressable
          className="px-5 py-4 border-t border-border"
          onPress={() => {
            Alert.alert(
              'Delete account?',
              'This will permanently erase all your data and cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete permanently',
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
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#E8A598' }}>
            Delete account
          </Text>
        </Pressable>
      </View>

      {/* Legal */}
      <View className="mx-6 mt-6 rounded-2xl overflow-hidden border border-border bg-surface">
        <Text
          className="text-text-secondary text-xs uppercase px-5 pt-4 pb-3"
          style={SECTION_LABEL_STYLE}
        >
          Legal
        </Text>

        <Pressable
          className="px-5 py-4 border-t border-border"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          onPress={() =>
            Alert.alert('Coming soon', 'Terms of use will be available before launch.')
          }
          accessibilityRole="button"
          accessibilityLabel="Terms of Use"
        >
          <Text style={LEGAL_ROW_LABEL_STYLE}>
            Terms of Use
          </Text>
          <Text style={CHEVRON_STYLE}>›</Text>
        </Pressable>

        <Pressable
          className="px-5 py-4 border-t border-border"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          onPress={() =>
            Alert.alert('Coming soon', 'Privacy policy will be available before launch.')
          }
          accessibilityRole="button"
          accessibilityLabel="Privacy Policy"
        >
          <Text style={LEGAL_ROW_LABEL_STYLE}>
            Privacy Policy
          </Text>
          <Text style={CHEVRON_STYLE}>›</Text>
        </Pressable>
      </View>

      {/* Start over */}
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
    </ScrollView>
  )
}
