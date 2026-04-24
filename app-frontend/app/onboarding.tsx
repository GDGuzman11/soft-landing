import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { getSettings, saveSettings } from '@/storage/storage'

const SLIDES = [
  {
    title: 'A place to land.',
    body: 'When the day gets heavy, Soft Landing gives you a moment to set it down — no pressure, no judgment.',
    cta: 'Next',
  },
  {
    title: 'Just how you feel.',
    body: 'Pick an emotion, open an envelope, and receive a short note written just for that moment.',
    cta: 'Get Started',
  },
]

export default function OnboardingScreen() {
  const [slide, setSlide] = useState(0)
  const opacity = useSharedValue(1)
  const translateX = useSharedValue(0)

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }))

  function advanceSlide() {
    opacity.value = withTiming(0, { duration: 220 }, () => {
      runOnJS(setSlide)(1)
      translateX.value = 20
      opacity.value = withTiming(1, { duration: 280 })
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 })
    })
  }

  async function finish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, onboardingComplete: true })
    } catch {
      // storage failure is non-fatal — navigate regardless
    }
    router.replace('/onboarding-profile')
  }

  function handleCta() {
    if (slide === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      advanceSlide()
    } else {
      finish()
    }
  }

  const current = SLIDES[slide]

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Animated.View style={[{ alignItems: 'center', width: '100%' }, animStyle]}>
        <Text
          className="text-text-primary text-3xl text-center mb-5"
          style={{ fontFamily: 'Lora_400Regular_Italic', lineHeight: 42 }}
        >
          {current.title}
        </Text>

        <Text
          className="text-text-secondary text-base text-center leading-7 mb-14"
          style={{ fontFamily: 'DMSans_400Regular', maxWidth: 300 }}
        >
          {current.body}
        </Text>
      </Animated.View>

      {/* Dot indicators */}
      <View className="flex-row gap-2 mb-10">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === slide ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === slide ? '#C4956A' : '#E8E3DC',
            }}
          />
        ))}
      </View>

      <Pressable
        onPress={handleCta}
        className="bg-accent px-12 py-4 rounded-full active:opacity-80"
        style={{
          shadowColor: '#C4956A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        }}
        accessibilityRole="button"
        accessibilityLabel={current.cta}
      >
        <Text
          className="text-white text-base"
          style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 }}
        >
          {current.cta}
        </Text>
      </Pressable>
    </View>
  )
}
