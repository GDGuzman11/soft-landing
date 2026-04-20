import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { getSettings, saveSettings } from '@/storage/storage'

export default function FaithIntroScreen() {
  const crossOpacity = useSharedValue(0)
  const crossScale = useSharedValue(0.85)
  const textOpacity = useSharedValue(0)
  const buttonOpacity = useSharedValue(0)

  useEffect(() => {
    crossOpacity.value = withTiming(1, { duration: 700 })
    crossScale.value = withSpring(1, { damping: 18, stiffness: 100 })
    textOpacity.value = withDelay(500, withTiming(1, { duration: 600 }))
    buttonOpacity.value = withDelay(900, withTiming(1, { duration: 500 }))
  }, [])

  const crossStyle = useAnimatedStyle(() => ({
    opacity: crossOpacity.value,
    transform: [{ scale: crossScale.value }],
  }))

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }))

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }))

  async function handleBegin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, faithIntroComplete: true })
    } catch {
      // non-fatal — navigate regardless
    }
    router.replace('/(tabs)')
  }

  return (
    <View
      className="flex-1 bg-background items-center justify-center px-8"
      accessibilityLabel="Faith intro screen"
    >
      {/* Cross icon */}
      <Animated.View style={[{ alignItems: 'center', marginBottom: 44 }, crossStyle]}>
        <View style={{ width: 64, height: 84, position: 'relative', alignItems: 'center' }}>
          {/* Vertical bar */}
          <View style={{
            position: 'absolute',
            width: 6,
            height: 84,
            backgroundColor: '#C4956A',
            borderRadius: 3,
            top: 0,
            alignSelf: 'center',
          }} />
          {/* Horizontal bar */}
          <View style={{
            position: 'absolute',
            width: 44,
            height: 6,
            backgroundColor: '#C4956A',
            borderRadius: 3,
            top: 22,
            alignSelf: 'center',
          }} />
        </View>
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center', width: '100%' }, textStyle]}>
        <Text
          className="text-text-primary text-3xl text-center mb-5"
          style={{ fontFamily: 'Lora_400Regular_Italic', lineHeight: 44 }}
        >
          Find rest in His Word.
        </Text>

        <Text
          className="text-text-secondary text-base text-center leading-7 mb-14"
          style={{ fontFamily: 'DMSans_400Regular', maxWidth: 280 }}
        >
          Every verse in this app was chosen for a moment just like yours.
        </Text>
      </Animated.View>

      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={handleBegin}
          className="bg-accent px-12 py-4 rounded-full active:opacity-80"
          style={{
            shadowColor: '#C4956A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel="Begin"
        >
          <Text
            className="text-white text-base"
            style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 }}
          >
            Begin
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}
