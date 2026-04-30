import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { EMOTIONS } from '@/constants/emotions'
import type { EmotionId } from '@/types'

/**
 * CarriedVerse — the small home-screen widget that surfaces a single
 * verse the user has carried from a recent check-in. Header shows an
 * emotion dot, the reference (uppercase amber), and an optional date.
 * The verse body is rendered in italic Lora and truncated to three lines.
 * The bottom row shows a CTA prompting the user to reflect, or a quieter
 * label noting they have already written about this verse.
 *
 * Pure presentational component — no AsyncStorage or service calls.
 */

interface CarriedVerseProps {
  /** Scripture reference, e.g. "Psalm 34:18". Shown uppercase in the header. */
  reference?: string
  /** Verse text. Truncated to 3 lines with ellipsis. */
  body?: string
  /** Drives the color dot color. Defaults to neutral. */
  emotionId?: EmotionId
  /** ISO date string. Rendered as "Apr 17". Hidden if undefined. */
  savedAt?: string
  /** True when the user already wrote a letter for this verse. */
  hasLetter?: boolean
  /** Tapping the CTA — opens letter-compose. */
  onReflect?: () => void
  /** Tapping the widget body — opens app home. */
  onTap?: () => void
}

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
  verseInk: '#3D2F2A',
  hairline: '#C4956A',
  writtenInk: '#9A8F82',
} as const

function formatSavedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function CarriedVerse({
  reference = 'Psalm 34:18',
  body = 'The Lord is close to the broken-hearted and saves those who are crushed in spirit.',
  emotionId = 'neutral',
  savedAt,
  hasLetter = false,
  onReflect,
  onTap,
}: CarriedVerseProps) {
  const dotColor = EMOTION_COLOR_BY_ID[emotionId]
  const dateLabel = savedAt ? formatSavedAt(savedAt) : null

  // UI states:
  // - Loading / Error: omitted intentionally — pure presentational widget,
  //   no async data inside the component.
  // - Empty: defaults for `reference` / `body` provide a meaningful empty
  //   state when the host has no saved verse to pass in yet.
  return (
    <Pressable
      onPress={onTap}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Carried verse: ${reference}`}
    >
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.reference} numberOfLines={1}>
          {reference.toUpperCase()}
        </Text>
        {dateLabel ? (
          <Text style={styles.date} numberOfLines={1}>
            {dateLabel}
          </Text>
        ) : (
          // Empty spacer keeps the reference visually centered when no date.
          <View style={styles.dateSpacer} />
        )}
      </View>

      <View style={styles.hairline} />

      <View style={styles.bodyWrap}>
        <Text style={styles.body} numberOfLines={3} ellipsizeMode="tail">
          {body}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        {hasLetter ? (
          <Text style={styles.writtenLabel} numberOfLines={1}>
            {'You wrote about this →'}
          </Text>
        ) : (
          <Pressable
            onPress={onReflect}
            accessibilityRole="button"
            accessibilityLabel="Reflect on this verse today"
            hitSlop={6}
          >
            <Text style={styles.reflectCta} numberOfLines={1}>
              {'Reflect on this today →'}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  )
}

const DOT_SIZE = 10

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  reference: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: COLORS.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  date: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: COLORS.amber,
  },
  dateSpacer: {
    // Mirror the dot width so the reference stays centered when no date.
    width: DOT_SIZE,
    height: DOT_SIZE,
  },
  hairline: {
    height: 1,
    backgroundColor: COLORS.hairline,
    opacity: 0.35,
    marginVertical: 6,
  },
  bodyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  body: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 12,
    color: COLORS.verseInk,
    lineHeight: 16,
    textAlign: 'left',
  },
  bottomRow: {
    marginTop: 6,
  },
  reflectCta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: COLORS.amber,
  },
  writtenLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: COLORS.writtenInk,
  },
})
