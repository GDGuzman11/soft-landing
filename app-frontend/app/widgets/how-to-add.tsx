import React, { useEffect } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated'

const COLORS = {
  bg: '#FAF8F5',
  amber: '#C4956A',
  inkPrimary: '#3D2F2A',
  inkSubtle: '#A09080',
  cardWarm: '#F5F0E8',
} as const

type StepCardProps = {
  index: number
  body: string
  delayMs: number
}

function StepCard({ index, body, delayMs }: StepCardProps) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(16)

  useEffect(() => {
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 350 }))
    translateY.value = withDelay(
      delayMs,
      withSpring(0, { stiffness: 80, damping: 14 }),
    )
  }, [delayMs, opacity, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View style={[styles.stepCard, animatedStyle]}>
      <Text style={styles.stepBadge}>{index}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </Animated.View>
  )
}

export default function HowToAddScreen() {
  const headerOpacity = useSharedValue(0)
  const headerTranslate = useSharedValue(12)

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 400 })
    headerTranslate.value = withSpring(0, { stiffness: 80, damping: 14 })
  }, [headerOpacity, headerTranslate])

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }))

  // UI states:
  // - Loading / Error / Empty: omitted — fully static instructional content.
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 56, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={COLORS.inkPrimary} />
        </Pressable>

        <Animated.View
          style={[
            { paddingHorizontal: 24, marginBottom: 28 },
            headerStyle,
          ]}
        >
          <Text style={styles.title}>Adding it to your home screen</Text>
          <Text style={styles.subhead}>Three soft taps.</Text>
        </Animated.View>

        <View style={{ paddingHorizontal: 24 }}>
          <StepCard
            index={1}
            delayMs={120}
            body="Touch and hold an empty spot on your home screen until the apps wiggle."
          />
          <StepCard
            index={2}
            delayMs={220}
            body="Tap the + in the top corner and search for Soft Landing."
          />
          <StepCard
            index={3}
            delayMs={320}
            body="Pick this widget, then drag it anywhere you like. Done."
          />

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.donePill,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.donePillText}>Done — take me back</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 26,
    color: COLORS.inkPrimary,
    marginBottom: 6,
  },
  subhead: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 16,
    color: COLORS.inkSubtle,
  },
  stepCard: {
    backgroundColor: COLORS.cardWarm,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  stepBadge: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: COLORS.amber,
    marginBottom: 6,
  },
  stepBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: COLORS.inkPrimary,
    lineHeight: 22,
  },
  donePill: {
    alignSelf: 'center',
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: COLORS.amber,
  },
  donePillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#FFFFFF',
  },
})
