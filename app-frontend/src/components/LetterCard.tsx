import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import { useEffect, useState } from 'react'

type Props = {
  letter: string | null
  name: string
  isLoading: boolean
  error: 'network' | 'blocked' | 'rateLimited' | null
  onRetry?: () => void
  verseBody?: string
  verseReference?: string
}

function splitAtFirstParagraph(letter: string): { before: string; after: string } {
  const idx = letter.indexOf('\n\n')
  if (idx === -1) return { before: letter, after: '' }
  return {
    before: letter.slice(0, idx).trim(),
    after: letter.slice(idx).trim(),
  }
}

function PullQuote({
  verseBody,
  verseReference,
  visible,
}: {
  verseBody: string
  verseReference: string
  visible: boolean
}) {
  const washOpacity = useSharedValue(0)
  const topScale = useSharedValue(0.4)
  const bottomScale = useSharedValue(0.4)
  const verseOpacity = useSharedValue(0)
  const verseTranslateY = useSharedValue(8)
  const refOpacity = useSharedValue(0)

  useEffect(() => {
    if (!visible) return
    washOpacity.value = withDelay(150, withTiming(1, { duration: 700 }))
    topScale.value = withDelay(150, withTiming(1, { duration: 600 }))
    bottomScale.value = withDelay(220, withTiming(1, { duration: 600 }))
    verseOpacity.value = withDelay(350, withSpring(1, { damping: 18, stiffness: 120 }))
    verseTranslateY.value = withDelay(350, withSpring(0, { damping: 18, stiffness: 120 }))
    refOpacity.value = withDelay(650, withTiming(1, { duration: 400 }))
  }, [visible])

  const washStyle = useAnimatedStyle(() => ({ opacity: washOpacity.value }))
  const topHairStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: topScale.value }] }))
  const bottomHairStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: bottomScale.value }] }))
  const verseStyle = useAnimatedStyle(() => ({
    opacity: verseOpacity.value,
    transform: [{ translateY: verseTranslateY.value }],
  }))
  const refStyle = useAnimatedStyle(() => ({ opacity: refOpacity.value }))

  // Strip existing quote chars and wrap in curly quotes
  const stripped = verseBody.replace(/^[“”‘’"']+|[“”‘’"']+$/g, '')
  const formattedVerse = `“${stripped}”`

  return (
    <Animated.View
      style={[
        {
          backgroundColor: '#FBF6ED',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          marginVertical: 20,
        },
        washStyle,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Verse: ${verseBody}, ${verseReference}`}
    >
      {/* Top hairline */}
      <Animated.View
        style={[
          { height: 1, backgroundColor: '#C4956A', opacity: 0.6, marginHorizontal: 40, marginBottom: 20 },
          topHairStyle,
        ]}
      />

      {/* Verse text */}
      <Animated.Text
        style={[
          {
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 19,
            color: '#1A1A1A',
            lineHeight: 30,
            textAlign: 'center',
          },
          verseStyle,
        ]}
      >
        {formattedVerse}
      </Animated.Text>

      {/* Reference */}
      <Animated.Text
        style={[
          {
            fontFamily: 'DMSans_500Medium',
            fontSize: 11,
            color: '#C4956A',
            letterSpacing: 2,
            textAlign: 'center',
            textTransform: 'uppercase',
            marginTop: 12,
          },
          refStyle,
        ]}
      >
        {verseReference}
      </Animated.Text>

      {/* Bottom hairline */}
      <Animated.View
        style={[
          { height: 1, backgroundColor: '#C4956A', opacity: 0.6, marginHorizontal: 40, marginTop: 20 },
          bottomHairStyle,
        ]}
      />
    </Animated.View>
  )
}

function LoadingDots() {
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
          style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#C4956A' }, style]}
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
  verseBody,
  verseReference,
}: Props) {
  const translateY = useSharedValue(30)
  const opacity = useSharedValue(0)
  const cursorOpacity = useSharedValue(1)

  const [displayedBefore, setDisplayedBefore] = useState('')
  const [displayedAfter, setDisplayedAfter] = useState('')
  const [pullQuoteVisible, setPullQuoteVisible] = useState(false)
  const [typingPhase, setTypingPhase] = useState<'before' | 'after' | 'done'>('before')

  const hasPullQuote = !!verseBody && !!verseReference

  useEffect(() => {
    if (letter || error) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 })
      opacity.value = withTiming(1, { duration: 300 })
    }
  }, [letter, error])

  useEffect(() => {
    if (!letter || isLoading) {
      setDisplayedBefore('')
      setDisplayedAfter('')
      setPullQuoteVisible(false)
      setTypingPhase('before')
      return
    }

    setDisplayedBefore('')
    setDisplayedAfter('')
    setPullQuoteVisible(false)
    setTypingPhase('before')

    let activeInterval: ReturnType<typeof setInterval> | null = null
    let activeTimeout: ReturnType<typeof setTimeout> | null = null
    let active = true

    if (!hasPullQuote) {
      // Simple typewriter — full letter as one block
      let i = 0
      activeInterval = setInterval(() => {
        if (!active) return
        i++
        setDisplayedBefore(letter.slice(0, i))
        if (i >= letter.length) {
          clearInterval(activeInterval!)
          activeInterval = null
          setTypingPhase('done')
        }
      }, 18)
    } else {
      const { before, after } = splitAtFirstParagraph(letter)

      // Phase 1: type paragraph 1
      let i = 0
      activeInterval = setInterval(() => {
        if (!active) return
        i++
        setDisplayedBefore(before.slice(0, i))
        if (i >= before.length) {
          clearInterval(activeInterval!)
          activeInterval = null
          // Narrative beat before pull-quote blooms in
          activeTimeout = setTimeout(() => {
            if (!active) return
            setPullQuoteVisible(true)
            // Wait for animation to settle (~1100ms) then type paragraph 2+3
            activeTimeout = setTimeout(() => {
              if (!active) return
              setTypingPhase('after')
              let j = 0
              activeInterval = setInterval(() => {
                if (!active) return
                j++
                setDisplayedAfter(after.slice(0, j))
                if (j >= after.length) {
                  clearInterval(activeInterval!)
                  activeInterval = null
                  setTypingPhase('done')
                }
              }, 18)
            }, 1100)
          }, 150)
        }
      }, 18)
    }

    return () => {
      active = false
      if (activeInterval) clearInterval(activeInterval)
      if (activeTimeout) clearTimeout(activeTimeout)
    }
  }, [letter, isLoading, hasPullQuote])

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

  const typingDone = typingPhase === 'done'

  const cursorNode = (
    <Animated.Text
      style={[{ fontFamily: 'Lora_400Regular', fontSize: 17, color: '#C4956A', lineHeight: 26 }, cursorStyle]}
    >
      |
    </Animated.Text>
  )

  const errorStyle = {
    fontFamily: 'Lora_400Regular' as const,
    fontSize: 15,
    color: '#9A8F82',
    textAlign: 'center' as const,
    paddingVertical: 16,
  }

  return (
    <Animated.View
      style={[
        {
          backgroundColor: '#F5F0E8',
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
          <Text
            style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 15, color: '#C4956A', marginBottom: 14 }}
          >
            Dear {name},
          </Text>

          {/* Paragraph 1 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 17, color: '#1A1A1A', lineHeight: 26 }}>
              {displayedBefore}
            </Text>
            {!typingDone && typingPhase === 'before' && cursorNode}
          </View>

          {/* Verse pull-quote */}
          {hasPullQuote && pullQuoteVisible && (
            <PullQuote
              verseBody={verseBody!}
              verseReference={verseReference!}
              visible={pullQuoteVisible}
            />
          )}

          {/* Paragraph 2 + 3 */}
          {displayedAfter.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 17, color: '#1A1A1A', lineHeight: 26 }}>
                {displayedAfter}
              </Text>
              {!typingDone && typingPhase === 'after' && cursorNode}
            </View>
          )}

          <Text
            style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 14, color: '#9A8F82', marginTop: 14 }}
          >
            With you in this.
          </Text>
        </>
      ) : null}
    </Animated.View>
  )
}
