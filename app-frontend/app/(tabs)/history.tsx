import { View, Text, FlatList, Pressable, Share, Alert, Animated } from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { captureRef } from 'react-native-view-shot'
import { getSavedMessages, deleteSavedMessage, getSettings, getCheckIns, localDayKey } from '@/storage/storage'
import { getVerseById } from '@/messages/selector'
import LetterVoiceChips, { type LetterVoiceId } from '@/components/LetterVoiceChips'
import { startSayLetterChat } from '@/components/say/startSayChat'
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
import { auth } from '@/services/firebase'
import { useTheme } from '@/theme'

const EMOTION_COLORS: Record<EmotionId, string> = {
  stressed: '#C97B5A',
  tired:    '#9C8FB5',
  sad:      '#7A95B0',
  neutral:  '#C4B59A',
  good:     '#9CB59A',
}

// Friendly, human-voiced labels for the journal card meta line.
const EMOTION_LABELS: Record<EmotionId, string> = {
  stressed: 'Feeling stressed',
  tired:    'Running low',
  sad:      'Feeling heavy',
  neutral:  'In between',
  good:     'Grateful',
}

const EMOTION_ICON: Record<EmotionId, keyof typeof Ionicons.glyphMap> = {
  stressed: 'thunderstorm-outline',
  tired:    'moon-outline',
  sad:      'rainy-outline',
  neutral:  'partly-sunny-outline',
  good:     'sunny-outline',
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

// Long date for the journal card header, e.g. "FRIDAY, OCTOBER 23".
const fmtLong = (ts: string) =>
  new Date(ts)
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase()

// The single [[highlighted line]] the letter marks — reused as the entry title.
function extractHighlight(letter?: string): string | null {
  if (!letter) return null
  const m = letter.match(/\[\[([\s\S]*?)\]\]/)
  return m?.[1]?.trim() || null
}

// Strip the [[ ]] markers so raw brackets never show in previews/expanded text.
function stripMarkers(letter: string): string {
  return letter.replace(/\[\[|\]\]/g, '')
}

function firstSentence(text: string): string {
  const trimmed = text.trim()
  const m = trimmed.match(/^[^.!?]*[.!?]/)
  return (m ? m[0] : trimmed).trim()
}

// Title for a journal entry: the highlighted line, else the letter's first
// sentence, else the verse reference.
function entryTitle(item: SavedMessage, reference: string): string {
  const highlight = extractHighlight(item.letter)
  if (highlight) return highlight
  if (item.letter) return firstSentence(stripMarkers(item.letter))
  return reference || 'A moment, saved.'
}

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
  // Primary: the bundled verse library (offline, covers all current saves).
  const v = getVerseById(messageId)
  if (v) return { body: v.body, reference: v.reference ?? '' }
  // Fallback: the legacy verse_pool cache, for letters saved before the
  // bundled-verses migration (ids there were Firestore doc ids).
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
  const [, setSettings] = useState<AppSettings | null>(null)
  const [writeLetterAnchorY, setWriteLetterAnchorY] = useState(0)
  const animRefs = useRef<Map<string, Animated.Value>>(new Map())
  const writeLetterRef = useRef<View>(null)

  // Share state
  const shareCardRef = useRef<View>(null)
  const [shareVerse, setShareVerse] = useState<ResolvedSavedMessage | null>(null)
  const [shareFormat, setShareFormat] = useState<'square' | 'portrait'>('square')
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [shareSheetVerse, setShareSheetVerse] = useState<ResolvedSavedMessage | null>(null)

  const letterGlow = useSharedValue(1)
  const letterGlowStyle = useAnimatedStyle(() => ({ opacity: letterGlow.value }))

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

  // Calendar state
  const today = localDayKey()
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly')
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [viewWeekStart, setViewWeekStart] = useState<string>(() => startOfWeek(today))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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

  // Map dateStr → all check-ins that day
  const checkInsByDay = useMemo<Record<string, CheckInEvent[]>>(() => {
    const map: Record<string, CheckInEvent[]> = {}
    checkIns.forEach(c => {
      const d = localDayKey(new Date(c.timestamp))
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
        const d = localDayKey(new Date(r.saved.savedAt))
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
    return resolved.filter(r => localDayKey(new Date(r.saved.savedAt)) === selectedDay)
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
      'Remove this page?',
      'This will permanently remove it from your journal.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => handleDelete(verse.saved.id) },
      ]
    )
  }

  async function handleShareText(verse: ResolvedSavedMessage) {
    const ref = verse.reference ? ` — ${verse.reference}` : ''
    const letter = verse.saved.letter
    const letterPart = letter ? `\n\n${stripMarkers(letter)}\n\nWith you in this.` : ''
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

  // "⋯" overflow menu on a card.
  function handleCardMenu(verse: ResolvedSavedMessage) {
    if (tourPathMode) return
    const hasLetter = !!verse.saved.letter
    const buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> = [
      { text: 'Share ↑', onPress: () => handleShareCard(verse) },
    ]
    if (hasLetter) {
      buttons.push({
        text: 'Open in editor',
        onPress: () =>
          router.push({ pathname: '/check-in/letter-compose', params: { savedMessageId: verse.saved.id } }),
      })
    }
    buttons.push({ text: 'Remove', style: 'destructive', onPress: () => confirmDelete(verse) })
    buttons.push({ text: 'Cancel', style: 'cancel' })
    Alert.alert('', 'What would you like to do?', buttons)
  }

  // Expand / collapse the full letter inline ("Turn the page").
  function toggleLetter(verse: ResolvedSavedMessage) {
    if (tourPathMode) return
    const next = expandedLetter === verse.saved.id ? null : verse.saved.id
    setExpandedLetter(next)
    Animated.timing(getAnim(verse.saved.id), {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }

  async function handlePickVoice(entry: SavedMessage, verseReference: string, personaId: LetterVoiceId) {
    if (!entry.letter) return
    try {
      const chatId = await startSayLetterChat(personaId, {
        letter: stripMarkers(entry.letter),
        reflection: entry.note?.trim() || undefined,
        emotionId: entry.emotionId ?? undefined,
        verseReference: verseReference || undefined,
      })
      router.push({ pathname: '/say/[personaId]/[chatId]', params: { personaId, chatId } })
    } catch {
      // leave the chips tappable so the user can retry
    }
  }

  // Global empty state: zero saved verses ever (tour mode always has the demo entry).
  if (!tourPathMode && resolved.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header colors={colors} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 36, color: colors.amber, marginBottom: 16, opacity: 0.6 }}>✦</Text>
          <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 16, color: colors.inkMuted, textAlign: 'center', lineHeight: 24 }}>
            Nothing yet, but every path has a first step.
          </Text>
        </View>
      </View>
    )
  }

  const ListHeader = (
    <View>
      {/* Calendar block (skip in tour mode — no real data) */}
      {!tourPathMode && (
        <View style={{ paddingTop: 4, paddingBottom: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 24,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 11,
                letterSpacing: 2,
                color: colors.inkMuted,
                textTransform: 'uppercase',
              }}
            >
              Your journal · {monthLabel}
            </Text>
            <Ionicons name="calendar-outline" size={16} color={colors.inkMuted} />
          </View>

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
          ) : (
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
          )}

          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: colors.inkMuted,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            Your moments, at your own pace.
          </Text>

          {selectedDay && (
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 13,
                color: colors.inkMuted,
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          )}
        </View>
      )}

      {/* Section header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingHorizontal: 24,
          marginTop: tourPathMode ? 8 : 24,
          marginBottom: 14,
        }}
      >
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 19, color: colors.inkPrimary }}>
          Pages from your journey
        </Text>
        {selectedDay && (
          <Pressable onPress={() => setSelectedDay(null)} hitSlop={10} className="active:opacity-60">
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.amber }}>
              View all →
            </Text>
          </Pressable>
        )}
      </View>

      {/* Per-day empty state: a real day was selected but has no saved verses. */}
      {!tourPathMode && selectedDay && filteredResolved.length === 0 && (
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 14,
            color: colors.inkMuted,
            textAlign: 'center',
            paddingHorizontal: 32,
            paddingBottom: 16,
          }}
        >
          This day waited quietly.
        </Text>
      )}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header colors={colors} />

      <FlatList
        data={filteredResolved}
        keyExtractor={(r) => r.saved.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: r, index }) => {
          const item = r.saved
          const { body, reference } = r
          const emotionId = (item.emotionId ?? 'neutral') as EmotionId
          const emotionColor = EMOTION_COLORS[emotionId] ?? '#C4B59A'
          const isLetterExpanded = expandedLetter === item.id
          const isFirstTourItem = tourPathMode && index === 0
          const title = entryTitle(item, reference)
          const letterPreview = item.letter ? stripMarkers(item.letter).trim() : ''

          return (
            <Pressable
              onLongPress={() => confirmDelete(r)}
              style={{
                marginHorizontal: 16,
                marginBottom: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.surface,
                padding: 18,
              }}
            >
              {/* Row: bookmark + date  ·  ⋯ */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="bookmark-outline" size={13} color={colors.amber} />
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 1, color: colors.inkMuted }}>
                    {fmtLong(item.savedAt)}
                  </Text>
                </View>
                {!tourPathMode && (
                  <Pressable onPress={() => handleCardMenu(r)} hitSlop={12} className="active:opacity-50">
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 18, color: colors.inkMuted, marginTop: -8 }}>⋯</Text>
                  </Pressable>
                )}
              </View>

              {/* Title */}
              <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 19, lineHeight: 27, color: colors.inkPrimary }}>
                {title}
              </Text>

              {/* Meta: emotion + reference */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <Ionicons name={EMOTION_ICON[emotionId]} size={14} color={emotionColor} />
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMuted }}>
                  {EMOTION_LABELS[emotionId]}{reference ? ` · ${reference}` : ''}
                </Text>
              </View>

              {/* The user's reflection, in their words */}
              {item.note?.trim() ? (
                <Text
                  numberOfLines={3}
                  style={{
                    fontFamily: 'Lora_400Regular_Italic',
                    fontSize: 15,
                    lineHeight: 24,
                    color: colors.inkPrimary,
                    marginTop: 14,
                  }}
                >
                  “{item.note.trim()}”
                </Text>
              ) : null}

              {/* Letter preview */}
              {item.letter ? (
                <View
                  style={{
                    backgroundColor: colors.inputRow,
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 14,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 10,
                      letterSpacing: 1.5,
                      color: colors.inkMuted,
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Something to hold onto
                  </Text>
                  {isLetterExpanded ? (
                    <Animated.View style={{ opacity: getAnim(item.id) }}>
                      <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 13, color: colors.amber, marginBottom: 8 }}>
                        Dear You,
                      </Text>
                      <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 14, color: colors.inkPrimary, lineHeight: 23 }}>
                        {letterPreview}
                      </Text>
                      <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 13, color: colors.inkMuted, marginTop: 10 }}>
                        With you in this.
                      </Text>
                      <LetterVoiceChips onPick={(pid) => handlePickVoice(item, reference, pid)} />
                    </Animated.View>
                  ) : (
                    <Text
                      numberOfLines={2}
                      style={{ fontFamily: 'Lora_400Regular', fontSize: 14, color: colors.inkPrimary, lineHeight: 23 }}
                    >
                      {letterPreview}
                    </Text>
                  )}
                </View>
              ) : null}

              {/* Footer action */}
              {item.letter ? (
                <Pressable
                  onPress={() => toggleLetter(r)}
                  hitSlop={10}
                  className="active:opacity-60"
                  style={{ alignSelf: 'flex-end', marginTop: 14 }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.amber }}>
                    {isLetterExpanded ? 'Close the page ↑' : 'Turn the page →'}
                  </Text>
                </Pressable>
              ) : (
                <View
                  ref={isFirstTourItem ? writeLetterRef : undefined}
                  style={{ alignSelf: 'flex-start', marginTop: 14 }}
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
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.amber }}>
                        Write a letter →
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Pressable>
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

function Header({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 28, color: colors.inkPrimary }}>
          The Path
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMuted, marginTop: 3 }}>
          A journal of your becoming.
        </Text>
      </View>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.headerBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="book-outline" size={18} color={colors.amber} />
      </View>
    </View>
  )
}
