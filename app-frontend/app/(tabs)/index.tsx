import { View, Text, Pressable, Image, Dimensions, StyleSheet, ScrollView } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import {
  getSettings,
  saveSettings,
  getSavedMessages,
  getCheckIns,
  calcStreak,
  localDayKey,
} from '@/storage/storage'
import { getVerseById } from '@/messages/selector'
import { EMOTIONS } from '@/constants/emotions'
import type { AppSettings, CheckInEvent, EmotionId } from '@/types'
import { getCurrentUser } from '@/services/auth'
import PositionedTooltip from '@/components/PositionedTooltip'
import { useTheme } from '@/theme'
import { logAnalyticsEvent } from '@/services/firebase'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

const SCREEN_WIDTH = Dimensions.get('window').width
// Path tab is the 2nd of 4 tabs; its horizontal centre sits at 37.5% of screen width
const PATH_TAB_CENTER_X = SCREEN_WIDTH * 0.375

const EMOTION_ICON: Record<EmotionId, keyof typeof Ionicons.glyphMap> = {
  stressed: 'thunderstorm-outline',
  tired:    'moon-outline',
  sad:      'rainy-outline',
  neutral:  'partly-sunny-outline',
  good:     'sunny-outline',
}

type TodayEntry = {
  emotionId: EmotionId
  label: string
  verseBody: string
  verseReference: string
}

export default function HomeScreen() {
  const { colors, isDark, toggle } = useTheme()
  const insets = useSafeAreaInsets()
  const { tourStep } = useLocalSearchParams<{ tourStep?: string }>()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [todayEntry, setTodayEntry] = useState<TodayEntry | null>(null)
  const [streak, setStreak] = useState(0)
  const [recentDays, setRecentDays] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [showTourTooltip, setShowTourTooltip] = useState(tourStep === '5')
  const [buttonAnchorY, setButtonAnchorY] = useState(0)
  const checkInButtonRef = useRef<View>(null)
  const navigationChecked = useRef(false)
  const greetingOpacity = useSharedValue(0)
  const greetingY = useSharedValue(12)
  const buttonOpacity = useSharedValue(0)
  const buttonY = useSharedValue(16)
  const pathPulse = useSharedValue(1)
  const showPathTip = tourStep === 'path'

  useEffect(() => {
    if (!navigationChecked.current) {
      navigationChecked.current = true
      getSettings()
        .then((s) => {
          setSettings(s)
          const user = getCurrentUser()
          const isGuest = s.isGuest

          if (!s.name && user?.displayName) {
            saveSettings({ ...s, name: user.displayName })
              .then(() => setSettings(prev => prev ? { ...prev, name: user.displayName! } : prev))
              .catch(() => {})
          }

          if (tourStep !== 'path') {
            if (!user && !isGuest) {
              router.replace('/welcome')
            } else if (!s.disclaimerAccepted) {
              router.replace('/onboarding-disclaimer')
            } else if (!s.profileComplete) {
              router.replace('/onboarding-profile')
            } else if (!s.faithIntroComplete) {
              router.replace('/faith-intro')
            }
          }
        })
        .catch(() => {})
    }

    greetingOpacity.value = withTiming(1, { duration: 600 })
    greetingY.value = withTiming(0, { duration: 600 })
    buttonOpacity.value = withDelay(300, withTiming(1, { duration: 500 }))
    buttonY.value = withDelay(300, withSpring(0, { damping: 20, stiffness: 160 }))

    if (showPathTip) {
      pathPulse.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 750 }),
          withTiming(1, { duration: 750 }),
        ),
        -1,
        true,
      )
    }

    if (tourStep === '5') {
      const t = setTimeout(() => {
        checkInButtonRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
          setButtonAnchorY(pageY)
        })
      }, 150)
      return () => clearTimeout(t)
    }
  }, [])

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingY.value }],
  }))

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonY.value }],
  }))

  const pathPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pathPulse.value }],
    opacity: 2 - pathPulse.value,
  }))

  useFocusEffect(
    useCallback(() => {
      // Reload streak + saved count on every focus so the home screen reflects
      // the user's most recent activity after returning from a check-in flow.
      void (async () => {
        try {
          const [savedMsgs, checkIns] = await Promise.all([
            getSavedMessages(),
            getCheckIns(),
          ])
          setSavedCount(savedMsgs.length)

          // Today's saved entry drives the "check-in complete" state (newest first).
          const today = localDayKey()
          const todays = savedMsgs.find((m) => localDayKey(new Date(m.savedAt)) === today)
          if (todays && todays.emotionId) {
            const verse = getVerseById(todays.messageId)
            setTodayEntry({
              emotionId: todays.emotionId,
              label: EMOTIONS.find((e) => e.id === todays.emotionId)?.label ?? '',
              verseBody: verse?.body ?? '',
              verseReference: verse?.reference ?? '',
            })
          } else {
            setTodayEntry(null)
          }

          const events = checkIns as CheckInEvent[]
          setStreak(calcStreak(events))

          // Build a 7-day window: index 0 = 6 days ago, index 6 = today.
          const uniqueDates = new Set(events.map((e) => localDayKey(new Date(e.timestamp))))
          const window: boolean[] = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            window.push(uniqueDates.has(localDayKey(d)))
          }
          setRecentDays(window)
        } catch {
          // non-fatal — leave defaults in place
        }
      })()
    }, [])
  )

  function handleCheckIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    logAnalyticsEvent('check_in_started')
    router.push('/check-in')
  }

  function handleViewToday() {
    Haptics.selectionAsync().catch(() => {})
    router.push({ pathname: '/(tabs)/history', params: { openDate: localDayKey() } })
  }

  const emotionColor = todayEntry
    ? EMOTIONS.find((e) => e.id === todayEntry.emotionId)?.color ?? colors.amber
    : colors.amber

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg }}
      accessibilityLabel="Home screen"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Full-bleed scenic background — swaps with the theme */}
      <Image
        source={
          isDark
            ? require('../../assets/images/home-moonlit.png')
            : require('../../assets/images/home-sunrise.png')
        }
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      {/* Subtle mode-aware scrim for text legibility */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: 0.16 }]} pointerEvents="none" />

      {/* Light / dark toggle — visible over both images */}
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        hitSlop={10}
        style={{
          position: 'absolute',
          top: insets.top + 8,
          right: 20,
          zIndex: 2,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.22)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color="#FFFFFF" />
      </Pressable>

      {/* Centered content over the photo */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingTop: insets.top + 56,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
      <Animated.View
        style={[{ alignItems: 'center', marginBottom: savedCount > 0 ? 16 : 64, zIndex: 1 }, greetingStyle]}
        accessibilityRole="header"
      >
        <Image
          source={require('../../assets/images/icon-nobackground.png')}
          style={{
            width: 80,
            height: 80,
            marginBottom: 20,
            alignSelf: 'center',
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 13,
            color: colors.inkPrimary,
            textAlign: 'center',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 10,
            textShadowColor: colors.bg,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 10,
          }}
        >
          {isDark ? 'Good Evening,' : 'Good Day,'}
        </Text>
        {settings?.name ? (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 32,
              color: colors.inkPrimary,
              textAlign: 'center',
              letterSpacing: 1.5,
              textShadowColor: colors.bg,
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 12,
            }}
          >
            {settings.name}
          </Text>
        ) : null}
      </Animated.View>

      {savedCount > 0 && (
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 13,
            color: colors.inkMuted,
            textAlign: 'center',
            marginBottom: 24,
            textShadowColor: colors.bg,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 10,
          }}
        >
          ✦  {savedCount} moment{savedCount === 1 ? '' : 's'} of grace  ✦
        </Text>
      )}

      {!todayEntry ? (
        <View ref={checkInButtonRef}>
        <Animated.View style={[buttonStyle, { zIndex: 1 }]}>
          <Pressable
            onPress={handleCheckIn}
            className="bg-accent px-10 py-4 rounded-full"
            style={({ pressed }) => ({
              shadowColor: '#C4956A',
              shadowOffset: { width: 0, height: pressed ? 2 : 6 },
              shadowOpacity: pressed ? 0.2 : 0.35,
              shadowRadius: pressed ? 8 : 14,
              elevation: pressed ? 3 : 8,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
            accessibilityRole="button"
            accessibilityLabel="Start a check-in"
            accessibilityHint="Opens the emotion picker"
          >
            <Text
              className="text-white text-base"
              style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 }}
            >
              Check In  →
            </Text>
          </Pressable>
        </Animated.View>
        </View>
      ) : (
        <Animated.View style={[buttonStyle, { zIndex: 1, width: '100%', maxWidth: 360 }]}>
          {/* Today's check-in complete card */}
          <View
            style={{
              borderRadius: 20,
              padding: 18,
              backgroundColor: isDark ? 'rgba(24,23,22,0.55)' : 'rgba(255,255,255,0.65)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(61,47,42,0.12)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: 'rgba(196,149,106,0.22)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="checkmark" size={18} color={colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.inkPrimary }}>
                  Today's check-in <Text style={{ fontFamily: 'Lora_400Regular_Italic' }}>complete</Text>
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
                  Thank you for showing up today.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleViewToday}
              className="active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="View today's entry"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginTop: 16,
                padding: 12,
                borderRadius: 14,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(61,47,42,0.05)',
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: emotionColor + '33',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={EMOTION_ICON[todayEntry.emotionId]} size={18} color={emotionColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: colors.inkMuted,
                    textTransform: 'uppercase',
                  }}
                >
                  Today I felt
                </Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.inkPrimary, marginTop: 1 }}>
                  {todayEntry.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </Pressable>

            {todayEntry.verseBody ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 14, lineHeight: 22, color: colors.inkPrimary }}>
                  “{todayEntry.verseBody}”
                </Text>
                {todayEntry.verseReference ? (
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.amber, marginTop: 8 }}>
                    {todayEntry.verseReference}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={handleCheckIn}
            className="active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Write another entry"
            style={{ backgroundColor: colors.amber, borderRadius: 28, paddingVertical: 15, alignItems: 'center', marginTop: 16 }}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#FFFFFF' }}>Write another entry  →</Text>
          </Pressable>

          <Pressable
            onPress={handleViewToday}
            className="active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="View today's entry"
            style={{ borderWidth: 1, borderColor: colors.amber, borderRadius: 28, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.amber }}>View today's entry  →</Text>
          </Pressable>
        </Animated.View>
      )}

      {streak >= 2 && (
        <View
          style={{ alignItems: 'center', marginTop: 20, zIndex: 1 }}
          accessibilityRole="text"
          accessibilityLabel={`${streak} days in a row`}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 16, color: '#C4956A' }}>✦</Text>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 28, color: '#C4956A' }}>{streak}</Text>
          </View>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: '#9A8880',
              marginTop: 2,
            }}
          >
            days in a row
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 6,
              justifyContent: 'center',
              marginTop: 8,
            }}
          >
            {recentDays.map((filled, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: filled ? '#C4956A' : 'transparent',
                  borderWidth: filled ? 0 : 1,
                  borderColor: 'rgba(196,149,106,0.4)',
                }}
              />
            ))}
          </View>
        </View>
      )}
      </ScrollView>

      {showTourTooltip && buttonAnchorY > 0 && (
        <PositionedTooltip
          text="This is where you return each day. Tap to name how you're feeling — a verse arrives sealed, chosen for this moment."
          buttonLabel="Create an account →"
          anchorY={buttonAnchorY}
          placement="above"
          onDismiss={() => {
            setShowTourTooltip(false)
            router.replace('/register')
          }}
        />
      )}

      {/* Path tab indicator — tappable, routes directly to history with tour param */}
      {showPathTip && (
        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/history', params: { tourStep: 'path' } })}
          accessibilityRole="button"
          accessibilityLabel="Go to The Path tab to see your saved verse"
          style={{
            position: 'absolute',
            bottom: 0,
            left: PATH_TAB_CENTER_X - 44,
            width: 88,
            height: 72,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 4,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 10,
              color: colors.amber,
              letterSpacing: 0.5,
              marginBottom: 5,
              textAlign: 'center',
            }}
          >
            your verse
          </Text>
          <Animated.View
            style={[
              {
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 2,
                borderColor: colors.amber,
              },
              pathPulseStyle,
            ]}
          />
          <Text style={{ fontSize: 9, color: colors.amber, marginTop: 3, opacity: 0.7 }}>▼</Text>
        </Pressable>
      )}
    </View>
  )
}
