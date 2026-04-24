import { View, Text, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { EMOTIONS } from '@/constants/emotions'
import { canCheckIn } from '@/services/checkIn'

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

export default function EmotionsScreen() {
  async function handleSelect(emotionId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const allowed = await canCheckIn()
    if (!allowed) {
      router.push('/paywall')
      return
    }
    router.push({ pathname: '/check-in/envelope', params: { emotionId } })
  }

  return (
    <View className="flex-1 bg-background" accessibilityLabel="Emotion picker">
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
              {({ pressed }) => (
                <>
                  {/* Decorative glyph with glow on press */}
                  <View
                    style={{
                      marginBottom: 6,
                      shadowColor: '#FFFFFF',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: pressed ? 0.95 : 0,
                      shadowRadius: pressed ? 14 : 0,
                      elevation: pressed ? 10 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 22,
                        color: glyphColor,
                        letterSpacing: 4,
                      }}
                    >
                      ✦
                    </Text>
                  </View>

                  {/* Emotion label */}
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 18,
                      color: '#1A1A1A',
                      textAlign: 'center',
                      marginBottom: 5,
                    }}
                  >
                    {emotion.label}
                  </Text>

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
