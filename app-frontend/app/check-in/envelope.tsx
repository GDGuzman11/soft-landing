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
        messageReference: result.message.reference ?? '',
        checkInId: result.event.id,
        messageId: result.message.id,
      },
    })
  }

  function handleOpen() {
    if (!result || opening) return
    setOpening(true)

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

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
          {/* Outer container: 260w × 190h */}
          <View style={{ width: 260, height: 190, position: 'relative' }}>

            {/* ── Envelope body ────────────────────────────── */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 150,
                backgroundColor: '#F5F0E8',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E2D9CC',
                shadowColor: '#8B7355',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.18,
                shadowRadius: 24,
                elevation: 10,
              }}
            >
              {/* Left diagonal fold */}
              <View style={{
                position: 'absolute',
                width: 1,
                height: 152,
                backgroundColor: '#DDD4C4',
                top: 0,
                left: 0,
                transformOrigin: 'top left',
                transform: [{ rotate: '30deg' }],
              }} />

              {/* Right diagonal fold */}
              <View style={{
                position: 'absolute',
                width: 1,
                height: 152,
                backgroundColor: '#DDD4C4',
                top: 0,
                right: 0,
                transformOrigin: 'top right',
                transform: [{ rotate: '-30deg' }],
              }} />

              {/* Bottom horizontal fold line */}
              <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 75,
                borderTopWidth: 1,
                borderTopColor: '#E2D9CC',
              }} />

              {/* Wax seal */}
              <View style={{
                position: 'absolute',
                bottom: 18,
                alignSelf: 'center',
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#C4956A',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#8B6240',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}>
                {/* Small cross inside seal */}
                <View style={{ position: 'absolute', width: 2, height: 14, backgroundColor: '#FAF8F5', borderRadius: 1 }} />
                <View style={{ position: 'absolute', width: 10, height: 2, backgroundColor: '#FAF8F5', borderRadius: 1, top: 8 }} />
              </View>

              {/* Letter peeking out */}
              {!loading && (
                <Animated.View style={[{
                  position: 'absolute',
                  top: -22,
                  left: 18,
                  right: 18,
                  height: 64,
                  backgroundColor: '#FFFDF9',
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: '#EDE8DF',
                }, letterStyle]}>
                  {/* Faint ruled lines on the letter */}
                  <View style={{ position: 'absolute', top: 14, left: 10, right: 10, height: 1, backgroundColor: '#F0EBE2' }} />
                  <View style={{ position: 'absolute', top: 26, left: 10, right: 10, height: 1, backgroundColor: '#F0EBE2' }} />
                  <View style={{ position: 'absolute', top: 38, left: 10, right: 10, height: 1, backgroundColor: '#F0EBE2' }} />
                </Animated.View>
              )}
            </View>

            {/* ── Flap ─────────────────────────────────────── */}
            <Animated.View
              style={[{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 90,
                transformOrigin: 'top',
              }, flapStyle]}
            >
              {/* Flap triangle */}
              <View style={{
                width: 0,
                height: 0,
                borderLeftWidth: 130,
                borderRightWidth: 130,
                borderTopWidth: 80,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: '#EDE6D9',
              }} />
              {/* Flap fold crease */}
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: '#E2D9CC',
              }} />
            </Animated.View>

            {/* Spinner while loading */}
            {loading && (
              <View style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0, top: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ActivityIndicator color="#C4956A" />
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[{ marginTop: 36 }, hintStyle]}>
          <Text
            className="text-text-secondary text-sm"
            style={{ fontFamily: 'DMSans_400Regular' }}
          >
            {loading ? 'Preparing your verse…' : 'Tap to open'}
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
