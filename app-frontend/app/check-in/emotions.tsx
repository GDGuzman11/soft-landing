import { View, Text, Dimensions, ImageBackground, Image, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { EMOTIONS } from '@/constants/emotions'
import { canCheckIn } from '@/services/checkIn'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useEffect } from 'react'
import { useState } from 'react'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
const CARD_W          = screenWidth * 0.82
const CARD_H          = screenHeight * 0.56
const SWIPE_THRESHOLD = 70

const EMOTION_ORDER    = ['good', 'neutral', 'tired', 'sad', 'stressed']
const ORDERED_EMOTIONS = EMOTION_ORDER
  .map((id) => EMOTIONS.find((e) => e.id === id)!)
  .filter(Boolean)

const EMOTION_IMAGES: Record<string, number> = {
  stressed: require('../../assets/images/nanostressed.jpg'),
  tired:    require('../../assets/images/nanotired.jpg'),
  sad:      require('../../assets/images/nanosad.jpg'),
  neutral:  require('../../assets/images/nanoneutral.jpg'),
  good:     require('../../assets/images/nanohappy.jpg'),
}

const TAGLINES: Record<string, string> = {
  stressed: 'Carrying too much right now',
  tired:    'Running low on everything',
  sad:      'Heart feeling heavy',
  neutral:  'Just getting through it',
  good:     'Feeling grateful today',
}

function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 22 : 8)
  useEffect(() => {
    w.value = withSpring(active ? 22 : 8, { stiffness: 120, damping: 14 })
  }, [active, w])
  const style = useAnimatedStyle(() => ({ width: w.value }))
  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4, backgroundColor: active ? '#C4956A' : '#D4CABE', marginHorizontal: 3, opacity: active ? 1 : 0.5 },
        style,
      ]}
    />
  )
}

export default function EmotionsScreen() {
  const [activeIndex, setActiveIndex] = useState(0)
  const total = ORDERED_EMOTIONS.length

  // Card pan
  const panX = useSharedValue(0)

  // Image reveal — starts at 1 so first card shows immediately
  const imageRevealOpacity = useSharedValue(1)

  // Placeholder pulse — breathes while image is decoding
  const placeholderPulse = useSharedValue(1)

  // Pulsing glow (shadow)
  const pulseGlow = useSharedValue(0)

  // Shimmering jewel
  const shimmer = useSharedValue(0.5)

  // Restart looping animations whenever the active card changes
  useEffect(() => {
    cancelAnimation(pulseGlow)
    cancelAnimation(shimmer)

    pulseGlow.value = 0
    shimmer.value   = 0.5

    pulseGlow.value = withRepeat(
      withSequence(
        withTiming(0.72, { duration: 1300 }),
        withTiming(0.12, { duration: 1300 }),
      ),
      -1,
      false,
    )
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1,    { duration: 900 }),
        withTiming(0.3,  { duration: 900 }),
      ),
      -1,
      false,
    )
  }, [activeIndex, pulseGlow, shimmer])

  function handleImageLoad() {
    cancelAnimation(placeholderPulse)
    placeholderPulse.value = 1
    imageRevealOpacity.value = withTiming(1, { duration: 350 })
  }

  function advance(dir: 'left' | 'right') {
    setActiveIndex((i) =>
      dir === 'left' ? (i + 1) % total : (i - 1 + total) % total,
    )
    panX.value = 0

    // Hide image and label immediately, start placeholder pulse
    imageRevealOpacity.value = 0
    cancelAnimation(placeholderPulse)
    placeholderPulse.value = 0.5
    placeholderPulse.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 700 }),
        withTiming(0.4, { duration: 700 }),
      ),
      -1,
      false,
    )
  }

  async function handleSelect() {
    const emotion = ORDERED_EMOTIONS[activeIndex]
    if (!emotion) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const allowed = await canCheckIn()
    if (!allowed) {
      router.push('/paywall')
      return
    }
    router.push({ pathname: '/check-in/envelope', params: { emotionId: emotion.id } })
  }

  function triggerSwipeHaptic() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { panX.value = e.translationX })
    .onEnd((e) => {
      const goLeft  = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -500
      const goRight = e.translationX >  SWIPE_THRESHOLD || e.velocityX >  500

      if (goLeft) {
        runOnJS(triggerSwipeHaptic)()
        panX.value = withTiming(-screenWidth * 1.4, { duration: 240 }, (done) => {
          if (done) runOnJS(advance)('left')
        })
      } else if (goRight) {
        runOnJS(triggerSwipeHaptic)()
        panX.value = withTiming(screenWidth * 1.4, { duration: 240 }, (done) => {
          if (done) runOnJS(advance)('right')
        })
      } else {
        panX.value = withSpring(0, { stiffness: 200, damping: 24 })
      }
    })

  const tapGesture = Gesture.Tap().onEnd(() => { runOnJS(handleSelect)() })

  const cardStyle = useAnimatedStyle(() => ({
    transform:     [{ translateX: panX.value }],
    shadowOpacity: pulseGlow.value,
  }))

  const imageRevealStyle = useAnimatedStyle(() => ({ opacity: imageRevealOpacity.value }))

  const labelStyle = useAnimatedStyle(() => ({ opacity: imageRevealOpacity.value }))

  const placeholderStyle = useAnimatedStyle(() => ({ opacity: placeholderPulse.value }))

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity:   shimmer.value,
    transform: [{ scale: 0.82 + shimmer.value * 0.22 }],
  }))

  const emotion = ORDERED_EMOTIONS[activeIndex]

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }} accessibilityLabel="Emotion picker">
      {/* Pre-render all images at full card size off-screen so the GPU decodes
          them at display resolution before the user reaches them. */}
      <View style={{ position: 'absolute', left: -9999, top: 0 }} pointerEvents="none">
        {Object.values(EMOTION_IMAGES).map((src, i) => (
          <Image key={i} source={src} style={{ width: CARD_W, height: CARD_H }} resizeMode="cover" />
        ))}
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16, alignItems: 'center' }}>
        <Text
          style={{ fontFamily: 'DMSans_500Medium', fontSize: 22, color: '#1A1A1A', textAlign: 'center', marginBottom: 6 }}
          accessibilityRole="header"
        >
          How are you right now?
        </Text>
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 14, color: '#A09080', textAlign: 'center' }}>
          Take a moment. Be honest.
        </Text>
      </View>

      {/* Emotion label + shimmer jewel — hidden until image loads */}
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 36 }, labelStyle]}>
        <Animated.Text
          style={[
            {
              fontFamily: 'DMSans_500Medium',
              fontSize: 18,
              color: emotion?.color ?? '#C4956A',
              marginRight: 8,
              textShadowColor: emotion?.color ?? '#C4956A',
              textShadowRadius: 8,
              textShadowOffset: { width: 0, height: 0 },
            },
            shimmerStyle,
          ]}
        >
          {'✦'}
        </Animated.Text>
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 26, color: '#3D2F2A' }}>
          {emotion?.label ?? ''}
        </Text>
      </Animated.View>

      {/* Single card */}
      <View style={{ alignItems: 'center' }}>
        <GestureDetector gesture={Gesture.Exclusive(panGesture, tapGesture)}>
          <Animated.View
            style={[
              {
                width: CARD_W,
                height: CARD_H,
                borderRadius: 26,
                shadowColor: emotion?.color ?? '#C4956A',
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 28,
                elevation: 16,
              },
              cardStyle,
            ]}
          >
            <View style={{ flex: 1, borderRadius: 26, borderWidth: 3, borderColor: '#7A5030', overflow: 'hidden' }}>

              {/* Placeholder — warm parchment base with pulsing ✦, visible while image decodes */}
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#EDE6D9' }]}>
                <Animated.View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }, placeholderStyle]}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 32, color: emotion?.color ?? '#C4956A' }}>
                    {'✦'}
                  </Text>
                </Animated.View>
              </View>

              {/* Image — fades in once onLoad fires */}
              <Animated.View style={[{ flex: 1 }, imageRevealStyle]}>
                <ImageBackground
                  key={emotion?.id}
                  source={EMOTION_IMAGES[emotion?.id ?? 'good']}
                  style={{ flex: 1 }}
                  resizeMode="cover"
                  onLoad={handleImageLoad}
                />
              </Animated.View>

            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Tagline — hidden until image loads */}
      <Animated.View style={[{ marginTop: 18, paddingHorizontal: 32 }, labelStyle]}>
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 14,
            color: '#9A8F82',
            textAlign: 'center',
          }}
        >
          {TAGLINES[emotion?.id ?? ''] ?? ''}
        </Text>
      </Animated.View>

      {/* Pagination dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
        {ORDERED_EMOTIONS.map((_, i) => (
          <Dot key={i} active={i === activeIndex} />
        ))}
      </View>

      {/* Go Home */}
      <View style={{ width: '100%', alignItems: 'center', marginTop: 24 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Go home"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#A09080', letterSpacing: 0.5 }}>
            Go Home
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
