import { View, Text, ActivityIndicator } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useEffect, useRef, useState } from 'react'

type Props = {
  letter: string | null
  name: string
  isLoading: boolean
  error: 'network' | null
  onRetry?: () => void
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

export default function LetterCard({ letter, name, isLoading, error }: Props) {
  const translateY = useSharedValue(30)
  const opacity = useSharedValue(0)

  const [displayedText, setDisplayedText] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cursorOpacity = useSharedValue(1)

  useEffect(() => {
    if (letter || error) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 })
      opacity.value = withTiming(1, { duration: 300 })
    }
  }, [letter, error])

  useEffect(() => {
    if (!letter || isLoading) { setDisplayedText(''); return }
    setDisplayedText('')
    let i = 0
    intervalRef.current = setInterval(() => {
      i++
      setDisplayedText(letter.slice(0, i))
      if (i >= letter.length) clearInterval(intervalRef.current!)
    }, 18)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
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

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }))

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

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
      ) : error ? (
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 15,
            color: '#9A8F82',
            textAlign: 'center',
            paddingVertical: 16,
          }}
        >
          Couldn't reach the server. Your verse is still saved.
        </Text>
      ) : letter ? (
        <>
          <Text
            style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 15, color: '#C4956A', marginBottom: 14 }}
          >
            Dear {name},
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: 'Lora_400Regular',
                fontSize: 17,
                color: '#1A1A1A',
                lineHeight: 26,
              }}
            >
              {displayedText}
            </Text>
            {displayedText.length < (letter?.length ?? 0) && (
              <Animated.Text
                style={[
                  {
                    fontFamily: 'Lora_400Regular',
                    fontSize: 17,
                    color: '#C4956A',
                    lineHeight: 26,
                  },
                  cursorStyle,
                ]}
              >
                |
              </Animated.Text>
            )}
          </View>

          <Text
            style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: 14,
              color: '#9A8F82',
              marginTop: 14,
            }}
          >
            With you in this.
          </Text>
        </>
      ) : null}

      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: '#C4B59A',
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        Written by AI for spiritual encouragement only.
      </Text>
    </Animated.View>
  )
}
