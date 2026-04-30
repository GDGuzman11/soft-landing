import { View, Text, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { EMOTIONS } from '@/constants/emotions'
import { canCheckIn } from '@/services/checkIn'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'

const TAGLINES: Record<string, string> = {
  stressed: 'Carrying too much right now',
  tired: 'Running low on everything',
  sad: 'Heart feeling heavy',
  neutral: 'Just getting through it',
  good: 'Feeling grateful today',
}

function ShimmeringGlyph({ color }: { color: string }) {
  const glow = useSharedValue(0.5)

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0.35, { duration: 900 }),
      ),
      -1,
      false,
    )
  }, [glow])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.85 + glow.value * 0.2 }],
    textShadowColor: color,
    textShadowRadius: glow.value * 8,
    textShadowOffset: { width: 0, height: 0 },
  }))

  return (
    <Animated.Text
      style={[{
        fontFamily: 'DMSans_500Medium',
        fontSize: 16,
        color,
        marginRight: 8,
      }, animatedStyle]}
    >
      {'✦'}
    </Animated.Text>
  )
}

function darken(hex: string, amount = 40): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export default function EmotionsScreen() {
  async function handleSelect(emotionId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const allowed = await canCheckIn()
    if (!allowed) {
      router.push('/paywall')
      return
    }
    router.push({
      pathname: '/check-in/envelope',
      params: { emotionId },
    })
  }

  return (
    <View style={{ flex: 1 }} className="bg-background" accessibilityLabel="Emotion picker">
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 28, alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 22,
            color: '#1A1A1A',
            textAlign: 'center',
            marginBottom: 8,
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
            letterSpacing: 0.2,
          }}
        >
          Take a moment. Be honest.
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Emotion options"
      >
        {EMOTIONS.map((emotion) => {
          const glyphColor = darken(emotion.color, 50)
          return (
            <Pressable
              key={emotion.id}
              onPress={() => handleSelect(emotion.id)}
              accessibilityRole="button"
              accessibilityLabel={`I'm feeling ${emotion.label}`}
              style={({ pressed }) => ({
                backgroundColor: emotion.color,
                borderRadius: 20,
                paddingHorizontal: 24,
                paddingVertical: 22,
                alignItems: 'center' as const,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
                minHeight: 88,
                justifyContent: 'center' as const,
              })}
            >
              {() => (
                <>
                  {/* Label row with shimmering glyph beside it */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                    <ShimmeringGlyph color={glyphColor} />
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 18,
                        color: '#1A1A1A',
                        textAlign: 'center',
                      }}
                    >
                      {emotion.label}
                    </Text>
                  </View>

                  {/* Tagline */}
                  <Text
                    style={{
                      fontFamily: 'Lora_400Regular_Italic',
                      fontSize: 13,
                      color: glyphColor,
                      opacity: 0.75,
                      textAlign: 'center',
                      letterSpacing: 0.1,
                    }}
                  >
                    {TAGLINES[emotion.id]}
                  </Text>
                </>
              )}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
