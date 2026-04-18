import { View, Text, Pressable } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { bookmarkMessage } from '@/services/checkIn'

export default function MessageScreen() {
  const { messageBody, checkInId, messageId } = useLocalSearchParams<{
    messageBody: string
    checkInId: string
    messageId: string
  }>()

  const [saved, setSaved] = useState(false)

  const cardOpacity = useSharedValue(0)
  const cardY = useSharedValue(30)
  const actionsOpacity = useSharedValue(0)

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 500 })
    cardY.value = withSpring(0, { damping: 20, stiffness: 120 })
    actionsOpacity.value = withDelay(400, withTiming(1, { duration: 400 }))
  }, [])

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }))

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actionsOpacity.value,
  }))

  async function handleSave() {
    if (saved) return
    await bookmarkMessage(checkInId, messageId)
    setSaved(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  return (
    <View
      className="flex-1 bg-background items-center justify-center px-8"
      accessibilityLabel="Your message"
    >
      <Animated.View
        style={[{
          width: '100%',
          borderRadius: 24,
          padding: 32,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 4,
        }, cardStyle]}
      >
        <Text
          className="text-text-primary text-center leading-8"
          style={{ fontFamily: 'Lora_400Regular', fontSize: 18 }}
          accessibilityRole="text"
        >
          {messageBody}
        </Text>
      </Animated.View>

      <Animated.View
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 32 }, actionsStyle]}
      >
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Message saved' : 'Save message'}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 12 })}
        >
          <Text style={{ fontSize: 28, opacity: saved ? 1 : 0.45 }}>
            {saved ? '★' : '☆'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(tabs)')}
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
