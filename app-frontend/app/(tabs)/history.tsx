import { View, Text, FlatList, Pressable, Share } from 'react-native'
import { useCallback, useState } from 'react'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import { getSavedMessages, deleteSavedMessage, getSettings } from '@/storage/storage'
import type { SavedMessage, Message, EmotionId, AppSettings } from '@/types'
import catalog from '@/messages/catalog.json'
import { EMOTIONS } from '@/constants/emotions'
import TourTooltip from '@/components/TourTooltip'

const messages = catalog as Message[]

const EMOTION_COLORS: Record<EmotionId, string> = {
  stressed: '#E8A598',
  tired: '#C5B8D4',
  sad: '#B0BEC5',
  neutral: '#D4C5B0',
  good: '#A8C5A0',
}

function getMessage(messageId: string): { body: string; reference?: string } {
  const msg = messages.find((m) => m.id === messageId)
  return { body: msg?.body ?? '…', reference: msg?.reference }
}

export default function HistoryScreen() {
  const { tourStep } = useLocalSearchParams<{ tourStep?: string }>()
  const [saved, setSaved] = useState<SavedMessage[]>([])
  const [expandedLetter, setExpandedLetter] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(tourStep === '4')
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useFocusEffect(
    useCallback(() => {
      getSavedMessages().then(setSaved)
      getSettings().then(setSettings)
    }, [])
  )

  const userName = settings?.name?.trim() || 'friend'

  async function handleDelete(id: string) {
    await deleteSavedMessage(id)
    setSaved((prev) => prev.filter((m) => m.id !== id))
  }

  async function handleShare(messageId: string, letter?: string) {
    const { body, reference } = getMessage(messageId)
    const ref = reference ? ` — ${reference}` : ''
    const letterPart = letter ? `\n\n${letter}\n\nWith you in this.` : ''
    try {
      await Share.share({
        message: `"${body}"${ref}${letterPart}\n\nvia Soft Landing`,
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
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, gap: 16 }}
        renderItem={({ item }) => {
          const { body, reference } = getMessage(item.messageId)
          const emotionColor = item.emotionId ? EMOTION_COLORS[item.emotionId] : undefined
          const isLetterExpanded = expandedLetter === item.id

          return (
            <View
              className="bg-surface rounded-2xl p-5"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
                marginBottom: 16,
              }}
            >
              {/* Emotion dot + reference row with date at top-right */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                {emotionColor ? (
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: emotionColor,
                    }}
                  />
                ) : null}
                {reference ? (
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: '#C4956A',
                      letterSpacing: 0.3,
                      flex: 1,
                    }}
                  >
                    {reference}
                  </Text>
                ) : <View style={{ flex: 1 }} />}
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: '#C4956A',
                  }}
                >
                  {new Date(item.savedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              <Text
                className="text-text-primary leading-7 mb-1"
                style={{ fontFamily: 'Lora_400Regular', fontSize: 16, marginBottom: 10 }}
              >
                {body}
              </Text>

              {/* Letter section */}
              {item.letter ? (
                <Pressable
                  onPress={() => setExpandedLetter(isLetterExpanded ? null : item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={isLetterExpanded ? 'Collapse letter' : 'Read your letter'}
                  style={{ marginBottom: 12 }}
                >
                  {isLetterExpanded ? (
                    <View
                      style={{
                        backgroundColor: '#F5F0E8',
                        borderRadius: 10,
                        padding: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Lora_400Regular_Italic',
                          fontSize: 13,
                          color: '#C4956A',
                          marginBottom: 8,
                        }}
                      >
                        Dear {userName},
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Lora_400Regular',
                          fontSize: 14,
                          color: '#3D2F2A',
                          lineHeight: 22,
                        }}
                      >
                        {item.letter}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Lora_400Regular_Italic',
                          fontSize: 13,
                          color: '#9A8F82',
                          marginTop: 10,
                        }}
                      >
                        With you in this.
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          fontSize: 10,
                          color: '#C4B59A',
                          marginTop: 8,
                        }}
                      >
                        Written by AI for spiritual encouragement only.
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontFamily: 'Lora_400Regular_Italic',
                        fontSize: 13,
                        color: '#A09080',
                      }}
                      numberOfLines={2}
                    >
                      {(() => {
                        const text = item.letter
                        const match = text.match(/^.+?[.!?](?=\s|$)/)
                        if (match && match[0].length <= 120) return match[0]
                        return text.slice(0, 100) + '…'
                      })()}{"  "}
                      <Text style={{ color: '#C4956A' }}>Read your letter →</Text>
                    </Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/check-in/letter-compose',
                      params: { savedMessageId: item.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Write a letter for this verse"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1,
                    marginBottom: 12,
                    alignSelf: 'flex-start',
                  })}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: '#C4956A',
                    }}
                  >
                    Write a letter →
                  </Text>
                </Pressable>
              )}

              <View className="flex-row items-center justify-end">
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                  <Pressable
                    onPress={() => handleShare(item.messageId, item.letter)}
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

      {showTooltip && (
        <TourTooltip
          text="Everything you save lives here — your own collection of verses, whenever you need them."
          buttonLabel="Next →"
          onDismiss={() => {
            setShowTooltip(false)
            router.replace({ pathname: '/(tabs)', params: { tourStep: '5' } })
          }}
        />
      )}
    </View>
  )
}
