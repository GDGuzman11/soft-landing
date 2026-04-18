import { View, Text, Pressable } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated'

export default function EnvelopeScreen() {
  const { emotionId } = useLocalSearchParams<{ emotionId: string }>()

  const translateY = useSharedValue(400)
  const bobY = useSharedValue(0)
  const hintOpacity = useSharedValue(0)

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 })

    bobY.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 3000 }),
          withTiming(0, { duration: 3000 })
        ),
        -1,
        true
      )
    )

    hintOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }))
  }, [])

  const envelopeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + bobY.value }],
  }))

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }))

  function handleOpen() {
    router.push({ pathname: '/check-in/message', params: { emotionId } })
  }

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Pressable onPress={handleOpen} className="items-center">
        <Animated.View style={envelopeStyle}>
          <View
            className="items-center justify-center rounded-2xl"
            style={{
              width: 220,
              height: 160,
              backgroundColor: '#F5F0E8',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <View
              className="absolute top-0 left-0 right-0"
              style={{
                height: 80,
                borderBottomWidth: 1,
                borderBottomColor: '#E8E0D0',
              }}
            />
            <Text style={{ fontSize: 48 }}>✉</Text>
          </View>
        </Animated.View>

        <Animated.View style={[{ marginTop: 24 }, hintStyle]}>
          <Text
            className="text-text-secondary text-sm"
            style={{ fontFamily: 'DMSans_400Regular' }}
          >
            Tap to open
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  )
}
