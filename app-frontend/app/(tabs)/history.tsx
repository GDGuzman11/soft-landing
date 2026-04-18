import { View, Text, FlatList, Pressable } from 'react-native'
import { useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { getSavedMessages, deleteSavedMessage } from '@/storage/storage'
import type { SavedMessage } from '@/types'
import catalog from '@/messages/catalog.json'
import type { Message } from '@/types'

const messages = catalog as Message[]

function getMessageBody(messageId: string): string {
  return messages.find((m) => m.id === messageId)?.body ?? '…'
}

export default function HistoryScreen() {
  const [saved, setSaved] = useState<SavedMessage[]>([])

  useFocusEffect(
    useCallback(() => {
      getSavedMessages().then(setSaved)
    }, [])
  )

  async function handleDelete(id: string) {
    await deleteSavedMessage(id)
    setSaved((prev) => prev.filter((m) => m.id !== id))
  }

  if (saved.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text style={{ fontSize: 32, marginBottom: 16 }}>✉</Text>
        <Text
          className="text-text-secondary text-base text-center"
          style={{ fontFamily: 'DMSans_400Regular' }}
        >
          Your saved notes will appear here.
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-14 pb-4">
        <Text
          className="text-text-primary text-2xl"
          style={{ fontFamily: 'DMSans_500Medium' }}
        >
          Saved
        </Text>
      </View>

      <FlatList
        data={saved}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, gap: 12 }}
        renderItem={({ item }) => (
          <View
            className="bg-surface rounded-2xl p-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              className="text-text-primary leading-7 mb-3"
              style={{ fontFamily: 'Lora_400Regular', fontSize: 16 }}
            >
              {getMessageBody(item.messageId)}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text
                className="text-text-secondary text-xs"
                style={{ fontFamily: 'DMSans_400Regular' }}
              >
                {new Date(item.savedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Pressable onPress={() => handleDelete(item.id)} className="active:opacity-60 p-1">
                <Text
                  className="text-text-secondary text-xs"
                  style={{ fontFamily: 'DMSans_400Regular' }}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  )
}
