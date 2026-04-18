import { View, Text, FlatList, Pressable, Share } from 'react-native'
import { useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { useState } from 'react'
import { getSavedMessages, deleteSavedMessage } from '@/storage/storage'
import type { SavedMessage, Message } from '@/types'
import catalog from '@/messages/catalog.json'

const messages = catalog as Message[]

function getMessage(messageId: string): { body: string; reference?: string } {
  const msg = messages.find((m) => m.id === messageId)
  return { body: msg?.body ?? '…', reference: msg?.reference }
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

  async function handleShare(messageId: string) {
    const { body, reference } = getMessage(messageId)
    const ref = reference ? ` — ${reference}` : ''
    try {
      await Share.share({
        message: `"${body}"${ref}\n\nvia Soft Landing`,
      })
    } catch {
      // user dismissed
    }
  }

  if (saved.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text style={{ fontSize: 32, marginBottom: 16 }}>✉</Text>
        <Text
          className="text-text-secondary text-base text-center"
          style={{ fontFamily: 'DMSans_400Regular' }}
        >
          Your saved verses will appear here.
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
        renderItem={({ item }) => {
          const { body, reference } = getMessage(item.messageId)
          return (
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
                className="text-text-primary leading-7 mb-1"
                style={{ fontFamily: 'Lora_400Regular', fontSize: 16 }}
              >
                {body}
              </Text>

              {reference ? (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: '#C4956A',
                    letterSpacing: 0.3,
                    marginBottom: 12,
                  }}
                >
                  {reference}
                </Text>
              ) : (
                <View style={{ height: 12 }} />
              )}

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

                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                  {/* Share */}
                  <Pressable
                    onPress={() => handleShare(item.messageId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="active:opacity-60"
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: '#C4956A',
                      }}
                    >
                      Share ↑
                    </Text>
                  </Pressable>

                  {/* Remove */}
                  <Pressable
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="active:opacity-60"
                  >
                    <Text
                      className="text-text-secondary text-xs"
                      style={{ fontFamily: 'DMSans_400Regular' }}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}
