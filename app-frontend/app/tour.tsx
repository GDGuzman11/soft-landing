import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated'

const SECTIONS = [
  {
    label: 'CHECK IN',
    heading: 'How are you right now?',
    body: "Each day, begin with one honest word. Five feelings to choose from — stressed, tired, sad, neutral, good. No judgment, no score. Just a moment to acknowledge where you actually are before the day carries you further.",
  },
  {
    label: 'YOUR VERSE',
    heading: 'A word chosen for this moment.',
    body: "Your verse arrives sealed in an envelope, chosen for the emotion you named. Tap when you're ready to open it. Swipe right to save what stays with you; swipe left to receive another. Each verse is drawn from Scripture — a word that has been speaking into human grief and hope for thousands of years.",
  },
  {
    label: 'YOUR COLLECTION',
    heading: 'Everything you save, always here.',
    body: "Every verse you keep lives in History — a quiet, personal library of the moments and the words that met you there. Return to any of them whenever you need to. Over time, it becomes a record of what you've carried and what has carried you.",
  },
  {
    label: 'LETTERS',
    heading: "Write what's on your heart.",
    body: "After a check-in, you can share what you're carrying in your own words. In return, you'll receive a personal letter — woven from your verse, your emotion, and what you wrote — addressed to you and written for exactly this moment.",
  },
]

export default function TourScreen() {
  const headerOpacity = useSharedValue(0)
  const headerY = useSharedValue(12)
  const contentOpacity = useSharedValue(0)

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 })
    headerY.value = withTiming(0, { duration: 500 })
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 500 }))
  }, [])

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }))

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingTop: 68,
          paddingBottom: 128,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — cross + title */}
        <Animated.View style={[{ alignItems: 'center', marginBottom: 36 }, headerStyle]}>
          {/* Amber cross */}
          <View style={{ width: 44, height: 58, position: 'relative', alignItems: 'center', marginBottom: 22 }}>
            <View style={{
              position: 'absolute',
              width: 4,
              height: 58,
              backgroundColor: '#C4956A',
              borderRadius: 2,
              alignSelf: 'center',
            }} />
            <View style={{
              position: 'absolute',
              width: 30,
              height: 4,
              backgroundColor: '#C4956A',
              borderRadius: 2,
              top: 15,
              alignSelf: 'center',
            }} />
          </View>

          <Text style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 27,
            color: '#1A1A1A',
            textAlign: 'center',
            letterSpacing: 0.2,
            marginBottom: 10,
          }}>
            Before you begin.
          </Text>
          <Text style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: '#A09080',
            textAlign: 'center',
            letterSpacing: 0.3,
          }}>
            A quiet look at what's inside.
          </Text>
        </Animated.View>

        {/* Ornament divider */}
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 36 }, contentStyle]}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EDE8E0' }} />
          <Text style={{ fontSize: 10, color: '#C4956A', opacity: 0.7 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#EDE8E0' }} />
        </Animated.View>

        {/* Sections */}
        <Animated.View style={contentStyle}>
          {SECTIONS.map((section, i) => (
            <View key={section.label}>
              {/* Section */}
              <View style={{ marginBottom: 30 }}>
                {/* Label */}
                <Text style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 10,
                  color: '#C4956A',
                  letterSpacing: 2.8,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  {section.label}
                </Text>

                {/* Heading */}
                <Text style={{
                  fontFamily: 'Lora_400Regular_Italic',
                  fontSize: 19,
                  color: '#1A1A1A',
                  lineHeight: 28,
                  marginBottom: 12,
                }}>
                  {section.heading}
                </Text>

                {/* Body */}
                <Text style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: '#6E6358',
                  lineHeight: 24,
                }}>
                  {section.body}
                </Text>
              </View>

              {/* Divider between sections */}
              {i < SECTIONS.length - 1 && (
                <View style={{ height: 1, backgroundColor: '#EDE8E0', marginBottom: 30 }} />
              )}
            </View>
          ))}

          {/* Closing note */}
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: 14,
              color: '#C4B59A',
              textAlign: 'center',
              lineHeight: 22,
            }}>
              Free to use. A moment whenever you need one.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Fixed bottom — Begin button */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FAF8F5',
        borderTopWidth: 1,
        borderTopColor: '#EDE8E0',
        paddingHorizontal: 32,
        paddingTop: 16,
        paddingBottom: 44,
        gap: 10,
      }}>
        <Pressable
          onPress={() => router.replace('/welcome')}
          accessibilityRole="button"
          accessibilityLabel="Create an account or sign in"
          style={({ pressed }) => ({
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
            borderWidth: 1.5,
            borderColor: '#C4956A',
          })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#C4956A' }}>
            Begin →
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
