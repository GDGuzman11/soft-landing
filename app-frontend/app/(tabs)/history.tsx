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
import {
  startOfWeek,
  addDays,
  buildMonthSlots,
  buildWeekSlots,
  formatMonthLabel,
} from '@/utils/calendarMath'
import type { SavedMessage, Message, EmotionId, AppSettings, CheckInEvent } from '@/types'
import TourTooltip from '@/components/TourTooltip'
import PositionedTooltip from '@/components/PositionedTooltip'
import VerseShareCard from '@/components/VerseShareCard'
import ShareFormatSheet from '@/components/ShareFormatSheet'
import ViewToggle from '@/components/history/ViewToggle'
import MonthGrid from '@/components/history/MonthGrid'
import WeekRow from '@/components/history/WeekRow'
import EchoesPanel from '@/components/history/EchoesPanel'
import { auth } from '@/services/firebase'
import app from '@/services/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useTheme } from '@/theme'

const EMOTION_COLORS: Record<EmotionId, string> = {
  stressed: '#C97B5A',
  tired:    '#9C8FB5',
  sad:      '#7A95B0',
  neutral:  '#C4B59A',
  good:     '#9CB59A',
}

// Tile palette — parallel to EMOTION_COLORS but neutral is a warm gray for calendar tiles.
const TILE_COLORS: Record<EmotionId, string> = {
  good:     '#9CB59A', // sage
  neutral:  '#B0ABA6', // warm gray (tiles only)
  stressed: '#C97B5A', // clay
  tired:    '#9C8FB5', // lavender
  sad:      '#7A95B0', // slate
}
const TILE_EMPTY = '#FAF8F5'

const POSITIVE_EMOTIONS: ReadonlyArray<EmotionId> = ['good']
const NEGATIVE_EMOTIONS: ReadonlyArray<EmotionId> = ['stressed', 'tired', 'sad']

function dominantTileColor(checkInsForDay: CheckInEvent[]): string {
  if (!checkInsForDay.length) return TILE_EMPTY
  const positiveCount = checkInsForDay.filter(c =>
    POSITIVE_EMOTIONS.includes(c.emotionId as EmotionId)
  ).length
  const negativeCount = checkInsForDay.filter(c =>
    NEGATIVE_EMOTIONS.includes(c.emotionId as EmotionId)
  ).length

  if (positiveCount === 0 && negativeCount === 0) return TILE_COLORS.neutral // only neutrals
  if (positiveCount > negativeCount) return TILE_COLORS.good
  if (negativeCount > positiveCount) {
    const negCounts: Partial<Record<EmotionId, number>> = {}
    checkInsForDay
      .filter(c => NEGATIVE_EMOTIONS.includes(c.emotionId as EmotionId))
      .forEach(c => {
        const id = c.emotionId as EmotionId
        negCounts[id] = (negCounts[id] ?? 0) + 1
      })
    const sorted = Object.entries(negCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    const dominant = sorted[0]?.[0] as EmotionId | undefined
    return dominant ? TILE_COLORS[dominant] : TILE_COLORS.neutral
  }
  return TILE_COLORS.neutral // tied
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
  const { tourStep, openDate } = useLocalSearchParams<{ tourStep?: string; openDate?: string }>()
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
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [shareSheetVerse, setShareSheetVerse] = useState<ResolvedSavedMessage | null>(null)

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

  // Calendar state
  const today = new Date().toISOString().slice(0, 10)
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('monthly')
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [viewWeekStart, setViewWeekStart] = useState<string>(() => startOfWeek(today))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const [throughLines, setThroughLines] = useState<Record<string, string>>({})

  // Signup date floor — clamp calendar to months on/after signup
  const signupDate = useMemo(() => {
    const ct = auth.currentUser?.metadata?.creationTime
    if (ct) {
      const d = new Date(ct)
      return { year: d.getFullYear(), month: d.getMonth() }
    }
    return { year: new Date().getFullYear(), month: 0 } // guests: Jan this year
  }, [])

  const todayObj = new Date()
  const isPrevMonthDisabled =
    viewMonth.year === signupDate.year && viewMonth.month === signupDate.month
  const isNextMonthDisabled =
    viewMonth.year === todayObj.getFullYear() && viewMonth.month === todayObj.getMonth()
  const signupWeekStart = startOfWeek(
    `${signupDate.year}-${String(signupDate.month + 1).padStart(2, '0')}-01`
  )
  const isPrevWeekDisabled = viewWeekStart <= signupWeekStart
  const isNextWeekDisabled = viewWeekStart >= startOfWeek(today)

  // Deep-link from Mirror Days: jump to a specific date
  useEffect(() => {
    if (!openDate) return
    setSelectedDay(openDate)
    const d = new Date(openDate + 'T00:00:00')
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() })
  }, [openDate])

  // Through-Line: fetch for past completed months
  useEffect(() => {
    if (viewMode !== 'monthly') return
    const isPastMonth =
      viewMonth.year < todayObj.getFullYear() ||
      (viewMonth.year === todayObj.getFullYear() && viewMonth.month < todayObj.getMonth())
    if (!isPastMonth) return

    const monthKey = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}`
    if (throughLines[monthKey]) return  // already loaded

    const monthCheckIns = checkIns.filter(c => c.timestamp.slice(0, 7) === monthKey)
    if (monthCheckIns.length < 3) return

    const monthVerses = resolved.filter(r => r.saved.savedAt.slice(0, 7) === monthKey)

    ;(async () => {
      const cacheKey = `@soft_landing/through_line/${monthKey}`
      try {
        const cached = await AsyncStorage.getItem(cacheKey)
        if (cached) {
          setThroughLines(prev => ({ ...prev, [monthKey]: cached }))
          return
        }
      } catch {}

      if (!auth.currentUser) return

      try {
        const fns = getFunctions(app, 'us-central1')
        const fn = httpsCallable(fns, 'generateThroughLine')
        const result = await fn({
          month: monthKey,
          checkIns: monthCheckIns.map(c => ({ date: c.timestamp.slice(0, 10), emotionId: c.emotionId })),
          verses: monthVerses.slice(0, 10).map(r => ({ body: r.body, reference: r.reference })),
        })
        const line = (result.data as { line: string }).line
        if (line) {
          setThroughLines(prev => ({ ...prev, [monthKey]: line }))
          await AsyncStorage.setItem(cacheKey, line).catch(() => {})
        }
      } catch {}
    })()
  }, [viewMode, viewMonth, checkIns, resolved])

  // Map dateStr → all check-ins that day
  const checkInsByDay = useMemo<Record<string, CheckInEvent[]>>(() => {
    const map: Record<string, CheckInEvent[]> = {}
    checkIns.forEach(c => {
      const d = c.timestamp.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d]!.push(c)
    })
    return map
  }, [checkIns])

  // Map dateStr → tile color
  const colorByDay = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    Object.entries(checkInsByDay).forEach(([date, cis]) => {
      const color = dominantTileColor(cis)
      if (color !== TILE_EMPTY) map[date] = color
    })
    return map
  }, [checkInsByDay])

  // Map dateStr → has saved letter
  const hasLetterByDay = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    resolved.forEach(r => {
      if (r.saved.letter) {
        const d = r.saved.savedAt.slice(0, 10)
        map[d] = true
      }
    })
    return map
  }, [resolved])

  const monthSlots = useMemo(
    () => buildMonthSlots(viewMonth.year, viewMonth.month),
    [viewMonth]
  )
  const weekSlots = useMemo(() => buildWeekSlots(viewWeekStart), [viewWeekStart])
  const monthLabel = useMemo(
    () => formatMonthLabel(viewMonth.year, viewMonth.month),
    [viewMonth]
  )

  // Verses filtered by selected day (tour mode always shows the demo entry).
  const filteredResolved = useMemo<ResolvedSavedMessage[]>(() => {
    if (tourPathMode) return [TOUR_DEMO_ENTRY]
    if (!selectedDay) return resolved
    return resolved.filter(r => r.saved.savedAt.slice(0, 10) === selectedDay)
  }, [selectedDay, resolved, tourPathMode])

  function handleSelectDay(date: string) {
    setSelectedDay(prev => (prev === date ? null : date))
  }

  function handlePrevMonth() {
    if (isPrevMonthDisabled) return
    setViewMonth(prev => {
      const d = new Date(prev.year, prev.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  function handleNextMonth() {
    if (isNextMonthDisabled) return
    setViewMonth(prev => {
      const d = new Date(prev.year, prev.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function handlePrevWeek() {
    if (isPrevWeekDisabled) return
    setViewWeekStart(prev => addDays(prev, -7))
  }
  function handleNextWeek() {
    if (isNextWeekDisabled) return
    setViewWeekStart(prev => addDays(prev, 7))
  }

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
    setShareSheetVerse(verse)
    setShowShareSheet(true)
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

  // Global empty state: zero saved verses ever (tour mode always has the demo entry).
  if (!tourPathMode && resolved.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 36, color: colors.amber, marginBottom: 16, opacity: 0.6 }}>✦</Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 16, color: colors.inkMuted, textAlign: 'center' }}>
          Nothing yet — but every path has a first step.
        </Text>
      </View>
    )
  }

  const ListHeader = (
    <View>
      {/* Interactive Week/Month calendar (skip in tour mode — no real data) */}
      {!tourPathMode && (
        <>
          <View style={{ paddingTop: 8, paddingBottom: 4 }}>
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            {viewMode === 'monthly' ? (
              <MonthGrid
                slots={monthSlots}
                today={today}
                colorByDay={colorByDay}
                hasLetterByDay={hasLetterByDay}
                selectedDay={selectedDay}
                onSelectDay={handleSelectDay}
                monthLabel={monthLabel}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                prevDisabled={isPrevMonthDisabled}
                nextDisabled={isNextMonthDisabled}
              />
            ) : null}

            {/* Through-Line — past completed months only */}
            {viewMode === 'monthly' && (() => {
              const monthKey = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}`
              const line = throughLines[monthKey]
              return line ? (
                <Text
                  style={{
                    fontFamily: 'Lora_400Regular_Italic',
                    fontSize: 15,
                    color: '#C4956A',
                    textAlign: 'center',
                    marginTop: 14,
                    marginHorizontal: 28,
                    lineHeight: 24,
                    opacity: 0.85,
                  }}
                >
                  {line}
                </Text>
              ) : null
            })()}

            {viewMode === 'weekly' ? (
              <WeekRow
                slots={weekSlots}
                today={today}
                colorByDay={colorByDay}
                hasLetterByDay={hasLetterByDay}
                selectedDay={selectedDay}
                onSelectDay={handleSelectDay}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                prevDisabled={isPrevWeekDisabled}
                nextDisabled={isNextWeekDisabled}
              />
            ) : null}

            {selectedDay && (
              <Text style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 13,
                color: '#9A8880',
                textAlign: 'center',
                marginTop: 12,
                marginBottom: 4,
              }}>
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            )}
          </View>

          {/* Hairline divider */}
          <View style={{ height: 1, backgroundColor: 'rgba(196,149,106,0.2)', marginHorizontal: 24, marginVertical: 20 }} />

          {/* Per-day empty state: a real day was selected but has no saved verses. */}
          {selectedDay && filteredResolved.length === 0 && (
            <Text style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: 14,
              color: '#9A8880',
              textAlign: 'center',
              paddingHorizontal: 32,
              paddingBottom: 16,
            }}>
              This day waited quietly.
            </Text>
          )}
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
        data={filteredResolved}
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

                  {/* Echoes — show when this day is selected */}
                  {selectedDay !== null && (
                    <EchoesPanel
                      messageId={item.messageId}
                      currentSavedAt={item.savedAt}
                      allEntries={resolved.map(r => ({
                        messageId: r.saved.messageId,
                        savedAt: r.saved.savedAt,
                        emotionId: r.saved.emotionId,
                      }))}
                      isPremium={settings?.subscription?.tier === 'premium'}
                    />
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

      <ShareFormatSheet
        visible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        onShareText={() => { setShowShareSheet(false); if (shareSheetVerse) handleShareText(shareSheetVerse) }}
        onShareCard={async (format) => { if (shareSheetVerse) await doShare(shareSheetVerse, format); setShowShareSheet(false) }}
      />
    </View>
  )
}
