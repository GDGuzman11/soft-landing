import { View, Text, Pressable, Share } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState, useRef } from 'react'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated'
import { captureRef } from 'react-native-view-shot'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bookmarkMessage, canCheckIn, performCheckIn } from '@/services/checkIn'
import { getSavedMessages } from '@/storage/storage'
import type { EmotionId } from '@/types'
import { useTheme } from '@/theme'
import PositionedTooltip from '@/components/PositionedTooltip'
import VerseShareCard from '@/components/VerseShareCard'
import ShareFormatSheet from '@/components/ShareFormatSheet'
import { logAnalyticsEvent } from '@/services/firebase'

function formatMirrorDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

const SWIPE_THRESHOLD = 110

const INDICATOR_BASE = {
  position: 'absolute' as const,
  top: '45%' as const,
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 20,
  zIndex: 5,
}

const INDICATOR_TEXT_STYLE = {
  fontFamily: 'DMSans_500Medium',
  fontSize: 14,
  color: '#FFFFFF',
} as const

const ACTION_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const

function actionPressableStyle({ pressed }: { pressed: boolean }) {
  return { opacity: pressed ? 0.5 : 1, padding: 12 }
}

interface VerseData {
  body: string
  reference: string
  checkInId: string
  messageId: string
}

export default function MessageScreen() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const { emotionId, messageBody, messageReference, checkInId, messageId, tourMode } =
    useLocalSearchParams<{
      emotionId: string
      messageBody: string
      messageReference: string
      checkInId: string
      messageId: string
      tourMode?: string
    }>()
  const isTour = tourMode === 'true'

  const [verse, setVerse] = useState<VerseData>({
    body: messageBody,
    reference: messageReference,
    checkInId,
    messageId,
  })
  const [verseIsSaved, setVerseIsSaved] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [sessionSavedIds, setSessionSavedIds] = useState<string[]>([])
  const [tourStep, setTourStep] = useState<-1 | 0 | 1 | 2>(isTour ? 0 : -1)
  const [cardTopY, setCardTopY] = useState(0)
  const [buttonsTopY, setButtonsTopY] = useState(0)
  const [mirrorDate, setMirrorDate] = useState<string | null>(null)
  const cardRef = useRef<View>(null)
  const buttonsRef = useRef<View>(null)

  // Share-as-card state
  const shareCardRef = useRef<View>(null)
  const [shareFormat, setShareFormat] = useState<'square' | 'portrait'>('square')
  const [shareReady, setShareReady] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)

  // Entrance animation
  const cardOpacity = useSharedValue(0)
  const cardY = useSharedValue(30)
  const actionsOpacity = useSharedValue(0)

  // Swipe animation
  const cardX = useSharedValue(0)
  const cardRotate = useSharedValue(0)

  // Indicator opacities
  const saveOpacity = useSharedValue(0)
  const discardOpacity = useSharedValue(0)

  // Mirror of tourStep accessible from the gesture worklet
  const tourStepSV = useSharedValue<number>(isTour ? 0 : -1)

  function setTourStepSync(next: -1 | 0 | 1 | 2) {
    setTourStep(next)
    tourStepSV.value = next
  }

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 500 })
    cardY.value = withSpring(0, { damping: 20, stiffness: 120 })
    actionsOpacity.value = withDelay(400, withTiming(1, { duration: 400 }))

    if (isTour) {
      const t = setTimeout(() => {
        cardRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
          setCardTopY(pageY)
        })
        buttonsRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
          setButtonsTopY(pageY)
        })
      }, 150)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (isTour || !emotionId) return
    const today = new Date().toISOString().slice(0, 10)
    getSavedMessages().then(saved => {
      const match = saved
        .filter(s => s.emotionId === emotionId && s.savedAt.slice(0, 10) < today)
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0]
      if (match) setMirrorDate(match.savedAt.slice(0, 10))
    })
  }, [emotionId, isTour])

  async function loadNextVerse(swipeDirection: 'right' | 'left') {
    const ok = await canCheckIn()
    if (!ok) {
      setTransitioning(false)
      router.push('/paywall')
      return
    }

    const result = await performCheckIn(emotionId as EmotionId)

    const fromX = swipeDirection === 'right' ? -350 : 350
    cardX.value = fromX
    cardRotate.value = swipeDirection === 'right' ? -5 : 5
    cardOpacity.value = 0
    saveOpacity.value = 0
    discardOpacity.value = 0

    const msg = result.message
    const useModern = !!msg.modernText && Math.random() < 0.5
    setVerse({
      body: useModern ? msg.modernText! : msg.body,
      reference: msg.reference ?? '',
      checkInId: result.event.id,
      messageId: msg.id,
    })
    setVerseIsSaved(false)
    setTransitioning(false)

    cardX.value = withDelay(40, withSpring(0, { damping: 22, stiffness: 130 }))
    cardOpacity.value = withDelay(40, withTiming(1, { duration: 280 }))
    cardRotate.value = withDelay(40, withSpring(0, { damping: 20, stiffness: 150 }))
    actionsOpacity.value = withDelay(200, withTiming(1, { duration: 300 }))
  }

  // Tour left swipe: animate card back, lock to step 2 (only right swipe allowed after)
  function handleTourSwipeLeft() {
    setTourStepSync(2)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    cardX.value = 350
    cardRotate.value = 5
    cardOpacity.value = 0
    discardOpacity.value = 0

    cardX.value = withDelay(40, withSpring(0, { damping: 22, stiffness: 130 }))
    cardOpacity.value = withDelay(40, withTiming(1, { duration: 280 }))
    cardRotate.value = withDelay(40, withSpring(0, { damping: 20, stiffness: 150 }))
    actionsOpacity.value = withDelay(200, withTiming(1, { duration: 300 }))
    setTransitioning(false)
  }

  // Tour right swipe: navigate to tabs with path indicator
  function handleTourSwipeRight() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.replace({ pathname: '/(tabs)', params: { tourStep: 'path' } })
  }

  function navigateDone() {
    if (isTour) {
      router.replace('/welcome')
      return
    }
    if (sessionSavedIds.length > 0) {
      router.replace({
        pathname: '/check-in/session-summary',
        params: { ids: sessionSavedIds.join(',') },
      })
    } else {
      router.replace('/(tabs)')
    }
  }

  async function handleSaveAndNext() {
    if (!verseIsSaved) {
      const saved = await bookmarkMessage(verse.checkInId, verse.messageId, {
        emotionId: emotionId as EmotionId,
      })
      setSessionSavedIds((prev) => [...prev, saved.id])
      setVerseIsSaved(true)
      logAnalyticsEvent('verse_saved', { emotion: emotionId })
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await loadNextVerse('right')
  }

  function handleDiscardAndNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    loadNextVerse('left')
  }

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (transitioning) return
      // Tour step 0: block all dragging
      if (tourStepSV.value === 0) return
      // Tour step 2: left swipe locked — only allow right drag
      if (tourStepSV.value === 2) {
        if (e.translationX > 0) {
          cardX.value = e.translationX
          cardRotate.value = e.translationX * 0.055
          saveOpacity.value = Math.min(e.translationX / SWIPE_THRESHOLD, 1)
        }
        return
      }
      // Tour step 1: allow both directions
      if (tourStepSV.value === 1) {
        cardX.value = e.translationX
        cardRotate.value = e.translationX * 0.055
        const progress = Math.abs(e.translationX) / SWIPE_THRESHOLD
        if (e.translationX > 0) {
          saveOpacity.value = Math.min(progress, 1)
          discardOpacity.value = 0
        } else {
          discardOpacity.value = Math.min(progress, 1)
          saveOpacity.value = 0
        }
        return
      }
      // Non-tour
      cardX.value = e.translationX
      cardRotate.value = e.translationX * 0.055
      const progress = Math.abs(e.translationX) / SWIPE_THRESHOLD
      if (e.translationX > 0) {
        saveOpacity.value = Math.min(progress, 1)
        discardOpacity.value = 0
      } else {
        discardOpacity.value = Math.min(progress, 1)
        saveOpacity.value = 0
      }
    })
    .onEnd((e) => {
      if (transitioning) return

      // Tour step 0: no swipes
      if (tourStepSV.value === 0) return

      // Tour step 2: only right swipe proceeds, left swipe snaps back
      if (tourStepSV.value === 2) {
        if (e.translationX > SWIPE_THRESHOLD) {
          runOnJS(setTransitioning)(true)
          cardX.value = withTiming(700, { duration: 280 })
          cardRotate.value = withTiming(22, { duration: 280 })
          cardOpacity.value = withTiming(0, { duration: 260 })
          saveOpacity.value = withTiming(0, { duration: 200 })
          cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
            runOnJS(handleTourSwipeRight)()
          })
        } else {
          cardX.value = withSpring(0, { damping: 20, stiffness: 200 })
          cardRotate.value = withSpring(0, { damping: 20, stiffness: 200 })
          saveOpacity.value = withTiming(0, { duration: 200 })
        }
        return
      }

      // Tour step 1: both directions enabled
      if (tourStepSV.value === 1) {
        if (e.translationX > SWIPE_THRESHOLD) {
          runOnJS(setTransitioning)(true)
          cardX.value = withTiming(700, { duration: 280 })
          cardRotate.value = withTiming(22, { duration: 280 })
          cardOpacity.value = withTiming(0, { duration: 260 })
          saveOpacity.value = withTiming(0, { duration: 200 })
          cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
            runOnJS(handleTourSwipeRight)()
          })
        } else if (e.translationX < -SWIPE_THRESHOLD) {
          runOnJS(setTransitioning)(true)
          cardX.value = withTiming(-700, { duration: 280 })
          cardRotate.value = withTiming(-22, { duration: 280 })
          cardOpacity.value = withTiming(0, { duration: 260 })
          discardOpacity.value = withTiming(0, { duration: 200 })
          cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
            runOnJS(handleTourSwipeLeft)()
          })
        } else {
          cardX.value = withSpring(0, { damping: 20, stiffness: 200 })
          cardRotate.value = withSpring(0, { damping: 20, stiffness: 200 })
          saveOpacity.value = withTiming(0, { duration: 200 })
          discardOpacity.value = withTiming(0, { duration: 200 })
        }
        return
      }

      // Non-tour
      if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(setTransitioning)(true)
        cardX.value = withTiming(700, { duration: 280 })
        cardRotate.value = withTiming(22, { duration: 280 })
        cardOpacity.value = withTiming(0, { duration: 260 })
        saveOpacity.value = withTiming(0, { duration: 200 })
        cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
          runOnJS(handleSaveAndNext)()
        })
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(setTransitioning)(true)
        cardX.value = withTiming(-700, { duration: 280 })
        cardRotate.value = withTiming(-22, { duration: 280 })
        cardOpacity.value = withTiming(0, { duration: 260 })
        discardOpacity.value = withTiming(0, { duration: 200 })
        cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
          runOnJS(handleDiscardAndNext)()
        })
      } else {
        cardX.value = withSpring(0, { damping: 20, stiffness: 200 })
        cardRotate.value = withSpring(0, { damping: 20, stiffness: 200 })
        saveOpacity.value = withTiming(0, { duration: 200 })
        discardOpacity.value = withTiming(0, { duration: 200 })
      }
    })

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateY: cardY.value },
      { translateX: cardX.value },
      { rotate: `${cardRotate.value}deg` },
    ],
  }))

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
  }))

  const saveIndicatorStyle = useAnimatedStyle(() => ({
    opacity: saveOpacity.value,
    transform: [
      { rotate: '-12deg' },
      { scale: interpolate(saveOpacity.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) },
    ],
  }))

  const discardIndicatorStyle = useAnimatedStyle(() => ({
    opacity: discardOpacity.value,
    transform: [
      { rotate: '12deg' },
      { scale: interpolate(discardOpacity.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) },
    ],
  }))

  async function handleSaveButton() {
    if (verseIsSaved || transitioning || isTour) return
    setTransitioning(true)
    cardX.value = withTiming(700, { duration: 300 })
    cardRotate.value = withTiming(20, { duration: 300 })
    cardOpacity.value = withTiming(0, { duration: 280 }, () => runOnJS(handleSaveAndNext)())
  }

  async function shareText() {
    const ref = verse.reference ? ` — ${verse.reference}` : ''
    try {
      await Share.share({
        message: `"${verse.body}"${ref}\n\nvia Soft Landing`,
      })
    } catch {
      // user dismissed
    }
  }

  async function shareAsCard(format: 'square' | 'portrait') {
    setShareFormat(format)
    setShareReady(true)
    await new Promise<void>(r => setTimeout(r, 150))
    try {
      const uri = await captureRef(shareCardRef, { format: 'jpg', quality: 0.95 })
      await Share.share({ url: uri })
    } catch (e) {
      console.warn('Share failed', e)
    }
  }

  function handleShare() {
    if (isTour) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowShareSheet(true)
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
      accessibilityLabel="Your verse"
    >

      {/* Save indicator */}
      <Animated.View style={[INDICATOR_BASE, { right: 24, backgroundColor: '#9CB59A' }, saveIndicatorStyle]}>
        <Text style={INDICATOR_TEXT_STYLE}>★  Save</Text>
      </Animated.View>

      {/* Discard indicator */}
      <Animated.View style={[INDICATOR_BASE, { left: 24, backgroundColor: colors.inkMuted }, discardIndicatorStyle]}>
        <Text style={INDICATOR_TEXT_STYLE}>✕  Skip</Text>
      </Animated.View>

      {/* Swipeable verse card */}
      <View ref={cardRef}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              width: '100%',
              borderRadius: 24,
              paddingHorizontal: 32,
              paddingTop: 36,
              paddingBottom: 28,
              backgroundColor: isDark ? '#3D2A18' : colors.surface,
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? 'rgba(196,149,106,0.25)' : 'transparent',
              shadowColor: isDark ? '#C4956A' : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.12 : 0.07,
              shadowRadius: 18,
              elevation: 5,
            },
            cardStyle,
          ]}
        >
          <Text
            style={{ fontFamily: 'Lora_400Regular', fontSize: 18, lineHeight: 32, textAlign: 'center', color: colors.inkPrimary }}
            accessibilityRole="text"
          >
            {verse.body}
          </Text>

          {verse.reference ? (
            <Text style={{ marginTop: 20, fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#C4956A', letterSpacing: 0.4 }}>
              {verse.reference}
            </Text>
          ) : null}

          <Text style={{ marginTop: 24, fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#C4B59A', letterSpacing: 0.3 }}>
            ← skip · save →
          </Text>
        </Animated.View>
      </GestureDetector>
      </View>

      {/* Action buttons — hidden in tour mode to prevent deviating */}
      <View ref={buttonsRef}>
      {!isTour && (
        <Animated.View
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 28, marginTop: 32 }, actionsStyle]}
        >
          <Pressable
            onPress={handleSaveButton}
            accessibilityRole="button"
            accessibilityLabel={verseIsSaved ? 'Verse saved' : 'Save verse'}
            hitSlop={ACTION_HIT_SLOP}
            style={actionPressableStyle}
          >
            <Text style={{ fontSize: 26, opacity: verseIsSaved ? 1 : 0.4 }}>
              {verseIsSaved ? '★' : '☆'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share verse"
            hitSlop={ACTION_HIT_SLOP}
            style={actionPressableStyle}
          >
            <Text style={{ fontSize: 22, color: colors.inkSecondary }}>↑</Text>
          </Pressable>

          <Pressable
            onPress={() => { if (!transitioning) navigateDone() }}
            accessibilityRole="button"
            accessibilityLabel="Go home"
            hitSlop={ACTION_HIT_SLOP}
            style={actionPressableStyle}
          >
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 28, color: colors.inkSecondary }}>
              ×
            </Text>
          </Pressable>
        </Animated.View>
      )}
      </View>

      {/* Tour step 0 — introduce the card */}
      {tourStep === 0 && cardTopY > 0 && (
        <PositionedTooltip
          text="This is your verse. Swipe left to skip it, swipe right to save it."
          buttonLabel="Got it →"
          anchorY={cardTopY}
          placement="above"
          onDismiss={() => setTourStepSync(1)}
        />
      )}

      {/* Tour step 1 — no button, gesture drives it */}
      {tourStep === 1 && cardTopY > 0 && (
        <PositionedTooltip
          text="Give it a try — swipe left or right."
          buttonLabel=""
          anchorY={cardTopY}
          placement="above"
          onDismiss={() => {}}
        />
      )}

      {/* Tour step 2 — after left swipe, lock to right-only */}
      {tourStep === 2 && cardTopY > 0 && (
        <PositionedTooltip
          text="Swiping left skips a verse. Now swipe right to save this one."
          buttonLabel=""
          anchorY={cardTopY}
          placement="above"
          onDismiss={() => {}}
        />
      )}

      {/* Off-screen share card */}
      {shareReady && (
        <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
          <VerseShareCard
            ref={shareCardRef}
            verseBody={verse.body}
            reference={verse.reference}
            emotionId={emotionId ?? 'neutral'}
            format={shareFormat}
          />
        </View>
      )}

      <ShareFormatSheet
        visible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        onShareText={() => { setShowShareSheet(false); shareText() }}
        onShareCard={async (format) => { await shareAsCard(format) }}
      />

      {/* Mirror Days footer */}
      {!isTour && mirrorDate && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderTopWidth: 1,
            borderTopColor: 'rgba(196,149,106,0.2)',
          }}
        >
          <Text
            style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: 15,
              color: colors.inkSecondary,
              flex: 1,
            }}
          >
            {formatMirrorDate(mirrorDate)} felt a lot like today.
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(tabs)/history',
                params: { openDate: mirrorDate },
              })
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginLeft: 12 })}
            accessibilityRole="button"
            accessibilityLabel={`Visit ${formatMirrorDate(mirrorDate)}`}
          >
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 13,
                color: '#C4956A',
              }}
            >
              Visit →
            </Text>
          </Pressable>
        </View>
      )}

    </View>
  )
}
