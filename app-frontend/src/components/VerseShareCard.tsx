import React, { forwardRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'

const EMOTION_COLORS: Record<string, string> = {
  stressed: '#C97B5A',
  tired:    '#9C8FB5',
  sad:      '#7A95B0',
  neutral:  '#C4B59A',
  good:     '#9CB59A',
}

interface Props {
  verseBody: string
  reference: string
  emotionId: string
  format: 'square' | 'portrait'
}

const DIMS = {
  square:   { width: 360, height: 360 },
  portrait: { width: 360, height: 450 },
} as const

const VerseShareCard = forwardRef<View, Props>(
  ({ verseBody, reference, emotionId, format }, ref) => {
    const { width, height } = DIMS[format]
    const emotionColor = EMOTION_COLORS[emotionId] ?? '#C4B59A'
    const fontSize = format === 'portrait' ? 24 : 20
    const lineHeight = format === 'portrait' ? 38 : 32

    const displayText =
      verseBody.length > 120
        ? verseBody.slice(0, 120).trimEnd() + '...'
        : verseBody

    return (
      <View ref={ref} style={[styles.card, { width, height }]} collapsable={false}>
        <View style={[styles.dot, { backgroundColor: emotionColor }]} />
        <Text style={[styles.verse, { fontSize, lineHeight }]}>
          {'"' + displayText + '"'}
        </Text>
        <Text style={styles.reference}>{'— ' + reference}</Text>
        <Text style={styles.wordmark}>✦ soft landing</Text>
      </View>
    )
  }
)

VerseShareCard.displayName = 'VerseShareCard'
export default VerseShareCard

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 28,
  },
  verse: {
    fontFamily: 'Lora_400Regular_Italic',
    color: '#3D2F2A',
    textAlign: 'center',
    marginBottom: 20,
  },
  reference: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#C4956A',
    textAlign: 'center',
  },
  wordmark: {
    position: 'absolute',
    bottom: 24,
    left: 28,
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: '#9A8880',
  },
})
