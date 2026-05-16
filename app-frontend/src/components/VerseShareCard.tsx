import React, { forwardRef } from 'react'
import { View, Text } from 'react-native'

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

const EMOTION_ACCENT: Record<string, string> = {
  stressed: 'rgba(201, 123, 90, 0.70)',
  tired:    'rgba(156, 143, 181, 0.70)',
  sad:      'rgba(122, 149, 176, 0.70)',
  neutral:  'rgba(196, 181, 154, 0.70)',
  good:     'rgba(156, 181, 154, 0.70)',
}

const BG = '#FAF8F5'
const AMBER = '#C4956A'
const INK = '#3D2F2A'
const MUTED = '#9A8880'

const VerseShareCard = forwardRef<View, Props>(
  ({ verseBody, reference, emotionId, format }, ref) => {
    const { width, height } = DIMS[format]
    const accentColor = EMOTION_ACCENT[emotionId] ?? EMOTION_ACCENT.neutral

    const displayText =
      verseBody.length > 200
        ? verseBody.slice(0, 200).trimEnd() + '…'
        : verseBody

    const verseFontSize =
      verseBody.length > 180 ? 19 : verseBody.length > 120 ? 20 : 22
    const verseLineHeight = verseFontSize * 1.45

    const translation = reference.includes('KJV')
      ? 'KJV'
      : reference.includes('WEB')
        ? 'WEB'
        : ''

    const starSize = format === 'portrait' ? 22 : 18

    return (
      <View
        ref={ref}
        collapsable={false}
        style={{
          width,
          height,
          backgroundColor: BG,
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 42,
          paddingHorizontal: 28,
        }}
      >
        {/* Inset frame */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            bottom: 14,
            left: 14,
            borderWidth: 1,
            borderColor: 'rgba(196, 149, 106, 0.45)',
            borderRadius: 4,
          }}
        />

        {/* Top zone */}
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: starSize,
              color: AMBER,
              marginBottom: 16,
            }}
          >
            ✦
          </Text>
          <View
            style={{
              width: 32,
              height: 1,
              backgroundColor: accentColor,
            }}
          />
        </View>

        {/* Middle zone */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: verseFontSize,
              lineHeight: verseLineHeight,
              color: INK,
              textAlign: 'center',
            }}
          >
            {'"' + displayText + '"'}
          </Text>
        </View>

        {/* Bottom zone */}
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 11,
              letterSpacing: 2.4,
              color: INK,
            }}
          >
            {reference.toUpperCase()}
          </Text>
          {translation ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 9,
                letterSpacing: 1.6,
                color: MUTED,
                marginTop: 6,
              }}
            >
              {translation}
            </Text>
          ) : null}
        </View>

        {/* Wordmark — absolutely positioned, sits inside the bottom padding */}
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 9,
              color: AMBER,
            }}
          >
            ✦
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 10,
              letterSpacing: 1.4,
              color: MUTED,
            }}
          >
            {' soft landing'}
          </Text>
        </View>
      </View>
    )
  }
)

VerseShareCard.displayName = 'VerseShareCard'
export default VerseShareCard
