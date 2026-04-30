import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

/**
 * DoorOpen — the small home-screen widget that signals whether a letter is
 * waiting. Two states driven by `checkedInToday`:
 *   - false: invites the user in ("A letter is waiting.")
 *   - true:  reassures and resets ("All caught up today.")
 *
 * Pure presentational component. The envelope graphic is built from plain
 * Views (no SVG dependency): a parchment body, an amber triangular flap, and
 * a small amber wax seal at the bottom edge.
 */

interface DoorOpenProps {
  /** When true, shows the "all caught up" copy. Defaults to false. */
  checkedInToday?: boolean
  /** Fired when the user taps the widget body. */
  onTap?: () => void
}

const COLORS = {
  cardBg: '#F5F0E8',
  parchment: '#F5EBD8',
  amber: '#C4956A',
  primaryInk: '#9A8F82',
  secondaryInk: '#3D2F2A',
} as const

export default function DoorOpen({
  checkedInToday = false,
  onTap,
}: DoorOpenProps) {
  const primary = checkedInToday ? 'All caught up today.' : 'A letter is waiting.'
  const secondary = checkedInToday
    ? 'A new letter tomorrow.'
    : "Open when you're ready."

  // UI states:
  // - Loading / Error: omitted intentionally — pure presentational widget,
  //   no async data.
  // - Empty: the `checkedInToday=true` branch is the meaningful "no new
  //   content" state.
  return (
    <Pressable
      onPress={onTap}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`${primary} ${secondary}`}
    >
      {/* Envelope graphic — 60x44 */}
      <View style={styles.envelope}>
        {/* Body */}
        <View style={styles.envelopeBody} />
        {/* Triangular flap (downward-pointing triangle via borders) */}
        <View style={styles.envelopeFlap} />
        {/* Wax seal */}
        <View style={styles.waxSeal} />
      </View>

      <View style={styles.gap5} />

      <Text style={styles.primaryText} numberOfLines={1}>
        {primary}
      </Text>

      <View style={styles.gap7} />

      <Text style={styles.secondaryText} numberOfLines={2}>
        {secondary}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  envelope: {
    width: 60,
    height: 44,
    position: 'relative',
  },
  envelopeBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.parchment,
    borderRadius: 2,
  },
  envelopeFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.amber,
    opacity: 0.5,
  },
  waxSeal: {
    position: 'absolute',
    bottom: -5,
    left: 25,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.amber,
  },
  gap5: { height: 5 },
  gap7: { height: 7 },
  primaryText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: COLORS.primaryInk,
    textAlign: 'center',
  },
  secondaryText: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 11,
    color: COLORS.secondaryInk,
    textAlign: 'center',
    lineHeight: 14, // ~1.25 * 11
  },
})
