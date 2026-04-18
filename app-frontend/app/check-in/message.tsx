import { View, Text, Pressable } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

export default function MessageScreen() {
  const { emotionId } = useLocalSearchParams<{ emotionId: string }>()

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <View
        className="w-full rounded-3xl p-8"
        style={{
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        <Text
          className="text-text-primary text-lg text-center leading-8"
          style={{ fontFamily: 'Lora_400Regular', fontSize: 18 }}
        >
          Your message will appear here.
        </Text>
      </View>

      <View className="flex-row items-center gap-6 mt-8">
        <Pressable
          className="p-3 active:opacity-60"
          onPress={() => {}}
          accessibilityLabel="Save message"
        >
          <Text style={{ fontSize: 24 }}>☆</Text>
        </Pressable>

        <Pressable
          className="p-3 active:opacity-60"
          onPress={() => router.replace('/(tabs)')}
          accessibilityLabel="Dismiss"
        >
          <Text
            className="text-text-secondary"
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 20 }}
          >
            ×
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
