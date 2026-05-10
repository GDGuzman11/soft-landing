import { View, Text, FlatList, Pressable, Share, Alert, Animated } from 'react-native'
import { useCallback, useRef, useState } from 'react'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { getSavedMessages, deleteSavedMessage, getSettings } from '@/storage/storage'
import type { SavedMessage, Message, EmotionId, AppSettings } from '@/types'
import TourTooltip from '@/components/TourTooltip'
import { useTheme } from '@/theme'

const EMOTION_COLORS: Record<EmotionId, string> = {
  stressed: '#C97B5A',
  tired: '#9C8FB5',
  sad: '#7A95B0',
  neutral: '#C4B59A',
  good: '#9CB59A',
}

interface ResolvedSavedMessage {
  saved: SavedMessage
  body: string
  reference: string
}

async function lookupVerse(
  messageId: string,
  emotionId: string
): Promise<{ body: string; reference: string }> {
  try {
    const cached = await AsyncStorage.getItem(`@soft_landing/verse_pool/${emotionId}`)
    if (cached) {
      const pool: { fetchedAt: string; verses: Message[] } = JSON.parse(cached)
      const msg = pool.verses.find((v) => v.id === messageId)
      if (msg) return { body: msg.body, reference: msg.reference ?? '' }
    }
  } catch {}
  return { body: '', reference: '' }
}

export default function HistoryScreen() {
  const { colors } = useTheme()
  const { tourStep } = useLocalSearchParams<{ tourStep?: string }>()
  const [resolved, setResolved] = useState<ResolvedSavedMessage[]>([])
  const [expandedLetter, setExpandedLetter] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(tourStep === '4')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const animRefs = useRef<Map<string, Animated.Value>>(new Map())

  function getAnim(id: string): Animated.Value {
    if (!animRefs.current.has(id)) {
      animRefs.current.set(id, new Animated.Value(0))
    }
    return animRefs.current.get(id)!
  }

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        const [all, s] = await Promise.all([getSavedMessages(), getSettings()])
        if (cancelled) return
        setSettings(s)
        const withVerses = await Promise.all(
          all.map(async (saved) => {
            const emotionId = saved.emotionId ?? 'neutral'
            const { body, reference } = await lookupVerse(saved.messageId, emotionId)
            return { saved, body, reference }
          })
        )
        if (cancelled) return
        setResolved(withVerses)
      })()
      return () => {
        cancelled = true
      }
    }, [])
  )

  const userName = settings?.name?.trim() || 'friend'

  async function handleDelete(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await deleteSavedMessage(id)
    setResolved((prev) => prev.filter((r) => r.saved.id !== id))
  }

  function confirmDelete(id: string) {
    Alert.alert(
      'Remove verse?',
      'This will permanently remove it from your saved collection.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => handleDelete(id) },
      ]
    )
  }

  async function handleShare(body: string, reference: string, letter?: string) {
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

  if (resolved.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 36, color: colors.amber, marginBottom: 16, opacity: 0.6 }}>✦</Text>
        <Text
          style={{ fontFamily: 'DMSans_400Regular', fontSize: 16, color: colors.inkMuted, textAlign: 'center' }}
        >
          Your saved verses will appear here.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16 }}>
        <Text
          style={{ fontFamily: 'DMSans_500Medium', fontSize: 24, color: colors.inkPrimary }}
        >
          Saved
        </Text>
      </View>

      <FlatList
        data={resolved}
        keyExtractor={(r) => r.saved.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, gap: 16 }}
        renderItem={({ item: r }) => {
          const item = r.saved
          const { body, reference } = r
          const emotionColor = item.emotionId ? EMOTION_COLORS[item.emotionId] : undefined
          const isLetterExpanded = expandedLetter === item.id

          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
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

              {body ? (
                <Text
                  style={{ fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 28, marginBottom: 10, color: colors.inkPrimary }}
                >
                  {body}
                </Text>
              ) : null}

              {/* Letter section */}
              {item.letter ? (
                <Pressable
                  onPress={() => {
                    const nextExpanded = isLetterExpanded ? null : item.id
                    setExpandedLetter(nextExpanded)
                    const anim = getAnim(item.id)
                    Animated.timing(anim, {
                      toValue: nextExpanded === item.id ? 1 : 0,
                      duration: 200,
                      useNativeDriver: true,
                    }).start()
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isLetterExpanded ? 'Collapse letter' : 'Read your letter'}
                  style={{ marginBottom: 12 }}
                >
                  {isLetterExpanded ? (
                    <Animated.View style={{ opacity: getAnim(item.id) }}>
                      <View
                        style={{
                          backgroundColor: colors.inputRow,
                          borderRadius: 10,
                          padding: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Lora_400Regular_Italic',
                            fontSize: 13,
                            color: colors.amber,
                            marginBottom: 8,
                          }}
                        >
                          Dear {userName},
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Lora_400Regular',
                            fontSize: 14,
                            color: colors.inkPrimary,
                            lineHeight: 22,
                          }}
                        >
                          {item.letter}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Lora_400Regular_Italic',
                            fontSize: 13,
                            color: colors.inkMuted,
                            marginTop: 10,
                          }}
                        >
                          With you in this.
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'DMSans_400Regular',
                            fontSize: 12,
                            color: colors.inkSubtle,
                            marginTop: 8,
                          }}
                        >
                          Written by AI for spiritual encouragement only.
                        </Text>
                      </View>
                    </Animated.View>
                  ) : (
                    <Text
                      style={{
                        fontFamily: 'Lora_400Regular_Italic',
                        fontSize: 13,
                        color: colors.inkMuted,
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
                    onPress={() => handleShare(body, reference, item.letter)}
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
                    onPress={() => confirmDelete(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="active:opacity-60"
                  >
                    <Text
                      style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.inkMuted }}
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
