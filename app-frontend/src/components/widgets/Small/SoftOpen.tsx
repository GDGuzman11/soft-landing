import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { EMOTIONS } from '@/constants/emotions'
import type { EmotionId } from '@/types'

/**
 * SoftOpen — the small home-screen widget that opens the day with a gentle
 * greeting, a five-emotion check-in row, and an optional streak line.
 *
 * Pure presentational component. Sits inside a 158x158 WidgetPreview wrapper
 * in the gallery, but lays itself out via flex so it adapts to any parent.
 */

interface SoftOpenProps {
  /** Display name shown after the greeting. Defaults to "friend". */
  name?: string
  /** Current streak in days. When 0 the streak line is hidden entirely. */
  streak?: number
  /** Hour-of-day used to compute the greeting. Defaults to current hour. */
  hour?: number
  /** Fired when the user taps one of the five emotion dots. */
  onEmotionSelect?: (emotion: EmotionId) => void
  /** Fired when the user taps the widget body (anywhere outside a dot). */
  onTap?: () => void
}

/**
 * Display order for the emotion-dot row. Distinct from the canonical
 * EMOTIONS order in `@/constants/emotions`; colors are still looked up
 * from that single source of truth below.
 */
const EMOTION_ROW_ORDER: readonly EmotionId[] = [
  'stressed',
  'tired',
  'sad',
  'neutral',
  'good',
] as const

/** Map emotion id -> color, derived from the EMOTIONS catalog. */
const EMOTION_COLOR_BY_ID: Record<EmotionId, string> = EMOTIONS.reduce(
  (acc, e) => {
    acc[e.id] = e.color
    return acc
  },
  {} as Record<EmotionId, string>,
)

const COLORS = {
  cardBg: '#F5F0E8',
  amber: '#C4956A',
  greetingInk: '#3D2F2A',
  promptInk: '#9A8F82',
} as const

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function SoftOpen({
  name = 'friend',
  streak = 0,
  hour,
  onEmotionSelect,
  onTap,
}: SoftOpenProps) {
  const resolvedHour = hour ?? new Date().getHours()
  const greeting = getGreeting(resolvedHour)
  const showStreak = streak > 0
  const streakLabel = `✦ ${streak} ${streak === 1 ? 'day' : 'days'}`

  // UI states:
  // - Loading / Error / Empty: omitted intentionally — this is a pure
  //   presentational widget with no async data. The "name = friend" /
  //   "streak = 0 hides the line" defaults are the meaningful empty state.
  return (
    <Pressable
      onPress={onTap}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`${greeting}, ${name}. How are you today?`}
    >
      <Text style={styles.amberMark}>{'✦'}</Text>

      <View style={styles.gap6} />

      <Text style={styles.greeting} numberOfLines={1}>
        {`${greeting}, ${name}.`}
      </Text>

      <View style={styles.gap6} />

      <Text style={styles.prompt} numberOfLines={1}>
        HOW ARE YOU TODAY?
      </Text>

      <View style={styles.gap6} />

      <View style={styles.dotsRow}>
        {EMOTION_ROW_ORDER.map((id, i) => (
          <Pressable
            key={id}
            onPress={() => onEmotionSelect?.(id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Check in as ${id}`}
            style={[
              styles.dot,
              { backgroundColor: EMOTION_COLOR_BY_ID[id] },
              i < EMOTION_ROW_ORDER.length - 1 ? styles.dotSpacing : null,
            ]}
          />
        ))}
      </View>

      {showStreak ? (
        <>
          <View style={styles.gap4} />
          <Text style={styles.streak} numberOfLines={1}>
            {streakLabel}
          </Text>
        </>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  amberMark: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: COLORS.amber,
    textAlign: 'center',
    lineHeight: 12,
  },
  gap6: { height: 6 },
  gap4: { height: 4 },
  greeting: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 13,
    color: COLORS.greetingInk,
    textAlign: 'center',
  },
  prompt: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: COLORS.promptInk,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotSpacing: {
    marginRight: 4,
  },
  streak: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: COLORS.amber,
    textAlign: 'center',
  },
})
