import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import { performCheckIn } from '@/services/checkIn'
import type { CheckInResult } from '@/services/checkIn'
import type { EmotionId } from '@/types'

export default function EnvelopeScreen() {
  const { emotionId } = useLocalSearchParams<{ emotionId: string }>()
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [loading, setLoading] = useState(true)

  const translateY = useSharedValue(400)
  const bobY = useSharedValue(0)
  const hintOpacity = useSharedValue(0)

  useEffect(() => {
    performCheckIn(emotionId as EmotionId)
      .then((r) => {
        setResult(r)
        setLoading(false)
      })
      .catch(() => setLoading(false))

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
    if (!result) return
    router.push({
      pathname: '/check-in/message',
      params: {
        messageBody: result.message.body,
        checkInId: result.event.id,
        messageId: result.message.id,
      },
    })
  }

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Pressable onPress={handleOpen} disabled={loading} className="items-center">
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
            {loading ? (
              <ActivityIndicator color="#C4956A" />
            ) : (
              <Text style={{ fontSize: 48 }}>✉</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[{ marginTop: 24 }, hintStyle]}>
          <Text
            className="text-text-secondary text-sm"
            style={{ fontFamily: 'DMSans_400Regular' }}
          >
            {loading ? 'Preparing your note…' : 'Tap to open'}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  )
}
