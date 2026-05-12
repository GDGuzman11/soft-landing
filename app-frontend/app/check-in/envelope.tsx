import { View, Text, Pressable, Dimensions } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { performCheckIn } from '@/services/checkIn'
import type { CheckInResult } from '@/services/checkIn'
import type { EmotionId } from '@/types'
import { useTheme } from '@/theme'

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

function WaxSeal({ loading, isDark }: { loading: boolean; isDark: boolean }) {
  const wax = isDark
    ? {
        blob: '#C4622A',
        haloOpacity: 0.18,
        body: '#C94E22',
        highlight: '#E87040',
        highlightOpacity: 0.55,
        ring: '#A03515',
        ringOpacity: 0.5,
        glowColor: '#E06030',
        glowOpacity: 0.55,
        glowRadius: 18,
      }
    : {
        blob: '#8B3010',
        haloOpacity: 0.12,
        body: '#A03515',
        highlight: '#D4622A',
        highlightOpacity: 0.42,
        ring: '#6B2408',
        ringOpacity: 0.35,
        glowColor: '#3D0A00',
        glowOpacity: 0.55,
        glowRadius: 7,
      }

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
              backgroundColor: wax.blob,
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
        backgroundColor: wax.blob,
        opacity: wax.haloOpacity,
        left: 0,
        top: 0,
      }} />

      {/* Main wax body */}
      <View style={{
        position: 'absolute',
        width: 74,
        height: 76,
        borderRadius: 39,
        backgroundColor: wax.body,
        left: 13,
        top: 12,
        shadowColor: wax.glowColor,
        shadowOffset: { width: 0, height: isDark ? 2 : 4 },
        shadowOpacity: wax.glowOpacity,
        shadowRadius: wax.glowRadius,
        elevation: 8,
      }} />

      {/* Candle-light highlight — top-left glow */}
      <View style={{
        position: 'absolute',
        width: 30,
        height: 18,
        borderRadius: 15,
        backgroundColor: wax.highlight,
        opacity: wax.highlightOpacity,
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
        borderColor: wax.ring,
        left: 11,
        top: 11,
        opacity: wax.ringOpacity,
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
  const { colors, isDark } = useTheme()
  const { emotionId } = useLocalSearchParams<{ emotionId: string }>()
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)

  const cardY = useSharedValue(420)
  const cardScale = useSharedValue(1)
  const bobY = useSharedValue(0)
  const hintOpacity = useSharedValue(0)
  const sealScale = useSharedValue(1)
  const sealHeartbeat = useSharedValue(1)
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

  }, [])

  useFocusEffect(
    useCallback(() => {
      screenOpacity.value = 1
      cardScale.value = 1
      sealScale.value = 1
      hintOpacity.value = 0
      setOpening(false)
      hintOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }))

      // Heartbeat: lub-dub × 1, then rest ~1.8s, repeat
      cancelAnimation(sealHeartbeat)
      sealHeartbeat.value = 1
      sealHeartbeat.value = withDelay(
        800,
        withRepeat(
          withSequence(
            withTiming(1.09, { duration: 130 }),  // lub up
            withTiming(1.0,  { duration: 110 }),  // lub down
            withTiming(1.06, { duration: 110 }),  // dub up
            withTiming(1.0,  { duration: 100 }),  // dub down
            withTiming(1.0,  { duration: 1800 }), // rest
          ),
          -1,
          false,
        )
      )
    }, [])
  )

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: cardY.value + bobY.value },
      { scale: cardScale.value },
    ],
  }))

  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sealScale.value * sealHeartbeat.value }],
  }))

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }))

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - screenOpacity.value,
  }))

  function navigateToMessage() {
    if (!result) return
    const msg = result.message
    const useModern = !!msg.modernText && Math.random() < 0.5
    router.push({
      pathname: '/check-in/message',
      params: {
        emotionId: emotionId,
        messageBody: useModern ? msg.modernText! : msg.body,
        messageReference: msg.reference ?? '',
        checkInId: result.event.id,
        messageId: msg.id,
      },
    })
  }

  function handleOpen() {
    if (!result || opening) return
    setOpening(true)

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    cancelAnimation(sealHeartbeat)
    hintOpacity.value = withTiming(0, { duration: 150 })
    bobY.value = withTiming(0, { duration: 150 })

    // Seal pulse
    sealScale.value = withSequence(
      withTiming(1.15, { duration: 120 }),
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 80 })
    )

    // Card lifts then fades — 400ms breath pause after the seal pulse
    cardScale.value = withDelay(600, withTiming(1.04, { duration: 200 }))
    screenOpacity.value = withDelay(750, withTiming(0, { duration: 320 }, () => {
      runOnJS(navigateToMessage)()
    }))
  }

  if (!loading && !result) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.inkMuted, textAlign: 'center', marginBottom: 24 }}>
          Something went wrong. Please try again.
        </Text>
        <Pressable onPress={() => router.replace('/(tabs)')} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.amber }}>Go home</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center' }}>
        {/* Hint — above the envelope */}
        <Animated.View style={[{ marginBottom: 20 }, hintStyle]}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkPrimary, letterSpacing: 0.3 }}>
            {loading ? 'Preparing your verse…' : "no rush. it's yours."}
          </Text>
        </Animated.View>

      <Pressable onPress={handleOpen} disabled={loading || opening}>
        <Animated.View style={cardStyle}>
          <View style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: isDark ? '#C4956A' : '#8B7355',
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: isDark ? 0.28 : 0.22,
            shadowRadius: isDark ? 32 : 32,
            elevation: 14,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(196,149,106,0.30)' : 'rgba(122,80,48,0.28)',
          }}>

            {/* ── Body area (bottom) — rendered first so flap sits on top ── */}
            <View style={{
              position: 'absolute',
              top: FOLD_Y, left: 0, right: 0,
              bottom: 0,
              backgroundColor: isDark ? '#3D2718' : colors.inputRow,
            }} />

            {/* ── Letter lines — faint horizontal rules suggesting a folded letter ── */}
            {[0.28, 0.50, 0.72].map((pct) => (
              <View key={pct} style={{
                position: 'absolute',
                top: FOLD_Y + (CARD_HEIGHT - FOLD_Y) * pct,
                left: 32,
                right: 32,
                height: 1,
                backgroundColor: isDark ? 'rgba(196,149,106,0.18)' : colors.hairline,
                opacity: isDark ? 1 : 0.45,
              }} />
            ))}

            {/* ── Triangular flap — downward-pointing triangle ── */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderLeftWidth: CARD_WIDTH / 2,
              borderRightWidth: CARD_WIDTH / 2,
              borderTopWidth: FOLD_Y,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: isDark ? '#2A1A0C' : colors.headerBg,
            }} />

            {/* ── Fold glint — subtle highlight just above fold for embossed depth ── */}
            <View style={{
              position: 'absolute',
              top: FOLD_Y - 1,
              left: 24,
              right: 24,
              height: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)',
            }} />

            {/* ── Fold hairline ── */}
            <View style={{
              position: 'absolute',
              top: FOLD_Y,
              left: 0, right: 0,
              height: 1,
              backgroundColor: colors.hairline,
            }} />

            {/* ── Wax seal — centered over fold line ── */}
            <Animated.View style={[{
              position: 'absolute',
              top: FOLD_Y - 50,
              left: CARD_WIDTH / 2 - 50,
              zIndex: 10,
            }, sealStyle]}>
              <WaxSeal loading={loading} isDark={isDark} />
            </Animated.View>

          </View>
        </Animated.View>
      </Pressable>
      </View>

      {/* Screen fade overlay */}
      <Animated.View
        pointerEvents="none"
        style={[{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.bg,
        }, overlayStyle]}
      />

    </View>
  )
}
