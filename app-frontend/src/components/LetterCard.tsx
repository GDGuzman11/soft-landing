import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
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

const PREPARE_STAGES = ['Holding what you shared', 'Finding the right words', 'Writing your reflection'] as const

// Designed loading state: a moon + three staged indicators + a progress meter.
// There is no real progress signal from the letter call, so progress is a
// weighted simulation — quick through stage 1, then it lingers on "Finding the
// right words" so a slow generation stays honest instead of racing to the end.
// It unmounts when the letter arrives and the letter view takes over.
function PreparingLetter() {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState(0)

  const pulse = useSharedValue(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })),
      -1,
      false,
    )
  }, [reduced])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 0.97 + pulse.value * 0.06 }],
  }))
  const dotGlowStyle = useAnimatedStyle(() => ({ opacity: 0.5 + pulse.value * 0.5 }))

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const t = Date.now() - start
      const p = t < 900 ? 0.2 * (t / 900) : 0.2 + 0.72 * (1 - Math.exp(-(t - 900) / 5000))
      const clamped = Math.min(p, 0.93)
      setProgress(clamped)
      setStage(clamped < 0.2 ? 0 : clamped < 0.72 ? 1 : 2)
    }, 60)
    return () => clearInterval(id)
  }, [])

  return (
    <View style={{ paddingVertical: 10, alignItems: 'center' }}>
      <Animated.View
        style={[
          {
            width: 72,
            height: 72,
            borderRadius: 36,
            borderWidth: 1,
            borderColor: colors.amber,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 22,
            shadowColor: colors.amber,
            shadowOpacity: 0.55,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
          },
          glowStyle,
        ]}
      >
        <Text style={{ fontSize: 40, lineHeight: 46, color: colors.amber }}>◐</Text>
      </Animated.View>

      <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 22, color: colors.inkPrimary, marginBottom: 6 }}>
        Preparing your letter
      </Text>
      <Text
        style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, color: colors.inkMuted, marginBottom: 26, textAlign: 'center' }}
      >
        Give me a quiet moment with your words.
      </Text>

      <View style={{ alignSelf: 'stretch', gap: 18, paddingHorizontal: 18, marginBottom: 26 }}>
        {PREPARE_STAGES.map((label, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={[
                  { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
                  active
                    ? {
                        backgroundColor: colors.amber,
                        shadowColor: colors.amber,
                        shadowOpacity: 0.8,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                      }
                    : { borderWidth: 1.5, borderColor: done ? colors.amber : colors.hairline },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color={colors.amber} />
                ) : active ? (
                  <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }, dotGlowStyle]} />
                ) : null}
              </View>
              <Text
                style={{
                  fontFamily: active ? 'DMSans_500Medium' : 'DMSans_400Regular',
                  fontSize: 15,
                  color: active ? colors.inkPrimary : done ? colors.inkMuted : colors.inkSubtle,
                }}
              >
                {label}
              </Text>
            </View>
          )
        })}
      </View>

      <View style={{ alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: colors.hairline, overflow: 'hidden', marginHorizontal: 2 }}>
        <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', borderRadius: 2, backgroundColor: colors.amber }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 }}>
        <Ionicons name="lock-closed-outline" size={12} color={colors.inkSubtle} />
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.inkSubtle }}>
          Your words are safe here — nothing will be lost.
        </Text>
      </View>
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
        <PreparingLetter />
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
            Dear You,
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
