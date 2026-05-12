import { View, Text, Dimensions, ImageBackground, Pressable, StyleSheet } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
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
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/theme'
import PositionedTooltip from '@/components/PositionedTooltip'

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

type ThemeColors = ReturnType<typeof useTheme>['colors']

function Dot({ active, colors }: { active: boolean; colors: ThemeColors }) {
  const w = useSharedValue(active ? 22 : 8)
  useEffect(() => {
    w.value = withSpring(active ? 22 : 8, { stiffness: 120, damping: 14 })
  }, [active, w])
  const style = useAnimatedStyle(() => ({ width: w.value }))
  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4, backgroundColor: active ? '#C4956A' : colors.cardBorder, marginHorizontal: 3, opacity: active ? 1 : 0.5 },
        style,
      ]}
    />
  )
}

export default function EmotionsScreen() {
  const { colors, isDark } = useTheme()
  const { tourMode } = useLocalSearchParams<{ tourMode?: string }>()
  const isTour = tourMode === 'true'
  const [activeIndex, setActiveIndex] = useState(isTour ? EMOTION_ORDER.indexOf('good') : 0)
  const [showTourTip, setShowTourTip] = useState(isTour)
  const [cardAnchorY, setCardAnchorY] = useState(0)
  const cardRef = useRef<View>(null)
  const total = ORDERED_EMOTIONS.length

  // Card pan
  const panX = useSharedValue(0)

  // Label/tagline fade on index change
  const labelFade = useSharedValue(1)

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

  useEffect(() => {
    if (!isTour) return
    const t = setTimeout(() => {
      cardRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
        setCardAnchorY(pageY)
      })
    }, 150)
    return () => clearTimeout(t)
  }, [])

  function advance(dir: 'left' | 'right') {
    setActiveIndex((i) =>
      dir === 'left' ? (i + 1) % total : (i - 1 + total) % total,
    )
    panX.value = 0
    labelFade.value = 0
    labelFade.value = withTiming(1, { duration: 200 })
  }

  async function handleSelect() {
    const emotion = ORDERED_EMOTIONS[activeIndex]
    if (!emotion) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isTour) {
      router.push({ pathname: '/check-in/envelope', params: { emotionId: emotion.id, tourMode: 'true' } })
      return
    }
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

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelFade.value }))

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity:   shimmer.value,
    transform: [{ scale: 0.82 + shimmer.value * 0.22 }],
  }))

  const emotion = ORDERED_EMOTIONS[activeIndex]
  const cardBorderColor = isDark ? 'rgba(196,149,106,0.35)' : '#7A5030'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} accessibilityLabel="Emotion picker">
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16, alignItems: 'center' }}>
        <Text
          style={{ fontFamily: 'DMSans_500Medium', fontSize: 22, color: colors.inkSecondary, textAlign: 'center', marginBottom: 6 }}
          accessibilityRole="header"
        >
          How are you right now?
        </Text>
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 14, color: colors.inkMuted, textAlign: 'center' }}>
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
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 26, color: colors.inkPrimary }}>
          {emotion?.label ?? ''}
        </Text>
      </Animated.View>

      {/* Single card */}
      <View ref={cardRef} style={{ alignItems: 'center' }}>
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
            <View style={{ flex: 1, borderRadius: 26, borderWidth: 3, borderColor: cardBorderColor, overflow: 'hidden' }}>
              {ORDERED_EMOTIONS.map((em, i) => (
                <View
                  key={em.id}
                  style={[
                    StyleSheet.absoluteFillObject,
                    { opacity: i === activeIndex ? 1 : 0 },
                  ]}
                  pointerEvents={i === activeIndex ? 'auto' : 'none'}
                >
                  <ImageBackground
                    source={EMOTION_IMAGES[em.id]}
                    style={{ flex: 1 }}
                    resizeMode="cover"
                  />
                </View>
              ))}
              {/* Tagline overlay — scrim + text over bottom of card */}
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: CARD_H * 0.30,
                  },
                  labelStyle,
                ]}
              >
                {/* 4-step opacity staircase simulating bottom-to-top gradient */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', backgroundColor: 'rgba(0,0,0,0.09)' }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '75%',  backgroundColor: 'rgba(0,0,0,0.09)' }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',  backgroundColor: 'rgba(0,0,0,0.09)' }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%',  backgroundColor: 'rgba(0,0,0,0.09)' }} />
                {/* Tagline text */}
                <Text
                  style={{
                    position: 'absolute',
                    bottom: 18,
                    left: 18,
                    right: 18,
                    fontFamily: 'Lora_400Regular_Italic',
                    fontSize: 15,
                    color: '#FFFFFF',
                    textAlign: 'center',
                  }}
                >
                  {TAGLINES[emotion?.id ?? ''] ?? ''}
                </Text>
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Pagination dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 }}>
        {ORDERED_EMOTIONS.map((_, i) => (
          <Dot key={i} active={i === activeIndex} colors={colors} />
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
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMuted, letterSpacing: 0.5 }}>
            Go Home
          </Text>
        </Pressable>
      </View>

      {showTourTip && cardAnchorY > 0 && (
        <PositionedTooltip
          text="Five feelings. Swipe to explore — then tap when you're ready."
          buttonLabel="Got it →"
          anchorY={cardAnchorY}
          placement="above"
          onDismiss={() => setShowTourTip(false)}
        />
      )}
    </View>
  )
}
