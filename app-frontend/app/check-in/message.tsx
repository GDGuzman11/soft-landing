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
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { bookmarkMessage } from '@/services/checkIn'

const SWIPE_THRESHOLD = 110

export default function MessageScreen() {
  const { messageBody, messageReference, checkInId, messageId } = useLocalSearchParams<{
    messageBody: string
    messageReference: string
    checkInId: string
    messageId: string
  }>()

  const [saved, setSaved] = useState(false)
  const [swiping, setSwiping] = useState(false)

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

  async function saveAndDismiss() {
    if (!saved) {
      await bookmarkMessage(checkInId, messageId)
      setSaved(true)
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.replace('/(tabs)')
  }

  function dismiss() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.replace('/(tabs)')
  }

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (swiping) return
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
      if (swiping) return

      if (e.translationX > SWIPE_THRESHOLD) {
        // Swipe right → save
        runOnJS(setSwiping)(true)
        cardX.value = withTiming(700, { duration: 280 })
        cardRotate.value = withTiming(22, { duration: 280 })
        cardOpacity.value = withTiming(0, { duration: 260 })
        saveOpacity.value = withTiming(0, { duration: 200 })
        cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
          runOnJS(saveAndDismiss)()
        })
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        // Swipe left → discard
        runOnJS(setSwiping)(true)
        cardX.value = withTiming(-700, { duration: 280 })
        cardRotate.value = withTiming(-22, { duration: 280 })
        cardOpacity.value = withTiming(0, { duration: 260 })
        discardOpacity.value = withTiming(0, { duration: 200 })
        cardY.value = withTiming(cardY.value - 10, { duration: 280 }, () => {
          runOnJS(dismiss)()
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
    transform: [{ rotate: '-12deg' }, { scale: interpolate(saveOpacity.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) }],
  }))

  const discardIndicatorStyle = useAnimatedStyle(() => ({
    opacity: discardOpacity.value,
    transform: [{ rotate: '12deg' }, { scale: interpolate(discardOpacity.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) }],
  }))

  async function handleSave() {
    if (saved || swiping) return
    setSwiping(true)
    cardX.value = withTiming(700, { duration: 300 })
    cardRotate.value = withTiming(20, { duration: 300 })
    cardOpacity.value = withTiming(0, { duration: 280 }, () => runOnJS(saveAndDismiss)())
  }

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const ref = messageReference ? ` — ${messageReference}` : ''
    try {
      await Share.share({
        message: `"${messageBody}"${ref}\n\nvia Soft Landing`,
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
      {/* Save indicator — appears on left when swiping right */}
      <Animated.View style={[{
        position: 'absolute',
        left: 24,
        top: '45%',
        backgroundColor: '#9CB59A',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        zIndex: 5,
      }, saveIndicatorStyle]}>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#FFFFFF' }}>
          ★  Save
        </Text>
      </Animated.View>

      {/* Discard indicator — appears on right when swiping left */}
      <Animated.View style={[{
        position: 'absolute',
        right: 24,
        top: '45%',
        backgroundColor: '#B0BEC5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        zIndex: 5,
      }, discardIndicatorStyle]}>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#FFFFFF' }}>
          ✕  Dismiss
        </Text>
      </Animated.View>

      {/* Swipeable verse card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[{
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
          }, cardStyle]}
        >
          <Text
            className="text-text-primary text-center leading-8"
            style={{ fontFamily: 'Lora_400Regular', fontSize: 18 }}
            accessibilityRole="text"
          >
            {messageBody}
          </Text>

          {messageReference ? (
            <Text
              className="text-center mt-5"
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: '#C4956A',
                letterSpacing: 0.4,
              }}
            >
              {messageReference}
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
            ← swipe to dismiss · swipe to save →
          </Text>
        </Animated.View>
      </GestureDetector>

      {/* Action buttons */}
      <Animated.View
        style={[{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 28,
          marginTop: 32,
        }, actionsStyle]}
      >
        {/* Save */}
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Verse saved' : 'Save verse'}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 12 })}
        >
          <Text style={{ fontSize: 26, opacity: saved ? 1 : 0.4 }}>
            {saved ? '★' : '☆'}
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

        {/* Dismiss */}
        <Pressable
          onPress={() => { if (!swiping) dismiss() }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
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
    </View>
  )
}
