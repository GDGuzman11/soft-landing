import { View, Text, Pressable, Dimensions } from 'react-native'
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

const { width } = Dimensions.get('window')
const CARD_WIDTH = width * 0.85
const CARD_HEIGHT = 370
const FOLD_Y = 150

// ── Candle wax seal ──────────────────────────────────────────────────────────
const BLOBS = [
  { angle: 0,   size: 17 },
  { angle: 45,  size: 14 },
  { angle: 90,  size: 17 },
  { angle: 135, size: 14 },
  { angle: 180, size: 17 },
  { angle: 225, size: 14 },
  { angle: 270, size: 17 },
  { angle: 315, size: 14 },
]
const SEAL_CENTER = 50
const BLOB_RADIUS = 37

function WaxSeal({ loading }: { loading: boolean }) {
  return (
    <View style={{ width: 100, height: 100, position: 'relative' }}>
      {/* Drip blobs — irregular wax edge */}
      {BLOBS.map(({ angle, size }, i) => {
        const rad = (angle * Math.PI) / 180
        const x = SEAL_CENTER + Math.cos(rad) * BLOB_RADIUS - size / 2
        const y = SEAL_CENTER + Math.sin(rad) * BLOB_RADIUS - size / 2
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: '#8B3010',
              left: x,
              top: y,
            }}
          />
        )
      })}

      {/* Outer translucent halo */}
      <View style={{
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#8B3010',
        opacity: 0.12,
        left: 0,
        top: 0,
      }} />

      {/* Main wax body */}
      <View style={{
        position: 'absolute',
        width: 74,
        height: 76,
        borderRadius: 39,
        backgroundColor: '#A03515',
        left: 13,
        top: 12,
        shadowColor: '#3D0A00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 7,
        elevation: 8,
      }} />

      {/* Candle-light highlight — top-left glow */}
      <View style={{
        position: 'absolute',
        width: 30,
        height: 18,
        borderRadius: 15,
        backgroundColor: '#D4622A',
        opacity: 0.42,
        left: 18,
        top: 16,
        transform: [{ rotate: '-22deg' }],
      }} />

      {/* Cross — vertical */}
      <View style={{
        position: 'absolute',
        width: 3,
        height: 28,
        backgroundColor: '#FAF0E6',
        borderRadius: 1.5,
        left: SEAL_CENTER - 1.5,
        top: SEAL_CENTER - 14,
        opacity: 0.9,
      }} />

      {/* Cross — horizontal bar at ~35% from top */}
      <View style={{
        position: 'absolute',
        width: 20,
        height: 3,
        backgroundColor: '#FAF0E6',
        borderRadius: 1.5,
        left: SEAL_CENTER - 10,
        top: SEAL_CENTER - 10,
        opacity: 0.9,
      }} />

      {/* Subtle outer ring edge */}
      <View style={{
        position: 'absolute',
        width: 78,
        height: 78,
        borderRadius: 39,
        borderWidth: 1,
        borderColor: '#6B2408',
        left: 11,
        top: 11,
        opacity: 0.35,
      }} />

      {loading && (
        <View style={{
          position: 'absolute',
          bottom: -28,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <View style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#C4956A',
            opacity: 0.6,
          }} />
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EnvelopeScreen() {
  const { emotionId } = useLocalSearchParams<{ emotionId: string }>()
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)

  const cardY = useSharedValue(420)
  const cardScale = useSharedValue(1)
  const bobY = useSharedValue(0)
  const hintOpacity = useSharedValue(0)
  const sealScale = useSharedValue(1)
  const screenOpacity = useSharedValue(1)

  useEffect(() => {
    performCheckIn(emotionId as EmotionId)
      .then((r) => {
        setResult(r)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    cardY.value = withSpring(0, { damping: 18, stiffness: 100 })

    bobY.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2800 }),
          withTiming(0, { duration: 2800 })
        ),
        -1,
        true
      )
    )

    hintOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }))
  }, [])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: cardY.value + bobY.value },
      { scale: cardScale.value },
    ],
  }))

  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sealScale.value }],
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
        emotionId: emotionId,
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

    hintOpacity.value = withTiming(0, { duration: 150 })
    bobY.value = withTiming(0, { duration: 150 })

    // Seal pulse
    sealScale.value = withSequence(
      withTiming(1.15, { duration: 120 }),
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 80 })
    )

    // Card lifts then fades
    cardScale.value = withDelay(200, withTiming(1.04, { duration: 200 }))
    screenOpacity.value = withDelay(350, withTiming(0, { duration: 320 }, () => {
      runOnJS(navigateToMessage)()
    }))
  }

  if (!loading && !result) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#A09080', textAlign: 'center', marginBottom: 24 }}>
          Something went wrong. Please try again.
        </Text>
        <Pressable onPress={() => router.replace('/(tabs)')} className="active:opacity-60">
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#C4956A' }}>Go home</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Pressable onPress={handleOpen} disabled={loading || opening}>
        <Animated.View style={cardStyle}>
          <View style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: '#8B7355',
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.22,
            shadowRadius: 32,
            elevation: 14,
            borderWidth: 1,
            borderColor: '#E2D9CC',
          }}>
            {/* ── Flap area (top) ── */}
            <View style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: FOLD_Y,
              backgroundColor: '#EDE6D9',
            }} />

            {/* ── Body area (bottom) ── */}
            <View style={{
              position: 'absolute',
              top: FOLD_Y, left: 0, right: 0,
              bottom: 0,
              backgroundColor: '#F5F0E8',
            }} />

            {/* ── Fold line ── */}
            <View style={{
              position: 'absolute',
              top: FOLD_Y,
              left: 0, right: 0,
              height: 1,
              backgroundColor: '#D8CFBF',
            }} />

            {/* ── Left diagonal fold crease on flap ── */}
            <View style={{
              position: 'absolute',
              width: 1,
              height: FOLD_Y * 1.35,
              backgroundColor: '#D8CFBF',
              opacity: 0.7,
              top: 0,
              left: 0,
              transform: [{ rotate: '33deg' }],
            }} />

            {/* ── Right diagonal fold crease on flap ── */}
            <View style={{
              position: 'absolute',
              width: 1,
              height: FOLD_Y * 1.35,
              backgroundColor: '#D8CFBF',
              opacity: 0.7,
              top: 0,
              right: 0,
              transform: [{ rotate: '-33deg' }],
            }} />

            {/* ── Wax seal — centered over fold line ── */}
            <Animated.View style={[{
              position: 'absolute',
              top: FOLD_Y - 50,
              left: CARD_WIDTH / 2 - 50,
              zIndex: 10,
            }, sealStyle]}>
              <WaxSeal loading={loading} />
            </Animated.View>

            {/* ── Hint text ── */}
            <Animated.View style={[{
              position: 'absolute',
              bottom: 38,
              left: 0,
              right: 0,
              alignItems: 'center',
            }, hintStyle]}>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: '#A09080',
                  letterSpacing: 0.3,
                }}
              >
                {loading ? 'Preparing your verse…' : 'Tap to open'}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>

      {/* Screen fade overlay */}
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
