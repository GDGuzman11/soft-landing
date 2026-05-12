import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useTheme } from '@/theme'

const SECTIONS = [
  {
    label: 'CHECK IN',
    heading: 'How are you right now?',
    body: "One honest word. No score, no judgment — just a moment to name where you actually are.",
  },
  {
    label: 'YOUR VERSE',
    heading: 'A word chosen for this moment.',
    body: "A verse arrives sealed, chosen for what you named. Open it when you're ready. Keep what carries you — receive another if you need it.",
  },
  {
    label: 'THE PATH',
    heading: 'Everything you save, always here.',
    body: "The Path holds every verse you've kept — a quiet record of what you've carried and what has carried you.",
  },
  {
    label: 'LETTERS',
    heading: "Write what's on your heart.",
    body: "Share what's on your heart in your own words. What comes back is a letter — addressed to you, written for exactly this moment.",
  },
]

export default function TourScreen() {
  const { colors } = useTheme()

  const innerGlowOpacity = useSharedValue(0.05)
  const headerOpacity = useSharedValue(0)
  const headerY = useSharedValue(12)
  const contentOpacity = useSharedValue(0)

  useEffect(() => {
    // Soft breathing halo — 40% of welcome screen intensity
    innerGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.05, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )

    headerOpacity.value = withTiming(1, { duration: 500 })
    headerY.value = withTiming(0, { duration: 500 })
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 500 }))
  }, [])

  const innerGlowStyle = useAnimatedStyle(() => ({ opacity: innerGlowOpacity.value }))

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }))

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingTop: 68,
          paddingBottom: 148,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — cross + breathing halo + title */}
        <Animated.View style={[{ alignItems: 'center', marginBottom: 36 }, headerStyle]}>
          {/* Breathing halo */}
          <Animated.View
            pointerEvents="none"
            style={[{
              position: 'absolute',
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: colors.amber,
              top: -22,
            }, innerGlowStyle]}
          />

          {/* Amber cross */}
          <View style={{ width: 44, height: 58, position: 'relative', alignItems: 'center', marginBottom: 22 }}>
            <View style={{
              position: 'absolute',
              width: 4,
              height: 58,
              backgroundColor: colors.amber,
              borderRadius: 2,
              alignSelf: 'center',
            }} />
            <View style={{
              position: 'absolute',
              width: 30,
              height: 4,
              backgroundColor: colors.amber,
              borderRadius: 2,
              top: 15,
              alignSelf: 'center',
            }} />
          </View>

          <Text style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 27,
            color: colors.inkPrimary,
            textAlign: 'center',
            letterSpacing: 0.2,
            marginBottom: 10,
          }}>
            Before you begin.
          </Text>
          <Text style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: colors.inkMuted,
            textAlign: 'center',
            letterSpacing: 0.3,
          }}>
            A quiet look at what's inside.
          </Text>
        </Animated.View>

        {/* Ornament divider */}
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 36 }, contentStyle]}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
          <Text style={{ fontSize: 10, color: colors.amber, opacity: 0.7 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
        </Animated.View>

        {/* Sections */}
        <Animated.View style={contentStyle}>
          {SECTIONS.map((section, i) => (
            <View key={section.label}>
              <View style={{ marginBottom: 30 }}>
                <Text style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 10,
                  color: colors.amber,
                  letterSpacing: 2.8,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  {section.label}
                </Text>

                <Text style={{
                  fontFamily: 'Lora_400Regular_Italic',
                  fontSize: 19,
                  color: colors.inkPrimary,
                  lineHeight: 28,
                  marginBottom: 12,
                }}>
                  {section.heading}
                </Text>

                <Text style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: colors.inkMuted,
                  lineHeight: 24,
                }}>
                  {section.body}
                </Text>
              </View>

              {i < SECTIONS.length - 1 && (
                <View style={{ height: 1, backgroundColor: colors.hairline, marginBottom: 30 }} />
              )}
            </View>
          ))}

          {/* Closing note */}
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: 14,
              color: colors.inkSubtle,
              textAlign: 'center',
              lineHeight: 22,
            }}>
              A small place to land — whenever you need one.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Fixed bottom — two CTAs */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
        paddingHorizontal: 32,
        paddingTop: 16,
        paddingBottom: 44,
        gap: 10,
      }}>
        {/* Primary — Start the Tour */}
        <Pressable
          onPress={() => router.push({ pathname: '/check-in/emotions', params: { tourMode: 'true' } })}
          accessibilityRole="button"
          accessibilityLabel="Start the interactive tour"
          style={({ pressed }) => ({
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
            backgroundColor: colors.amber,
          })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
            Start the Tour →
          </Text>
        </Pressable>

        {/* Secondary — skip straight to register */}
        <Pressable
          onPress={() => router.replace('/register')}
          accessibilityRole="button"
          accessibilityLabel="Create an account"
          style={({ pressed }) => ({
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
            borderWidth: 1.5,
            borderColor: colors.amber,
          })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.amber }}>
            Begin →
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
