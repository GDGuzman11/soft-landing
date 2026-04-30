import { View, Text, Pressable, StyleSheet } from 'react-native'

interface LineThatStayedProps {
  line?: string
  source?: string
  isEmpty?: boolean
  onTap?: () => void
  onWrite?: () => void
}

const COLORS = {
  bg: '#FAF8F5',
  amber: '#C4956A',
  inkPrimary: '#3D2F2A',
  inkMuted: '#9A8F82',
} as const

export default function LineThatStayed({
  line = '',
  source = '',
  isEmpty = false,
  onTap,
  onWrite,
}: LineThatStayedProps) {
  if (isEmpty) {
    return (
      <Pressable
        onPress={onTap}
        style={styles.container}
        accessibilityRole="button"
        accessibilityLabel="A line from one of your letters will appear here"
      >
        <Text style={styles.starTopRight}>{'✦'}</Text>

        <View style={styles.contentRow}>
          <View style={[styles.bar, { opacity: 0.3 }]} />
          <Text style={[styles.line, { color: COLORS.inkMuted }]} numberOfLines={4}>
            {'One of your letters will surface a line here.'}
          </Text>
        </View>

        <Pressable
          onPress={onWrite}
          accessibilityRole="button"
          accessibilityLabel="Write a letter"
          style={styles.writeRow}
        >
          <Text style={styles.writeCta}>{'Write one →'}</Text>
        </Pressable>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onTap}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={line ? `"${line}"` : 'The line that stayed'}
    >
      <Text style={styles.starTopRight}>{'✦'}</Text>

      <View style={styles.contentRow}>
        <View style={styles.bar} />
        <Text style={styles.line} numberOfLines={4}>
          {line}
        </Text>
      </View>

      {source ? (
        <Text style={styles.source} numberOfLines={1}>
          {source}
        </Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    position: 'relative',
  },
  starTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 8,
    color: COLORS.amber,
    lineHeight: 10,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  bar: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: COLORS.amber,
    borderRadius: 1,
  },
  line: {
    flex: 1,
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 13,
    color: COLORS.inkPrimary,
    lineHeight: 17,
  },
  source: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: COLORS.inkMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  writeRow: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  writeCta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: COLORS.amber,
  },
})
