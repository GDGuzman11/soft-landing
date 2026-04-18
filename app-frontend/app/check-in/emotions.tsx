import { View, Text, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { EMOTIONS } from '@/constants/emotions'
import { canCheckIn } from '@/services/checkIn'

export default function EmotionsScreen() {
  async function handleSelect(emotionId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const allowed = await canCheckIn()
    if (!allowed) {
      router.replace('/paywall')
      return
    }
    router.push({ pathname: '/check-in/envelope', params: { emotionId } })
  }

  return (
    <View className="flex-1 bg-background" accessibilityLabel="Emotion picker">
      <View className="px-6 pt-16 pb-6">
        <Text
          className="text-text-primary text-2xl text-center"
          style={{ fontFamily: 'DMSans_500Medium' }}
          accessibilityRole="header"
        >
          How are you right now?
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Emotion options"
      >
        {EMOTIONS.map((emotion) => (
          <Pressable
            key={emotion.id}
            onPress={() => handleSelect(emotion.id)}
            accessibilityRole="button"
            accessibilityLabel={`I'm feeling ${emotion.label}`}
            style={({ pressed }) => ({
              backgroundColor: emotion.color,
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 20,
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              minHeight: 64,
            })}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                marginRight: 14,
                backgroundColor: `${emotion.color}99`,
              }}
            />
            <Text
              className="text-text-primary text-lg"
              style={{ fontFamily: 'DMSans_500Medium' }}
            >
              {emotion.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}
