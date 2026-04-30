import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  ImageBackground,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { EMOTIONS } from '@/constants/emotions'
import { canCheckIn } from '@/services/checkIn'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import { useEffect, useState } from 'react'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
const CARD_W = screenWidth * 0.75
const CARD_H = screenHeight * 0.58
const CARD_GAP = 16
const SIDE_INSET = (screenWidth - CARD_W) / 2
const SNAP_INTERVAL = CARD_W + CARD_GAP

// Display order: Good → Neutral → Tired → Sad → Stressed
const EMOTION_ORDER = ['good', 'neutral', 'tired', 'sad', 'stressed']
const ORDERED_EMOTIONS = EMOTION_ORDER.map((id) => EMOTIONS.find((e) => e.id === id)!).filter(Boolean)

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

// ── Per-card animated component ─────────────────────────────────────────────
function EmotionCard({
  emotion,
  isActive,
  onPress,
}: {
  emotion: (typeof ORDERED_EMOTIONS)[number]
  isActive: boolean
  onPress: () => void
}) {
  const scale   = useSharedValue(isActive ? 1 : 0.9)
  const opacity = useSharedValue(isActive ? 1 : 0.65)
  const shadowO = useSharedValue(isActive ? 0.5 : 0)
  const glowS   = useSharedValue(1)

  useEffect(() => {
    scale.value   = withSpring(isActive ? 1 : 0.9, { stiffness: 80, damping: 14 })
    opacity.value = withTiming(isActive ? 1 : 0.65, { duration: 250 })
    shadowO.value = withTiming(isActive ? 0.5 : 0, { duration: 250 })
  }, [isActive, scale, opacity, shadowO])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * glowS.value }],
    opacity: opacity.value,
    shadowOpacity: shadowO.value,
  }))

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Glow pulse then navigate
    glowS.value   = withSequence(
      withSpring(1.04, { stiffness: 200, damping: 10 }),
      withSpring(1.0,  { stiffness: 200, damping: 10 }),
    )
    shadowO.value = withSequence(
      withTiming(0.9, { duration: 120 }),
      withTiming(0.5, { duration: 200 }),
    )
    // Small delay so the glow is visible before navigation
    setTimeout(onPress, 220)
  }

  return (
    <View style={{ width: CARD_W + CARD_GAP, alignItems: 'center', paddingHorizontal: CARD_GAP / 2 }}>
      {/* Label above card */}
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 22,
          color: '#3D2F2A',
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        {emotion.label}
      </Text>

      {/* Card */}
      <Animated.View
        style={[
          {
            width: CARD_W,
            height: CARD_H,
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: emotion.color,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 20,
            elevation: 12,
          },
          cardStyle,
        ]}
      >
        <Pressable onPress={handlePress} style={{ flex: 1 }}>
          <ImageBackground
            source={EMOTION_IMAGES[emotion.id]}
            style={{ flex: 1 }}
            resizeMode="cover"
          />
        </Pressable>
      </Animated.View>
    </View>
  )
}

// ── Pagination dot ───────────────────────────────────────────────────────────
function Dot({ isActive }: { isActive: boolean }) {
  const w = useSharedValue(isActive ? 20 : 8)
  const o = useSharedValue(isActive ? 1 : 0.35)

  useEffect(() => {
    w.value = withSpring(isActive ? 20 : 8, { stiffness: 120, damping: 14 })
    o.value = withTiming(isActive ? 1 : 0.35, { duration: 250 })
  }, [isActive, w, o])

  const style = useAnimatedStyle(() => ({ width: w.value, opacity: o.value }))

  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4, backgroundColor: '#C4956A', marginHorizontal: 3 },
        style,
      ]}
    />
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function EmotionsScreen() {
  const [activeIndex, setActiveIndex] = useState(0)

  async function handleSelect(emotionId: string) {
    const allowed = await canCheckIn()
    if (!allowed) {
      router.push('/paywall')
      return
    }
    router.push({ pathname: '/check-in/envelope', params: { emotionId } })
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x
    const idx = Math.round((x + SIDE_INSET) / SNAP_INTERVAL)
    const clamped = Math.max(0, Math.min(ORDERED_EMOTIONS.length - 1, idx))
    if (clamped !== activeIndex) setActiveIndex(clamped)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }} accessibilityLabel="Emotion picker">
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 24, alignItems: 'center' }}>
        <Text
          style={{ fontFamily: 'DMSans_500Medium', fontSize: 22, color: '#1A1A1A', textAlign: 'center', marginBottom: 6 }}
          accessibilityRole="header"
        >
          How are you right now?
        </Text>
        <Text
          style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 14, color: '#A09080', textAlign: 'center' }}
        >
          Take a moment. Be honest.
        </Text>
      </View>

      {/* Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        snapToAlignment="start"
        contentInset={{ left: SIDE_INSET, right: SIDE_INSET }}
        contentInsetAdjustmentBehavior="never"
        contentOffset={{ x: -SIDE_INSET, y: 0 }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {ORDERED_EMOTIONS.map((emotion, i) => (
          <EmotionCard
            key={emotion.id}
            emotion={emotion}
            isActive={i === activeIndex}
            onPress={() => handleSelect(emotion.id)}
          />
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
        {ORDERED_EMOTIONS.map((_, i) => (
          <Dot key={i} isActive={i === activeIndex} />
        ))}
      </View>
    </View>
  )
}
