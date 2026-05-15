import { View, Text, Pressable, ScrollView, Modal } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getSavedMessages,
  getSettings,
  saveSettings,
  getCheckIns,
  calcStreak,
} from '@/storage/storage'
import type { SavedMessage, Message, CheckInEvent } from '@/types'
import { useTheme } from '@/theme'
import { requestPermission, scheduleDaily } from '@/services/notifications'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ResolvedSavedMessage {
  saved: SavedMessage
  body: string
  reference: string
}

const MILESTONE_TEXT: Record<number, string> = {
  7: '7 days. You keep showing up.',
  14: 'Two weeks. This is becoming yours.',
  30: 'A month of showing up.',
  100: '100 days. This is who you are.',
}

async function lookupVerse(
  messageId: string,
  emotionId: string
): Promise<{ body: string; reference: string }> {
  try {
    const cached = await AsyncStorage.getItem(`@soft_landing/verse_pool/${emotionId}`)
    if (cached) {
      const pool: { fetchedAt: string; verses: Message[] } = JSON.parse(cached)
      const msg = pool.verses.find((v) => v.id === messageId)
      if (msg) return { body: msg.body, reference: msg.reference ?? '' }
    }
  } catch {}
  return { body: '', reference: '' }
}

export default function SessionSummaryScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { ids } = useLocalSearchParams<{ ids: string }>()
  const [resolved, setResolved] = useState<ResolvedSavedMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [milestoneText, setMilestoneText] = useState<string | null>(null)
  const [showReminderPrompt, setShowReminderPrompt] = useState(false)

  // Animations
  const milestoneOpacity = useSharedValue(0)
  const promptTranslateY = useSharedValue(300)
  const promptOpacity = useSharedValue(0)
  const promptGlyphShadow = useSharedValue(4)

  useEffect(() => {
    if (!ids) {
      setLoaded(true)
      return
    }
    const idList = ids.split(',').filter(Boolean)
    getSavedMessages().then(async (all) => {
      const matches = all.filter((m) => idList.includes(m.id))
      const withVerses = await Promise.all(
        matches.map(async (saved) => {
          const emotionId = saved.emotionId ?? 'neutral'
          const { body, reference } = await lookupVerse(saved.messageId, emotionId)
          return { saved, body, reference }
        })
      )
      setResolved(withVerses)
      setLoaded(true)
    })
  }, [ids])

  // Milestone + reminder prompt logic — runs once on mount
  useEffect(() => {
    let cancelled = false
    let promptTimer: ReturnType<typeof setTimeout> | null = null

    void (async () => {
      try {
        const [settings, checkIns] = await Promise.all([getSettings(), getCheckIns()])
        if (cancelled) return

        // Milestone detection
        const streak = calcStreak(checkIns as CheckInEvent[])
        const text = MILESTONE_TEXT[streak]
        if (text) {
          setMilestoneText(text)
          milestoneOpacity.value = withDelay(800, withTiming(1, { duration: 600 }))
        }

        // Reminder prompt — show only on the user's very first completed check-in
        if (!settings.reminderPromptShown && checkIns.length <= 1) {
          promptTimer = setTimeout(() => {
            if (cancelled) return
            setShowReminderPrompt(true)
            promptOpacity.value = withTiming(1, { duration: 220 })
            promptTranslateY.value = withSpring(0, { damping: 18, stiffness: 140 })
            promptGlyphShadow.value = withRepeat(
              withSequence(
                withTiming(16, { duration: 1200 }),
                withTiming(4, { duration: 1200 })
              ),
              -1,
              true
            )
          }, 600)
        }
      } catch {
        // non-fatal — prompt simply won't appear
      }
    })()

    return () => {
      cancelled = true
      if (promptTimer) clearTimeout(promptTimer)
    }
  }, [milestoneOpacity, promptOpacity, promptTranslateY, promptGlyphShadow])

  useEffect(() => {
    // Only auto-route home when there is nothing to show AND no prompt is being displayed
    if (loaded && resolved.length === 0 && !showReminderPrompt) {
      const t = setTimeout(() => router.replace('/(tabs)'), 1500)
      return () => clearTimeout(t)
    }
  }, [loaded, resolved, showReminderPrompt])

  const milestoneStyle = useAnimatedStyle(() => ({ opacity: milestoneOpacity.value }))
  const promptOverlayStyle = useAnimatedStyle(() => ({ opacity: promptOpacity.value }))
  const promptSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: promptTranslateY.value }],
  }))
  const promptGlyphStyle = useAnimatedStyle(() => ({
    textShadowRadius: promptGlyphShadow.value,
  }))

  async function dismissPrompt(): Promise<void> {
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, reminderPromptShown: true })
    } catch {
      // non-fatal
    }
    promptOpacity.value = withTiming(0, { duration: 200 })
    promptTranslateY.value = withTiming(300, { duration: 220 })
    setTimeout(() => setShowReminderPrompt(false), 240)
  }

  async function handleSetReminder(): Promise<void> {
    try {
      const granted = await requestPermission()
      if (granted) {
        await scheduleDaily('08:00')
      }
    } catch {
      // non-fatal — user can re-enable in settings
    }
    await dismissPrompt()
  }

  async function handleNotNow(): Promise<void> {
    await dismissPrompt()
  }

  if (!loaded) return null

  // Empty state — no saved verses this session.
  // (Note: even in empty state we still want the reminder prompt to be able to render
  // if the user happens to be a first-time check-in user — auto-route is deferred via
  // the `showReminderPrompt` guard above.)
  if (resolved.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 16,
            color: colors.inkMuted,
            textAlign: 'center',
          }}
        >
          Nothing saved this session.
        </Text>
        {renderReminderPrompt()}
      </View>
    )
  }

  function renderReminderPrompt() {
    if (!showReminderPrompt) return null
    return (
      <Modal transparent visible animationType="none" onRequestClose={handleNotNow}>
        <Animated.View
          style={[
            {
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.15)',
              justifyContent: 'flex-end',
            },
            promptOverlayStyle,
          ]}
        >
          <Animated.View
            style={[
              {
                backgroundColor: '#FAF8F5',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 32,
                paddingTop: 28,
                paddingBottom: 40 + insets.bottom,
                borderTopWidth: 1,
                borderTopColor: 'rgba(196,149,106,0.3)',
                alignItems: 'center',
              },
              promptSheetStyle,
            ]}
          >
            <Animated.Text
              style={[
                {
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 22,
                  color: '#C4956A',
                  textShadowColor: '#C4956A',
                  textShadowOffset: { width: 0, height: 0 },
                },
                promptGlyphStyle,
              ]}
            >
              ✦
            </Animated.Text>
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 20,
                color: '#3D2F2A',
                textAlign: 'center',
                marginTop: 16,
                lineHeight: 28,
              }}
            >
              Soft Landing works best as a daily moment.
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: '#9A8880',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              Want a reminder to come back?
            </Text>
            <Pressable
              onPress={handleSetReminder}
              accessibilityRole="button"
              accessibilityLabel="Set a daily reminder"
              className="active:opacity-80"
              style={{
                marginTop: 28,
                backgroundColor: '#C4956A',
                borderRadius: 9999,
                paddingVertical: 14,
                paddingHorizontal: 48,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 16,
                  color: '#FFFFFF',
                }}
              >
                Set a reminder
              </Text>
            </Pressable>
            <Pressable
              onPress={handleNotNow}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              className="active:opacity-60"
              style={{ marginTop: 16 }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: '#9A8880',
                }}
              >
                Not now
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 22,
            color: '#3D2F2A',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Today's verses
        </Text>

        {resolved.map(({ saved: item, body, reference }) => {
          return (
            <View
              key={item.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {reference ? (
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: '#C4956A',
                    letterSpacing: 0.3,
                    marginBottom: 6,
                  }}
                >
                  {reference}
                </Text>
              ) : null}

              {body ? (
                <Text
                  style={{
                    fontFamily: 'Lora_400Regular',
                    fontSize: 15,
                    color: '#3D2F2A',
                    lineHeight: 24,
                    marginBottom: 16,
                  }}
                  numberOfLines={3}
                >
                  {body}
                </Text>
              ) : null}

              <View style={{ alignItems: 'flex-end' }}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/check-in/letter-compose',
                      params: { savedMessageId: item.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Write a letter for this verse"
                  className="active:opacity-80"
                  style={{
                    backgroundColor: '#C4956A',
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                    borderRadius: 20,
                  }}
                >
                  <Text
                    style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#FFFFFF' }}
                  >
                    Write a letter →
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        })}

        {milestoneText ? (
          <Animated.View style={[{ alignItems: 'center', marginTop: 12, marginBottom: 8 }, milestoneStyle]}>
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 15,
                color: '#C4956A',
                textAlign: 'center',
                marginBottom: 4,
              }}
            >
              ✦
            </Text>
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 15,
                color: '#C4956A',
                textAlign: 'center',
              }}
            >
              {milestoneText}
            </Text>
          </Animated.View>
        ) : null}

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Done, go home"
          className="active:opacity-50"
          style={{ alignItems: 'center', marginTop: 8 }}
        >
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#A09080' }}
          >
            Done — go home
          </Text>
        </Pressable>
      </ScrollView>
      {renderReminderPrompt()}
    </View>
  )
}
