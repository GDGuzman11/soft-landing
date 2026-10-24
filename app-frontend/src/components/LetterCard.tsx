import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import React, { useEffect, useState } from 'react'
import { useTheme } from '@/theme'

type Props = {
  letter: string | null
  name: string
  isLoading: boolean
  error: 'network' | 'blocked' | 'rateLimited' | null
  onRetry?: () => void
}

function parseHighlightSegments(text: string): { text: string; highlight: boolean }[] {
  const parts = text.split(/(\[\[[\s\S]*?\]\])/)
  return parts
    .filter((p) => p.length > 0)
    .map((p) => {
      if (p.startsWith('[[') && p.endsWith(']]')) {
        return { text: p.slice(2, -2), highlight: true }
      }
      return { text: p, highlight: false }
    })
}

function ResonantLine({ text, animationReady }: { text: string; animationReady: boolean }) {
  const { colors } = useTheme()
  const ruleOpacity = useSharedValue(0)

  useEffect(() => {
    if (!animationReady) return
    ruleOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) })
    )
  }, [animationReady])

  const ruleStyle = useAnimatedStyle(() => ({ opacity: ruleOpacity.value }))

  return (
    <View style={{ paddingLeft: 16, marginVertical: 8 }}>
      <Animated.View
        style={[
          { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: colors.amber },
          ruleStyle,
        ]}
      />
      <Text
        style={{ fontFamily: 'Lora_400Regular', fontSize: 17, color: colors.inkPrimary, lineHeight: 26, letterSpacing: 0.15 }}
      >
        {text}
      </Text>
    </View>
  )
}

function BodySection({
  originalText,
  displayedText,
  showCursor,
  typingDone,
  cursorNode,
}: {
  originalText: string
  displayedText: string
  showCursor: boolean
  typingDone: boolean
  cursorNode: React.ReactNode
}) {
  const { colors } = useTheme()
  if (typingDone) {
    const segments = parseHighlightSegments(originalText)
    if (segments.some((s) => s.highlight)) {
      return (
        <View>
          {segments.map((seg, i) =>
            seg.highlight ? (
              <ResonantLine key={i} text={seg.text} animationReady />
            ) : seg.text ? (
              <Text
                key={i}
                style={{ fontFamily: 'Lora_400Regular', fontSize: 17, color: colors.inkPrimary, lineHeight: 26 }}
              >
                {seg.text}
              </Text>
            ) : null
          )}
        </View>
      )
    }
    return (
      <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 17, color: colors.inkPrimary, lineHeight: 26 }}>
        {originalText.replace(/\[\[|\]\]/g, '')}
      </Text>
    )
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 17, color: colors.inkPrimary, lineHeight: 26 }}>
        {displayedText}
      </Text>
      {showCursor && cursorNode}
    </View>
  )
}

function LoadingDots() {
  const { colors } = useTheme()
  const dot1 = useSharedValue(0.3)
  const dot2 = useSharedValue(0.3)
  const dot3 = useSharedValue(0.3)

  useEffect(() => {
    const pulse = (v: typeof dot1, delay: number) => {
      v.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 + delay }),
          withTiming(0.3, { duration: 400 + delay })
        ),
        -1,
        false
      )
    }
    pulse(dot1, 0)
    pulse(dot2, 150)
    pulse(dot3, 300)
  }, [])

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }))
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }))
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }))

  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 24 }}>
      {[s1, s2, s3].map((style, i) => (
        <Animated.View
          key={i}
          style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber }, style]}
        />
      ))}
    </View>
  )
}

export default function LetterCard({
  letter,
  name,
  isLoading,
  error,
}: Props) {
  const { colors } = useTheme()
  const translateY = useSharedValue(30)
  const opacity = useSharedValue(0)
  const cursorOpacity = useSharedValue(1)

  const [displayed, setDisplayed] = useState('')
  const [typingDone, setTypingDone] = useState(false)

  useEffect(() => {
    if (letter || error) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 })
      opacity.value = withTiming(1, { duration: 300 })
    }
  }, [letter, error])

  useEffect(() => {
    if (!letter || isLoading) {
      setDisplayed('')
      setTypingDone(false)
      return
    }

    setDisplayed('')
    setTypingDone(false)

    let activeInterval: ReturnType<typeof setInterval> | null = null
    let active = true

    // Strip [[...]] markers before typewriter so they never appear as characters
    const cleanLetter = letter.replace(/\[\[|\]\]/g, '')

    // Single typewriter — the whole letter types out as one block
    let i = 0
    activeInterval = setInterval(() => {
      if (!active) return
      i++
      setDisplayed(cleanLetter.slice(0, i))
      if (i >= cleanLetter.length) {
        clearInterval(activeInterval!)
        activeInterval = null
        setTypingDone(true)
      }
    }, 16)

    return () => {
      active = false
      if (activeInterval) clearInterval(activeInterval)
    }
  }, [letter, isLoading])

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      false
    )
  }, [])

  const cursorStyle = useAnimatedStyle(() => ({ opacity: cursorOpacity.value }))
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const cursorNode = (
    <Animated.Text
      style={[{ fontFamily: 'Lora_400Regular', fontSize: 17, color: colors.amber, lineHeight: 26 }, cursorStyle]}
    >
      |
    </Animated.Text>
  )

  const errorStyle = {
    fontFamily: 'Lora_400Regular' as const,
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: 'center' as const,
    paddingVertical: 16,
  }

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.inputRow,
          borderRadius: 12,
          padding: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 3,
        },
        !isLoading && cardStyle,
      ]}
      accessibilityLabel="Personal letter"
    >
      {isLoading ? (
        <LoadingDots />
      ) : error === 'blocked' ? (
        <Text style={errorStyle}>
          We weren't able to process that message. Share what's on your heart in your own words.
        </Text>
      ) : error === 'rateLimited' ? (
        <Text style={errorStyle}>
          You've written quite a few letters today. Come back in an hour and there will be more waiting.
        </Text>
      ) : error ? (
        <Text style={errorStyle}>
          Couldn't reach the server. Your verse is still saved.
        </Text>
      ) : letter ? (
        <>
          {/* Keepsake eyebrow + bookmark mark */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 11,
                color: colors.inkMuted,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
              }}
            >
              Something to hold onto
            </Text>
            <Text style={{ fontSize: 15, color: colors.amber }}>❖</Text>
          </View>

          <Text
            style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 15, color: colors.amber, marginBottom: 14 }}
          >
            Dear {name},
          </Text>

          <BodySection
            originalText={letter}
            displayedText={displayed}
            showCursor={!typingDone}
            typingDone={typingDone}
            cursorNode={cursorNode}
          />

          <Text
            style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 14, color: colors.inkMuted, marginTop: 14 }}
          >
            With you in this.
          </Text>
        </>
      ) : null}
    </Animated.View>
  )
}
