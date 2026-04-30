import { View, Text, Pressable, ScrollView, Dimensions, ImageBackground } from 'react-native'
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
const CARD_HEIGHT = screenHeight * 0.5

const EMOTION_IMAGES: Partial<Record<string, any>> = {
  sad: require('../../assets/images/sad3.png'),
}

const TAGLINES: Record<string, string> = {
  stressed: 'Carrying too much right now',
  tired: 'Running low on everything',
  sad: 'Heart feeling heavy',
  neutral: 'Just getting through it',
  good: 'Feeling grateful today',
}

function darken(hex: string, amount = 40): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
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
    textShadowRadius: glow.value * 10,
    textShadowOffset: { width: 0, height: 0 },
  }))

  return (
    <Animated.Text
      style={[{
        fontFamily: 'DMSans_500Medium',
        fontSize: 20,
        color,
        marginRight: 10,
      }, animatedStyle]}
    >
      {'✦'}
    </Animated.Text>
  )
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
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }} accessibilityLabel="Emotion picker">
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 20, alignItems: 'center' }}>
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

      <ScrollView
        style={{ flex: 1 }}
        snapToInterval={CARD_HEIGHT}
        decelerationRate="fast"
        snapToAlignment="start"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 0 }}
        accessibilityLabel="Emotion options"
      >
        {EMOTIONS.map((emotion) => {
          const glyphColor = darken(emotion.color, 55)
          const watermarkColor = darken(emotion.color, 30)

          const image = EMOTION_IMAGES[emotion.id]
          const cardContent = (
            <>
              {/* Emotion color overlay (always present; on image cards it tints for readability) */}
              <View
                style={{
                  ...(!image ? { backgroundColor: emotion.color } : { backgroundColor: emotion.color }),
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  opacity: image ? 0.55 : 1,
                }}
              />

              {/* Watermark ✦ */}
              <Text
                style={{
                  position: 'absolute',
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 180,
                  color: watermarkColor,
                  opacity: 0.07,
                  right: -20,
                  bottom: -20,
                }}
              >
                {'✦'}
              </Text>

              {/* Label row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <ShimmeringGlyph color={image ? '#FFFFFF' : glyphColor} />
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 32,
                    color: image ? '#FFFFFF' : '#1A1A1A',
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
                  fontSize: 16,
                  color: image ? '#FFFFFF' : glyphColor,
                  opacity: 0.85,
                  textAlign: 'center',
                  letterSpacing: 0.2,
                }}
              >
                {TAGLINES[emotion.id]}
              </Text>
            </>
          )

          const cardStyle = {
            width: screenWidth,
            height: CARD_HEIGHT,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            overflow: 'hidden' as const,
          }

          const pressStyle = ({ pressed }: { pressed: boolean }) => ({
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })

          return image ? (
            <Pressable
              key={emotion.id}
              onPress={() => handleSelect(emotion.id)}
              accessibilityRole="button"
              accessibilityLabel={`I'm feeling ${emotion.label}`}
              style={pressStyle}
            >
              <ImageBackground
                source={image}
                style={cardStyle}
                resizeMode="cover"
              >
                {cardContent}
              </ImageBackground>
            </Pressable>
          ) : (
            <Pressable
              key={emotion.id}
              onPress={() => handleSelect(emotion.id)}
              accessibilityRole="button"
              accessibilityLabel={`I'm feeling ${emotion.label}`}
              style={({ pressed }) => ({ ...cardStyle, ...pressStyle({ pressed }) })}
            >
              {cardContent}
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
