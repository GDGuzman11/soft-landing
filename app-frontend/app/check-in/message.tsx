import { View, Text, Pressable, Share } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { bookmarkMessage, canCheckIn, performCheckIn } from '@/services/checkIn'
import type { EmotionId } from '@/types'
import TourTooltip from '@/components/TourTooltip'

const SWIPE_THRESHOLD = 110

interface VerseData {
  body: string
  reference: string
  checkInId: string
  messageId: string
}

export default function MessageScreen() {
  const { emotionId, messageBody, messageReference, checkInId, messageId, tour } =
    useLocalSearchParams<{
      emotionId: string
      messageBody: string
      messageReference: string
      checkInId: string
      messageId: string
      tour?: string
    }>()
  const isTour = tour === '1'
  const [showTooltip, setShowTooltip] = useState(isTour)
  const [showSymbolsTooltip, setShowSymbolsTooltip] = useState(false)
  const hasSwipedInTour = showSymbolsTooltip

  const [verse, setVerse] = useState<VerseData>({
    body: messageBody,
    reference: messageReference,
    checkInId,
    messageId,
  })
  const [verseIsSaved, setVerseIsSaved] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [sessionSavedIds, setSessionSavedIds] = useState<string[]>([])

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

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 500 })
    cardY.value = withSpring(0, { damping: 20, stiffness: 120 })
    actionsOpacity.value = withDelay(400, withTiming(1, { duration: 400 }))
  }, [])

  async function loadNextVerse(swipeDirection: 'right' | 'left') {
    const ok = await canCheckIn()
    if (!ok) {
      setTransitioning(false)
      router.push('/paywall')
      return
    }

    const result = await performCheckIn(emotionId as EmotionId)

    // Position card off-screen on opposite side BEFORE React re-renders new text
    const fromX = swipeDirection === 'right' ? -350 : 350
    cardX.value = fromX
    cardRotate.value = swipeDirection === 'right' ? -5 : 5
    cardOpacity.value = 0
    saveOpacity.value = 0
    discardOpacity.value = 0

    setVerse({
      body: result.message.body,
      reference: result.message.reference ?? '',
      checkInId: result.event.id,
      messageId: result.message.id,
    })
    setVerseIsSaved(false)
    setTransitioning(false)

    // Small delay so React re-renders new text before card becomes visible
    cardX.value = withDelay(40, withSpring(0, { damping: 22, stiffness: 130 }))
    cardOpacity.value = withDelay(40, withTiming(1, { duration: 280 }))
    cardRotate.value = withDelay(40, withSpring(0, { damping: 20, stiffness: 150 }))
    actionsOpacity.value = withDelay(200, withTiming(1, { duration: 300 }))
  }

  function navigateDone() {
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

      if (Math.abs(e.translationX) > SWIPE_THRESHOLD && isTour && !hasSwipedInTour) {
        // Tour mode: intercept first swipe — snap back and show symbol guide
        cardX.value = withSpring(0, { damping: 20, stiffness: 200 })
        cardRotate.value = withSpring(0, { damping: 20, stiffness: 200 })
        saveOpacity.value = withTiming(0, { duration: 200 })
        discardOpacity.value = withTiming(0, { duration: 200 })
        setShowSymbolsTooltip(true)
      } else if (e.translationX > SWIPE_THRESHOLD) {
        // Swipe right → save + next
        setTransitioning(true)
        cardX.value = withTiming(700, { duration: 280 })
        cardRotate.value = withTiming(22, { duration: 280 })
        cardOpacity.value = withTiming(0, { duration: 260 })
        saveOpacity.value = withTiming(0, { duration: 200 })
        cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
          handleSaveAndNext()
        })
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // Swipe left → discard + next
        setTransitioning(true)
        cardX.value = withTiming(-700, { duration: 280 })
        cardRotate.value = withTiming(-22, { duration: 280 })
        cardOpacity.value = withTiming(0, { duration: 260 })
        discardOpacity.value = withTiming(0, { duration: 200 })
        cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
          handleDiscardAndNext()
        })
      } else {
        // Snap back
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
    if (verseIsSaved || transitioning) return
    setTransitioning(true)
    cardX.value = withTiming(700, { duration: 300 })
    cardRotate.value = withTiming(20, { duration: 300 })
    cardOpacity.value = withTiming(0, { duration: 280 }, () => handleSaveAndNext())
  }

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const ref = verse.reference ? ` — ${verse.reference}` : ''
    try {
      await Share.share({
        message: `"${verse.body}"${ref}\n\nvia Soft Landing`,
      })
    } catch {
      // user dismissed
    }
  }

  return (
    <View
      className="flex-1 bg-background items-center justify-center px-8"
      accessibilityLabel="Your verse"
    >

      {/* Save indicator — appears on right when swiping right */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            right: 24,
            top: '45%',
            backgroundColor: '#9CB59A',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            zIndex: 5,
          },
          saveIndicatorStyle,
        ]}
      >
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#FFFFFF' }}>
          ★  Save
        </Text>
      </Animated.View>

      {/* Discard indicator — appears on left when swiping left */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 24,
            top: '45%',
            backgroundColor: '#B0BEC5',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            zIndex: 5,
          },
          discardIndicatorStyle,
        ]}
      >
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#FFFFFF' }}>
          ✕  Skip
        </Text>
      </Animated.View>

      {/* Swipeable verse card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              width: '100%',
              borderRadius: 24,
              paddingHorizontal: 32,
              paddingTop: 36,
              paddingBottom: 28,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.07,
              shadowRadius: 18,
              elevation: 5,
            },
            cardStyle,
          ]}
        >
          <Text
            className="text-text-primary text-center leading-8"
            style={{ fontFamily: 'Lora_400Regular', fontSize: 18 }}
            accessibilityRole="text"
          >
            {verse.body}
          </Text>

          {verse.reference ? (
            <Text
              className="text-center mt-5"
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: '#C4956A',
                letterSpacing: 0.4,
              }}
            >
              {verse.reference}
            </Text>
          ) : null}

          {/* Swipe hint */}
          <Text
            className="text-center mt-6"
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 11,
              color: '#C4B59A',
              letterSpacing: 0.3,
            }}
          >
            ← skip · save →
          </Text>
        </Animated.View>
      </GestureDetector>

      {/* Action buttons */}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 28,
            marginTop: 32,
          },
          actionsStyle,
        ]}
      >
        {/* Save + next verse */}
        <Pressable
          onPress={handleSaveButton}
          accessibilityRole="button"
          accessibilityLabel={verseIsSaved ? 'Verse saved' : 'Save verse'}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 12 })}
        >
          <Text style={{ fontSize: 26, opacity: verseIsSaved ? 1 : 0.4 }}>
            {verseIsSaved ? '★' : '☆'}
          </Text>
        </Pressable>

        {/* Share */}
        <Pressable
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share verse"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 12 })}
        >
          <Text className="text-text-secondary" style={{ fontSize: 22 }}>↑</Text>
        </Pressable>

        {/* Dismiss — go home */}
        <Pressable
          onPress={() => {
            if (!transitioning) navigateDone()
          }}
          accessibilityRole="button"
          accessibilityLabel="Go home"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 12 })}
        >
          <Text
            className="text-text-secondary"
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 28 }}
          >
            ×
          </Text>
        </Pressable>
      </Animated.View>

      {showTooltip && (
        <TourTooltip
          text="Swipe right to save a verse to your collection. Swipe left to let it go and see another."
          onDismiss={() => setShowTooltip(false)}
        />
      )}

      {showSymbolsTooltip && (
        <TourTooltip
          rows={[
            { symbol: '☆', label: 'Save this verse to your collection' },
            { symbol: '↑', label: 'Share it with someone who needs it' },
            { symbol: '×', label: 'Wrap up and see what you saved' },
          ]}
          buttonLabel="Next →"
          onDismiss={() => router.replace('/(tabs)?tourStep=5')}
        />
      )}
    </View>
  )
}
