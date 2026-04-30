import { View, Text, Dimensions, ImageBackground, Image, Pressable } from 'react-native'
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
import { useEffect, useState } from 'react'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
const CARD_W          = screenWidth * 0.82
const CARD_H          = screenHeight * 0.56
const SWIPE_THRESHOLD = 70

const EMOTION_ORDER    = ['good', 'neutral', 'tired', 'sad', 'stressed']
const ORDERED_EMOTIONS = EMOTION_ORDER
  .map((id) => EMOTIONS.find((e) => e.id === id)!)
  .filter(Boolean)

const EMOTION_IMAGES: Record<string, any> = {
  stressed: require('../../assets/images/stressed1.png'),
  tired:    require('../../assets/images/tired1.png'),
  sad:      require('../../assets/images/sad3.png'),
  neutral:  require('../../assets/images/neutral1.png'),
  good:     require('../../assets/images/happy1.png'),
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

  // Card pan + image fade
  const panX         = useSharedValue(0)
  const imageOpacity = useSharedValue(1)

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

  function advance(dir: 'left' | 'right') {
    setActiveIndex((i) =>
      dir === 'left' ? (i + 1) % total : (i - 1 + total) % total,
    )
    panX.value         = 0
    imageOpacity.value = 0
    imageOpacity.value = withTiming(1, { duration: 300 })
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

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { panX.value = e.translationX })
    .onEnd((e) => {
      const goLeft  = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -500
      const goRight = e.translationX >  SWIPE_THRESHOLD || e.velocityX >  500

      if (goLeft) {
        panX.value = withTiming(-screenWidth * 1.4, { duration: 240 }, (done) => {
          if (done) runOnJS(advance)('left')
        })
      } else if (goRight) {
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

  const imageStyle = useAnimatedStyle(() => ({ opacity: imageOpacity.value }))

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity:   shimmer.value,
    transform: [{ scale: 0.82 + shimmer.value * 0.22 }],
  }))

  const emotion = ORDERED_EMOTIONS[activeIndex]

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }} accessibilityLabel="Emotion picker">
      {/* Preload all emotion images into the native cache to eliminate swap lag */}
      <View style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }} pointerEvents="none">
        {(Object.values(EMOTION_IMAGES) as any[]).map((src, i) => (
          <Image key={i} source={src} style={{ width: 1, height: 1 }} />
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

      {/* Emotion label + shimmer jewel */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 36 }}>
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
      </View>

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
              <Animated.View style={[{ flex: 1 }, imageStyle]}>
                <ImageBackground
                  source={EMOTION_IMAGES[emotion?.id ?? 'good']}
                  style={{ flex: 1 }}
                  resizeMode="cover"
                />
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Tagline */}
      <Text
        style={{
          fontFamily: 'Lora_400Regular_Italic',
          fontSize: 14,
          color: '#9A8F82',
          textAlign: 'center',
          marginTop: 18,
          paddingHorizontal: 32,
        }}
      >
        {TAGLINES[emotion?.id ?? ''] ?? ''}
      </Text>

      {/* Pagination dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
        {ORDERED_EMOTIONS.map((_, i) => (
          <Dot key={i} active={i === activeIndex} />
        ))}
      </View>

      {/* Go Home */}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => ({ alignSelf: 'center', marginTop: 24, opacity: pressed ? 0.5 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Go home"
      >
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#A09080', letterSpacing: 0.5 }}>
          Go Home
        </Text>
      </Pressable>
    </View>
  )
}
