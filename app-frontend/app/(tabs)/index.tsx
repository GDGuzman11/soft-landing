import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '@/storage/storage'
import type { AppSettings } from '@/types'
import { getCurrentUser } from '@/services/auth'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

// Module-level flag: only redirect once per app session.
// Prevents loops when AsyncStorage is unavailable.
let navigationChecked = false

function getGreetingBase(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getGreeting(name?: string): string {
  const base = getGreetingBase()
  if (name) return `${base}, ${name}.`
  return `${base}.`
}

export default function HomeScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const greetingOpacity = useSharedValue(0)
  const greetingY = useSharedValue(12)
  const buttonOpacity = useSharedValue(0)
  const buttonY = useSharedValue(16)

  useEffect(() => {
    if (!navigationChecked) {
      navigationChecked = true
      getSettings()
        .then((s) => {
          setSettings(s)
          const user = getCurrentUser()
          const isGuest = (s as any).isGuest

          if (!user && !isGuest) {
            router.replace('/welcome')
          } else if (!s.onboardingComplete) {
            router.replace('/onboarding')
          } else if (!s.name && user?.displayName) {
            saveSettings({ ...s, name: user.displayName })
              .then(() => setSettings({ ...s, name: user.displayName! }))
          } else if (!s.faithIntroComplete) {
            router.replace('/faith-intro')
          }
        })
        .catch(() => {})
    }

    greetingOpacity.value = withTiming(1, { duration: 600 })
    greetingY.value = withTiming(0, { duration: 600 })
    buttonOpacity.value = withDelay(300, withTiming(1, { duration: 500 }))
    buttonY.value = withDelay(300, withSpring(0, { damping: 20, stiffness: 160 }))
  }, [])

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingY.value }],
  }))

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonY.value }],
  }))

  function handleCheckIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/check-in/emotions')
  }

  return (
    <View
      className="flex-1 bg-background items-center justify-center px-8"
      accessibilityLabel="Home screen"
    >
      <Animated.Text
        className="text-text-primary text-3xl mb-16"
        style={[{ fontFamily: 'DMSans_400Regular', letterSpacing: -0.5 }, greetingStyle]}
        accessibilityRole="header"
      >
        {getGreeting(settings?.name || undefined)}
      </Animated.Text>

      <Animated.View style={buttonStyle}>
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
            Check In
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}
