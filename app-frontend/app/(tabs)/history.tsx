import { View, Text, FlatList, Pressable, Share, Alert, Animated } from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { captureRef } from 'react-native-view-shot'
import { getSavedMessages, deleteSavedMessage, getSettings, getCheckIns } from '@/storage/storage'
import { hasTodayCheckIn } from '@/utils/streak'
import type { SavedMessage, Message, EmotionId, AppSettings, CheckInEvent } from '@/types'
import TourTooltip from '@/components/TourTooltip'
import PositionedTooltip from '@/components/PositionedTooltip'
import VerseShareCard from '@/components/VerseShareCard'
import { useTheme } from '@/theme'

const EMOTION_COLORS: Record<EmotionId, string> = {
  stressed: '#C97B5A',
  tired:    '#9C8FB5',
  sad:      '#7A95B0',
  neutral:  '#C4B59A',
  good:     '#9CB59A',
}

const INSIGHT_TEXT: Record<string, string> = {
  stressed: 'A heavy stretch lately. The verses you saved know why.',
  tired:    "You've been carrying a lot. Keep coming back.",
  sad:      'Some heavy days lately. Your saved verses are here.',
  neutral:  "You've been steady. That's its own kind of strength.",
  good:     "You've been finding peace lately.",
}

const fmt = (ts: string) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

interface ResolvedSavedMessage {
  saved: SavedMessage
  body: string
  reference: string
}

// Hardcoded demo entry for the "How it Works" tour — no real save needed
const TOUR_DEMO_ENTRY: ResolvedSavedMessage = {
  saved: {
    id: 'tour-demo',
    messageId: 'tour-demo',
    emotionId: 'good' as EmotionId,
    savedAt: new Date().toISOString(),
    note: undefined,
    letter: undefined,
  } as SavedMessage,
  body: 'Come to me, all who are weary and burdened, and I will give you rest.',
  reference: 'Matthew 11:28 (NIV)',
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
  const tourPathMode = tourStep === 'path'

  const [resolved, setResolved] = useState<ResolvedSavedMessage[]>([])
  const [checkIns, setCheckIns] = useState<CheckInEvent[]>([])
  const [expandedLetter, setExpandedLetter] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(tourStep === '4')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [todayDone, setTodayDone] = useState(false)
  const [writeLetterAnchorY, setWriteLetterAnchorY] = useState(0)
  const animRefs = useRef<Map<string, Animated.Value>>(new Map())
  const writeLetterRef = useRef<View>(null)

  // Share state
  const shareCardRef = useRef<View>(null)
  const [shareVerse, setShareVerse] = useState<ResolvedSavedMessage | null>(null)
  const [shareFormat, setShareFormat] = useState<'square' | 'portrait'>('square')

  const pulseOpacity = useSharedValue(0.25)
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }))

  const letterGlow = useSharedValue(1)
  const letterGlowStyle = useAnimatedStyle(() => ({ opacity: letterGlow.value }))

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 1800 }),
        withTiming(0.2,  { duration: 1800 }),
      ),
      -1,
      true,
    )
  }, [pulseOpacity])

  useEffect(() => {
    if (!tourPathMode) return
    letterGlow.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 550 }),
        withTiming(1, { duration: 550 }),
      ),
      -1,
      false,
    )
    const t = setTimeout(() => {
      writeLetterRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
        setWriteLetterAnchorY(pageY)
      })
    }, 200)
    return () => clearTimeout(t)
  }, [])

  function getAnim(id: string): Animated.Value {
    if (!animRefs.current.has(id)) {
      animRefs.current.set(id, new Animated.Value(0))
    }
    return animRefs.current.get(id)!
  }

  useFocusEffect(
    useCallback(() => {
      if (tourPathMode) return  // demo data is injected statically, skip storage load
      let cancelled = false
      ;(async () => {
        const [all, s, ci] = await Promise.all([
          getSavedMessages(),
          getSettings(),
          getCheckIns(),
        ])
        if (cancelled) return
        setSettings(s)
        setCheckIns(ci)
        setTodayDone(hasTodayCheckIn(ci))
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

  // Build array of 28 entries (index 0 = 27 days ago, index 27 = today)
  const last28 = useMemo<(string | null)[]>(() => {
    const result: (string | null)[] = []
    for (let i = 27; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const hit = checkIns
        .filter(c => c.timestamp.slice(0, 10) === dateStr)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
      result.push(hit?.emotionId ?? null)
    }
    return result
  }, [checkIns])

  // Dominant emotion in last 14 days
  const dominant = useMemo<string | null>(() => {
    const counts: Record<string, number> = {}
    last28.slice(14).forEach(e => { if (e) counts[e] = (counts[e] ?? 0) + 1 })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (!sorted.length) return null
    const first = sorted[0]
    const second = sorted[1]
    if (!first) return null
    if (second && first[1] === second[1]) return null
    return first[0]
  }, [last28])

  async function handleDelete(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await deleteSavedMessage(id)
    setResolved((prev) => prev.filter((r) => r.saved.id !== id))
  }

  function confirmDelete(verse: ResolvedSavedMessage) {
    Alert.alert(
      'Remove verse?',
      'This will permanently remove it from your saved collection.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => handleDelete(verse.saved.id) },
      ]
    )
  }

  async function handleShareText(verse: ResolvedSavedMessage) {
    const ref = verse.reference ? ` — ${verse.reference}` : ''
    const letter = verse.saved.letter
    const letterPart = letter ? `\n\n${letter}\n\nWith you in this.` : ''
    try {
      await Share.share({
        message: `"${verse.body}"${ref}${letterPart}\n\nvia Soft Landing`,
      })
    } catch {
      // user dismissed
    }
  }

  function handleShareCard(verse: ResolvedSavedMessage) {
    Alert.alert('Share as', '', [
      { text: 'Square (1:1)', onPress: () => doShare(verse, 'square') },
      { text: 'Portrait (4:5)', onPress: () => doShare(verse, 'portrait') },
      { text: 'Share text', onPress: () => handleShareText(verse) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function doShare(verse: ResolvedSavedMessage, format: 'square' | 'portrait') {
    setShareVerse(verse)
    setShareFormat(format)
    await new Promise<void>(r => setTimeout(r, 150))
    try {
      const uri = await captureRef(shareCardRef, { format: 'jpg', quality: 0.95 })
      await Share.share({ url: uri })
    } catch (e) {
      console.warn('Share failed', e)
    }
  }

  function handleCardTap(verse: ResolvedSavedMessage) {
    if (tourPathMode) return  // don't pop alerts in tour mode
    const hasLetter = !!verse.saved.letter
    if (hasLetter) {
      Alert.alert('', 'What would you like to open?', [
        {
          text: 'Read letter ✦',
          onPress: () => {
            const next = expandedLetter === verse.saved.id ? null : verse.saved.id
            setExpandedLetter(next)
            const anim = getAnim(verse.saved.id)
            Animated.timing(anim, {
              toValue: next === verse.saved.id ? 1 : 0,
              duration: 200,
              useNativeDriver: true,
            }).start()
          },
        },
        { text: 'Open letter editor', onPress: () =>
            router.push({ pathname: '/check-in/letter-compose', params: { savedMessageId: verse.saved.id } })
        },
        { text: 'Share card ↑', onPress: () => handleShareCard(verse) },
        { text: 'Cancel', style: 'cancel' },
      ])
    } else {
      handleShareCard(verse)
    }
  }

  const listData = tourPathMode ? [TOUR_DEMO_ENTRY] : resolved

  if (listData.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 36, color: colors.amber, marginBottom: 16, opacity: 0.6 }}>✦</Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 16, color: colors.inkMuted, textAlign: 'center' }}>
          Your saved verses will appear here.
        </Text>
      </View>
    )
  }

  const ListHeader = (
    <View>
      {/* 28-day emotion grid (skip in tour mode — no real data) */}
      {!tourPathMode && (
        <>
          <View style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 4 }}>
            {[0,1,2,3].map(row => (
              <View key={row} style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 6 }}>
                {[0,1,2,3,4,5,6].map(col => {
                  const idx = row * 7 + col
                  const emotion = last28[idx]
                  return (
                    <View
                      key={col}
                      style={{
                        width: 8, height: 8, borderRadius: 4, marginHorizontal: 3,
                        backgroundColor: emotion ? (EMOTION_COLORS[emotion as EmotionId] ?? 'transparent') : 'transparent',
                        borderWidth: emotion ? 0 : 1,
                        borderColor: 'rgba(196,149,106,0.25)',
                      }}
                    />
                  )
                })}
              </View>
            ))}

            {dominant && (
              <Text style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 13,
                color: '#9A8880',
                textAlign: 'center',
                marginTop: 12,
                paddingHorizontal: 16,
              }}>
                {INSIGHT_TEXT[dominant]}
              </Text>
            )}
          </View>

          {/* Hairline divider */}
          <View style={{ height: 1, backgroundColor: 'rgba(196,149,106,0.2)', marginHorizontal: 24, marginVertical: 20 }} />
        </>
      )}

      {/* Unlit ◇ — next milestone header */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, marginBottom: 8, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 10, color: colors.amber, opacity: 0.5, marginRight: 6 }}>
          {todayDone ? 'tomorrow' : 'today'}
        </Text>
        <ReAnimated.Text style={[{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.amber }, pulseStyle]}>
          ◇
        </ReAnimated.Text>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8 }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 24, color: colors.inkPrimary }}>
          The Path
        </Text>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(r) => r.saved.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item: r, index }) => {
          const item = r.saved
          const { body, reference } = r
          const emotionId = (item.emotionId ?? 'neutral') as EmotionId
          const emotionColor = EMOTION_COLORS[emotionId] ?? '#C4B59A'
          const isLetterExpanded = expandedLetter === item.id
          const isFirstTourItem = tourPathMode && index === 0

          return (
            <View>
              <Pressable
                onLongPress={() => confirmDelete(r)}
                onPress={() => handleCardTap(r)}
                style={{
                  flexDirection: 'row',
                  marginHorizontal: 16,
                  marginBottom: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  backgroundColor: '#FAF8F5',
                  overflow: 'hidden',
                }}
              >
                {/* Left color strip */}
                <View style={{
                  width: 3,
                  backgroundColor: emotionColor,
                  alignSelf: 'stretch',
                }} />

                {/* Content */}
                <View style={{ flex: 1, padding: 16 }}>
                  {/* Row 1: emotion + date */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{
                      fontFamily: 'DMSans_400Regular', fontSize: 11,
                      color: emotionColor,
                    }}>
                      {emotionId}
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#9A8880' }}>
                      {fmt(item.savedAt)}
                    </Text>
                  </View>

                  {/* Verse text — 2 line truncation */}
                  {body ? (
                    <Text
                      numberOfLines={2}
                      style={{
                        fontFamily: 'Lora_400Regular_Italic', fontSize: 16, lineHeight: 26,
                        color: '#3D2F2A', marginBottom: 12,
                      }}
                    >
                      {body}
                    </Text>
                  ) : null}

                  {/* Row 2: reference + letter tag */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#9A8880' }}>
                      {reference}
                    </Text>
                    {!!item.letter && (
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#C4956A' }}>
                        ✦ Letter
                      </Text>
                    )}
                  </View>

                  {/* Expanded letter preview (inline, controlled by handleCardTap) */}
                  {isLetterExpanded && !!item.letter && (
                    <Animated.View style={{ opacity: getAnim(item.id), marginTop: 12 }}>
                      <View style={{ backgroundColor: colors.inputRow, borderRadius: 10, padding: 16 }}>
                        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 13, color: colors.amber, marginBottom: 8 }}>
                          Dear {userName},
                        </Text>
                        <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 14, color: colors.inkPrimary, lineHeight: 22 }}>
                          {item.letter}
                        </Text>
                        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 13, color: colors.inkMuted, marginTop: 10 }}>
                          With you in this.
                        </Text>
                        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.inkSubtle, marginTop: 8 }}>
                          Written by AI for spiritual encouragement only.
                        </Text>
                      </View>
                    </Animated.View>
                  )}

                  {/* "Write a letter →" — only if NO letter */}
                  {!item.letter && (
                    <View
                      ref={isFirstTourItem ? writeLetterRef : undefined}
                      style={{ marginTop: 12, alignSelf: 'flex-start' }}
                    >
                      {isFirstTourItem ? (
                        <ReAnimated.View style={letterGlowStyle}>
                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: '/check-in/letter-compose',
                                params: { savedMessageId: item.id, tourMode: 'true' },
                              })
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Write a letter for this verse"
                            style={({ pressed }) => ({
                              backgroundColor: colors.amber,
                              borderRadius: 20,
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#FFFFFF' }}>
                              Write a letter →
                            </Text>
                          </Pressable>
                        </ReAnimated.View>
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
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                        >
                          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#9A8880' }}>
                            Write a letter →
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          )
        }}
      />

      {/* Tour: path mode — bubble above Write a letter, no dismiss button */}
      {tourPathMode && writeLetterAnchorY > 0 && (
        <PositionedTooltip
          text="Tap 'Write a letter' to watch AI craft a personal letter from your verse."
          buttonLabel=""
          anchorY={writeLetterAnchorY}
          placement="above"
          onDismiss={() => {}}
        />
      )}

      {/* Old tour step 4 */}
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

      {/* Off-screen share card */}
      {shareVerse && (
        <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
          <VerseShareCard
            ref={shareCardRef}
            verseBody={shareVerse.body}
            reference={shareVerse.reference}
            emotionId={shareVerse.saved.emotionId ?? 'neutral'}
            format={shareFormat}
          />
        </View>
      )}
    </View>
  )
}
