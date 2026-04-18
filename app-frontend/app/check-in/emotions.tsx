import { View, Text, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { EMOTIONS } from '@/constants/emotions'

export default function EmotionsScreen() {
  function handleSelect(emotionId: string) {
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
            className="w-full rounded-2xl px-5 py-5 flex-row items-center active:scale-95"
            style={{ backgroundColor: emotion.color }}
          >
            <View
              className="w-3 h-3 rounded-full mr-4"
              style={{ backgroundColor: `${emotion.color}CC` }}
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
