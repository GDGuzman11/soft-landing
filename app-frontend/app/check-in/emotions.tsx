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
    <View className="flex-1 bg-background">
      <View className="px-6 pt-16 pb-6">
        <Text
          className="text-text-primary text-2xl text-center"
          style={{ fontFamily: 'DMSans_500Medium' }}
        >
          How are you right now?
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {EMOTIONS.map((emotion) => (
          <Pressable
            key={emotion.id}
            onPress={() => handleSelect(emotion.id)}
            className="w-full rounded-2xl px-5 py-5 flex-row items-center"
            style={({ pressed }) => ({
              backgroundColor: emotion.color,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View
              className="w-3 h-3 rounded-full mr-4"
              style={{ backgroundColor: `${emotion.color}99` }}
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
