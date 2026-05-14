import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const BOTTOM_AREA = 100
const SLIDE_HEIGHT = SCREEN_HEIGHT - BOTTOM_AREA

const SLIDES = [
  {
    icon: '✦',
    iconFamily: 'DMSans_400Regular' as const,
    title: 'Home',
    tagline: 'Your daily check-in.',
    body: "Pick how you're feeling — good, tired, stressed, or anything in between. An envelope arrives with a verse chosen for this moment.",
  },
  {
    icon: '◇',
    iconFamily: 'DMSans_400Regular' as const,
    title: 'The Path',
    tagline: 'Your saved verses.',
    body: 'Every verse you keep lives here. Come back to read, reflect, or write a personal letter from any saved moment.',
  },
  {
    icon: '“',
    iconFamily: 'Lora_400Regular_Italic' as const,
    title: 'Say',
    tagline: 'A space to speak.',
    body: "Type what's on your mind. Choose a voice — Kind, Still, Steady, or Wise — and receive a letter written back just for you.",
  },
  {
    icon: '○',
    iconFamily: 'DMSans_400Regular' as const,
    title: 'Profile',
    tagline: 'Your preferences.',
    body: 'Manage your settings, notification reminders, and subscription. Adjust how this works for you.',
  },
]

function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 20 : 8)
  useEffect(() => {
    w.value = withSpring(active ? 20 : 8, { stiffness: 120, damping: 14 })
  }, [active, w])
  const style = useAnimatedStyle(() => ({ width: w.value }))
  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4, backgroundColor: active ? '#C4956A' : '#E8E0D8', marginHorizontal: 3 },
        style,
      ]}
    />
  )
}

export default function OnboardingGuideScreen() {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const glowRadius = useSharedValue(6)

  useEffect(() => {
    glowRadius.value = withRepeat(
      withSequence(
        withTiming(24, { duration: 1400 }),
        withTiming(6, { duration: 1400 }),
      ),
      -1,
      false,
    )
  }, [])

  const glowStyle = useAnimatedStyle(() => ({
    textShadowRadius: glowRadius.value,
  }))

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
          setActiveIndex(index)
        }}
        scrollEventThrottle={16}
        style={{ height: SLIDE_HEIGHT }}
        contentContainerStyle={{ height: SLIDE_HEIGHT }}
      >
        {SLIDES.map((slide) => (
          <View
            key={slide.title}
            style={{
              width: SCREEN_WIDTH,
              height: SLIDE_HEIGHT,
              paddingHorizontal: 40,
              paddingTop: 96,
              alignItems: 'center',
            }}
          >
            <Animated.Text
              style={[
                {
                  fontFamily: slide.iconFamily,
                  fontSize: 58,
                  color: '#C4956A',
                  textShadowColor: '#C4956A',
                  textShadowOffset: { width: 0, height: 0 },
                  marginBottom: 36,
                },
                glowStyle,
              ]}
            >
              {slide.icon}
            </Animated.Text>

            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 30,
                color: '#3D2F2A',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {slide.title}
            </Text>

            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 16,
                color: '#C4956A',
                marginBottom: 28,
                textAlign: 'center',
              }}
            >
              {slide.tagline}
            </Text>

            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 16,
                color: '#5A4A40',
                lineHeight: 26,
                textAlign: 'center',
              }}
            >
              {slide.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Fixed bottom — dots + swipe hint or CTA */}
      <View
        style={{
          height: BOTTOM_AREA,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === activeIndex} />
          ))}
        </View>

        {activeIndex < SLIDES.length - 1 ? (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: '#C4B59A',
              letterSpacing: 0.5,
            }}
          >
            swipe to continue
          </Text>
        ) : (
          <Pressable
            onPress={() => router.replace('/onboarding-profile')}
            accessibilityRole="button"
            accessibilityLabel="I'm ready"
            className="active:opacity-80"
            style={{
              backgroundColor: '#C4956A',
              borderRadius: 9999,
              paddingVertical: 14,
              paddingHorizontal: 48,
              shadowColor: '#C4956A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
              I'm ready →
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
