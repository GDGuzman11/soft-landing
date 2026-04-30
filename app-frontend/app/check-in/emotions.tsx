import { View, Text, Dimensions, ImageBackground } from 'react-native'
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
const CARD_W         = screenWidth * 0.78
const CARD_H         = screenHeight * 0.56
const SWIPE_THRESHOLD = 75
const STACK_OFFSET    = 14  // px each back card peeks above the one in front

const EMOTION_ORDER   = ['good', 'neutral', 'tired', 'sad', 'stressed']
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

// ── Shimmering jewel ─────────────────────────────────────────────────────────
function ShimmerGlyph({ color, active }: { color: string; active: boolean }) {
  const glow = useSharedValue(active ? 0.6 : 0)

  useEffect(() => {
    if (active) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1,   { duration: 900 }),
          withTiming(0.3, { duration: 900 }),
        ),
        -1,
        false,
      )
    } else {
      cancelAnimation(glow)
      glow.value = withTiming(0, { duration: 300 })
    }
  }, [active, glow])

  const style = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.82 + glow.value * 0.22 }],
  }))

  return (
    <Animated.Text
      style={[
        {
          fontFamily: 'DMSans_500Medium',
          fontSize: 18,
          color,
          marginRight: 8,
          textShadowColor: color,
          textShadowRadius: 8,
          textShadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    >
      {'✦'}
    </Animated.Text>
  )
}

// ── Single card in the stack ──────────────────────────────────────────────────
function EmotionCard({
  emotion,
  stackPos,
  isFront,
}: {
  emotion: (typeof ORDERED_EMOTIONS)[number]
  stackPos: number   // 0 = front, 1 = first behind, 2 = second behind
  isFront: boolean
}) {
  const pulseGlow = useSharedValue(0)

  useEffect(() => {
    if (isFront) {
      pulseGlow.value = withRepeat(
        withSequence(
          withTiming(0.75, { duration: 1300 }),
          withTiming(0.15, { duration: 1300 }),
        ),
        -1,
        false,
      )
    } else {
      cancelAnimation(pulseGlow)
      pulseGlow.value = withTiming(0, { duration: 350 })
    }
  }, [isFront, pulseGlow])

  const scale   = 1 - stackPos * 0.045
  const offsetY = -stackPos * STACK_OFFSET

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: pulseGlow.value,
  }))

  return (
    // Shadow wrapper — kept separate from overflow:hidden layer so shadow isn't clipped
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: CARD_W,
          height: CARD_H,
          borderRadius: 26,
          transform: [{ scale }, { translateY: offsetY }],
          shadowColor: emotion.color,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 28,
          elevation: isFront ? 16 : 4,
        },
        glowStyle,
      ]}
    >
      {/* Frame + clip layer */}
      <View
        style={{
          flex: 1,
          borderRadius: 26,
          borderWidth: 3,
          borderColor: '#7A5030',
          overflow: 'hidden',
        }}
      >
        <ImageBackground
          source={EMOTION_IMAGES[emotion.id]}
          style={{ flex: 1 }}
          resizeMode="cover"
        />

        {/* Subtle dark vignette at bottom for future label use */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            backgroundColor: 'rgba(30,18,10,0.25)',
          }}
          pointerEvents="none"
        />
      </View>
    </Animated.View>
  )
}

// ── Pagination dot ────────────────────────────────────────────────────────────
function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 22 : 8)
  useEffect(() => {
    w.value = withSpring(active ? 22 : 8, { stiffness: 120, damping: 14 })
  }, [active, w])
  const style = useAnimatedStyle(() => ({ width: w.value }))
  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: active ? '#C4956A' : '#D4CABE',
          marginHorizontal: 3,
          opacity: active ? 1 : 0.5,
        },
        style,
      ]}
    />
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EmotionsScreen() {
  const [activeIndex, setActiveIndex] = useState(0)
  const total = ORDERED_EMOTIONS.length

  const panX      = useSharedValue(0)
  const panRotate = useSharedValue(0)

  function advance(dir: 'left' | 'right') {
    setActiveIndex((i) =>
      dir === 'left'
        ? (i + 1) % total
        : (i - 1 + total) % total,
    )
    panX.value      = 0
    panRotate.value = 0
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
    .onUpdate((e) => {
      panX.value      = e.translationX
      panRotate.value = e.translationX / 16
    })
    .onEnd((e) => {
      const swipeLeft  = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -500
      const swipeRight = e.translationX >  SWIPE_THRESHOLD || e.velocityX >  500

      if (swipeLeft) {
        panX.value = withTiming(-screenWidth * 1.4, { duration: 280 }, (done) => {
          if (done) runOnJS(advance)('left')
        })
      } else if (swipeRight) {
        panX.value = withTiming(screenWidth * 1.4, { duration: 280 }, (done) => {
          if (done) runOnJS(advance)('right')
        })
      } else {
        panX.value      = withSpring(0, { stiffness: 180, damping: 22 })
        panRotate.value = withSpring(0, { stiffness: 180, damping: 22 })
      }
    })

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleSelect)()
  })

  const frontCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { rotate: `${panRotate.value}deg` },
    ],
  }))

  const activeEmotion = ORDERED_EMOTIONS[activeIndex]

  // Stack order: render back cards first, front card last (on top)
  const stackOrder = [2, 1, 0]

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }} accessibilityLabel="Emotion picker">
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16, alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 22,
            color: '#1A1A1A',
            textAlign: 'center',
            marginBottom: 6,
          }}
          accessibilityRole="header"
        >
          How are you right now?
        </Text>
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 14,
            color: '#A09080',
            textAlign: 'center',
          }}
        >
          Take a moment. Be honest.
        </Text>
      </View>

      {/* Emotion label + shimmer glyph */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          minHeight: 36,
        }}
      >
        <ShimmerGlyph color={activeEmotion?.color ?? '#C4956A'} active />
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 26,
            color: '#3D2F2A',
          }}
        >
          {activeEmotion?.label ?? ''}
        </Text>
      </View>

      {/* Card stack */}
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          height: CARD_H + STACK_OFFSET * 2 + 10,
        }}
      >
        {stackOrder.map((stackPos) => {
          const emotionIndex = (activeIndex + stackPos) % total
          const emotion      = ORDERED_EMOTIONS[emotionIndex]
          const isFront      = stackPos === 0

          if (isFront) {
            return (
              <GestureDetector
                key={`front-${activeIndex}`}
                gesture={Gesture.Exclusive(panGesture, tapGesture)}
              >
                <Animated.View
                  style={[
                    { position: 'absolute', width: CARD_W, height: CARD_H },
                    frontCardStyle,
                  ]}
                >
                  <EmotionCard emotion={emotion} stackPos={0} isFront />
                </Animated.View>
              </GestureDetector>
            )
          }

          return (
            <EmotionCard
              key={`stack-${stackPos}-${emotionIndex}`}
              emotion={emotion}
              stackPos={stackPos}
              isFront={false}
            />
          )
        })}
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
        {TAGLINES[activeEmotion?.id ?? ''] ?? ''}
      </Text>

      {/* Pagination dots */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 20,
        }}
      >
        {ORDERED_EMOTIONS.map((_, i) => (
          <Dot key={i} active={i === activeIndex} />
        ))}
      </View>
    </View>
  )
}
