import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { performCheckIn } from '@/services/checkIn'
import type { CheckInResult } from '@/services/checkIn'
import type { EmotionId } from '@/types'

export default function EnvelopeScreen() {
  const { emotionId } = useLocalSearchParams<{ emotionId: string }>()
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)

  const slideY = useSharedValue(500)
  const bobY = useSharedValue(0)
  const hintOpacity = useSharedValue(0)
  const flapRotate = useSharedValue(0)
  const letterY = useSharedValue(0)
  const screenOpacity = useSharedValue(1)

  useEffect(() => {
    performCheckIn(emotionId as EmotionId)
      .then((r) => {
        setResult(r)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    slideY.value = withSpring(0, { damping: 16, stiffness: 110 })

    bobY.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 3000 }),
          withTiming(0, { duration: 3000 })
        ),
        -1,
        true
      )
    )

    hintOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }))
  }, [])

  const envelopeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value + bobY.value }],
  }))

  const flapStyle = useAnimatedStyle(() => ({
    transform: [{ rotateX: `${flapRotate.value}deg` }],
  }))

  const letterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: letterY.value }],
  }))

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }))

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - screenOpacity.value,
  }))

  function navigateToMessage() {
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

  function handleOpen() {
    if (!result || opening) return
    setOpening(true)

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Stop bob, open flap, slide letter out, fade to next screen
    bobY.value = withTiming(0, { duration: 200 })
    hintOpacity.value = withTiming(0, { duration: 200 })

    flapRotate.value = withTiming(-180, { duration: 400 })
    letterY.value = withDelay(300, withTiming(-90, { duration: 500 }))
    screenOpacity.value = withDelay(700, withTiming(0, { duration: 300 }, () => {
      runOnJS(navigateToMessage)()
    }))
  }

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Pressable onPress={handleOpen} disabled={loading || opening} className="items-center">
        <Animated.View style={envelopeStyle}>
          <View style={{ width: 240, height: 175, position: 'relative' }}>
            {/* Envelope body */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 140,
                backgroundColor: '#F5F0E8',
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 20,
                elevation: 8,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* V fold lines */}
              <View style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: 70,
                borderTopWidth: 1,
                borderTopColor: '#E8E0D0',
              }} />

              {/* Letter peeking out */}
              {!loading && (
                <Animated.View style={[{
                  position: 'absolute',
                  top: -20,
                  left: 16,
                  right: 16,
                  height: 60,
                  backgroundColor: '#FFFDF9',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#EDE8DF',
                }, letterStyle]} />
              )}
            </View>

            {/* Flap */}
            <Animated.View
              style={[{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 80,
                transformOrigin: 'top',
              }, flapStyle]}
            >
              <View style={{
                width: 0,
                height: 0,
                borderLeftWidth: 120,
                borderRightWidth: 120,
                borderTopWidth: 70,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: '#EDE6D9',
              }} />
            </Animated.View>

            {/* Spinner while loading */}
            {loading && (
              <View style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0, top: 35,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ActivityIndicator color="#C4956A" />
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[{ marginTop: 32 }, hintStyle]}>
          <Text
            className="text-text-secondary text-sm"
            style={{ fontFamily: 'DMSans_400Regular' }}
          >
            {loading ? 'Preparing your note…' : 'Tap to open'}
          </Text>
        </Animated.View>
      </Pressable>

      {/* Fade-out overlay for screen transition */}
      <Animated.View
        pointerEvents="none"
        style={[{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#FAF8F5',
        }, overlayStyle]}
      />
    </View>
  )
}
