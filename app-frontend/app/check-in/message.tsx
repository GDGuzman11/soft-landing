import { View, Text, Pressable } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { bookmarkMessage } from '@/services/checkIn'

export default function MessageScreen() {
  const { messageBody, checkInId, messageId } = useLocalSearchParams<{
    messageBody: string
    checkInId: string
    messageId: string
  }>()

  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (saved) return
    await bookmarkMessage(checkInId, messageId)
    setSaved(true)
  }

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
          className="text-text-primary text-center leading-8"
          style={{ fontFamily: 'Lora_400Regular', fontSize: 18 }}
        >
          {messageBody}
        </Text>
      </View>

      <View className="flex-row items-center gap-8 mt-8">
        <Pressable
          onPress={handleSave}
          className="p-3 active:opacity-60"
          accessibilityLabel="Save message"
        >
          <Text style={{ fontSize: 26, opacity: saved ? 1 : 0.5 }}>
            {saved ? '★' : '☆'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          className="p-3 active:opacity-60"
          accessibilityLabel="Dismiss"
        >
          <Text
            className="text-text-secondary"
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 24 }}
          >
            ×
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
