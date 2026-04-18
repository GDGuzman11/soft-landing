import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { getSettings } from '@/storage/storage'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

// Module-level flag: only redirect to onboarding once per app session.
// Prevents a loop when AsyncStorage is unavailable and always returns
// the default onboardingComplete: false.
let onboardingChecked = false

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 17) return 'Good afternoon.'
  return 'Good evening.'
}

export default function HomeScreen() {
  const greetingOpacity = useSharedValue(0)
  const greetingY = useSharedValue(12)
  const buttonOpacity = useSharedValue(0)
  const buttonY = useSharedValue(16)

  useEffect(() => {
    if (!onboardingChecked) {
      onboardingChecked = true
      getSettings()
        .then((s) => { if (!s.onboardingComplete) router.replace('/onboarding') })
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
        {getGreeting()}
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
