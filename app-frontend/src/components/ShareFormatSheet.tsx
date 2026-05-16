import React, { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Props {
  visible: boolean
  onClose: () => void
  onShareText: () => void
  onShareCard: (format: 'square' | 'portrait') => Promise<void>
}

const AMBER = '#C4956A'
const BG = '#FAF8F5'
const INK = '#3D2F2A'
const MUTED = '#9A8880'

export default function ShareFormatSheet({
  visible,
  onClose,
  onShareText,
  onShareCard,
}: Props) {
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(visible)
  const [selectedFormat, setSelectedFormat] = useState<'square' | 'portrait'>('square')
  const [generating, setGenerating] = useState(false)

  const sheetY = useSharedValue(400)
  const scrimOpacity = useSharedValue(0)
  const spinnerRotate = useSharedValue(0)

  // Open animation: mount when visible flips true, animate in.
  useEffect(() => {
    if (visible) {
      setMounted(true)
      // next-frame schedule to ensure mount renders before animating in
      sheetY.value = 400
      scrimOpacity.value = 0
      sheetY.value = withSpring(0, { stiffness: 180, damping: 22, mass: 0.9 })
      scrimOpacity.value = withTiming(1, { duration: 240 })
    } else if (mounted) {
      // External close: animate out, then unmount.
      animateOut()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Spinner rotation while generating
  useEffect(() => {
    if (generating) {
      spinnerRotate.value = 0
      spinnerRotate.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false,
      )
    } else {
      spinnerRotate.value = 0
    }
  }, [generating, spinnerRotate])

  function finishClose() {
    setMounted(false)
    setGenerating(false)
    setSelectedFormat('square')
    onClose()
  }

  function animateOut() {
    scrimOpacity.value = withTiming(0, { duration: 240 })
    sheetY.value = withTiming(
      400,
      { duration: 320, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)()
        }
      },
    )
  }

  function handleClose() {
    if (generating) return
    animateOut()
  }

  async function handlePrimary() {
    if (generating) return
    setGenerating(true)
    try {
      await onShareCard(selectedFormat)
    } finally {
      setGenerating(false)
    }
  }

  function handleSecondary() {
    if (generating) return
    onShareText()
    handleClose()
  }

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }))

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }))

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinnerRotate.value}deg` }],
  }))

  if (!mounted) {
    return null
  }

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Scrim */}
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(61, 47, 42, 0.32)' }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss share sheet"
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: BG,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTopWidth: 1,
              borderColor: 'rgba(196, 149, 106, 0.18)',
              shadowColor: INK,
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.10,
              shadowRadius: 32,
              elevation: 16,
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 24,
            },
            sheetStyle,
          ]}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(154, 136, 128, 0.40)',
              alignSelf: 'center',
              marginTop: 12,
              marginBottom: 28,
            }}
          />

          {/* Title block */}
          <View>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 11,
                letterSpacing: 2.4,
                color: MUTED,
                marginBottom: 6,
              }}
            >
              SHARE
            </Text>
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 22,
                color: INK,
                lineHeight: 28,
              }}
            >
              Where should this land?
            </Text>
          </View>

          {/* Format preview row */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 28 }}>
            <FormatPreview
              format="square"
              selected={selectedFormat === 'square'}
              onSelect={() => setSelectedFormat('square')}
              label="Square"
              subtext="Instagram, iMessage"
            />
            <FormatPreview
              format="portrait"
              selected={selectedFormat === 'portrait'}
              onSelect={() => setSelectedFormat('portrait')}
              label="Portrait"
              subtext="Stories, Threads"
            />
          </View>

          {/* Divider with glyph */}
          <View
            style={{
              marginTop: 32,
              marginBottom: 32,
              height: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 56,
                height: 1,
                backgroundColor: 'rgba(196,149,106,0.30)',
              }}
            />
            <Text
              style={{
                position: 'absolute',
                backgroundColor: BG,
                paddingHorizontal: 6,
                fontFamily: 'DMSans_400Regular',
                fontSize: 10,
                color: AMBER,
              }}
            >
              ✦
            </Text>
          </View>

          {/* Primary CTA */}
          <Pressable
            onPress={handlePrimary}
            disabled={generating}
            accessibilityRole="button"
            accessibilityLabel="Share as image"
            style={({ pressed }) => ({
              width: '100%',
              height: 56,
              backgroundColor: AMBER,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              opacity: pressed && !generating ? 0.85 : 1,
            })}
          >
            {generating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Animated.Text
                  style={[
                    {
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 16,
                      color: BG,
                    },
                    spinnerStyle,
                  ]}
                >
                  ✦
                </Animated.Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 16,
                    color: BG,
                  }}
                >
                  {'  Preparing…'}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 16,
                  color: BG,
                }}
              >
                Share as image
              </Text>
            )}
          </Pressable>

          {/* Secondary action */}
          <Pressable
            onPress={handleSecondary}
            disabled={generating}
            accessibilityRole="button"
            accessibilityLabel="Share as plain text"
            style={({ pressed }) => ({
              width: '100%',
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed && !generating ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: MUTED,
                textAlign: 'center',
              }}
            >
              Share as plain text
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

interface FormatPreviewProps {
  format: 'square' | 'portrait'
  selected: boolean
  onSelect: () => void
  label: string
  subtext: string
}

function FormatPreview({ format, selected, onSelect, label, subtext }: FormatPreviewProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  function handlePressIn() {
    scale.value = withSpring(0.97, { stiffness: 220, damping: 18, mass: 0.6 })
  }

  function handlePressOut() {
    scale.value = withSpring(1, { stiffness: 220, damping: 18, mass: 0.6 })
  }

  const isSquare = format === 'square'

  return (
    <View style={{ flex: 1, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      {/* Selection dot — 8pt above the wrapper top edge */}
      {selected && (
        <View
          style={{
            position: 'absolute',
            top: -3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: AMBER,
          }}
        />
      )}

      <Pressable
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label} format`}
        accessibilityState={{ selected }}
        style={{
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={[
            {
              width: isSquare ? '100%' : '80%',
              aspectRatio: isSquare ? 1 : 4 / 5,
              backgroundColor: BG,
              borderWidth: selected ? 1.5 : 1,
              borderColor: selected ? AMBER : 'rgba(196, 149, 106, 0.40)',
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 12,
            },
            animatedStyle,
          ]}
        >
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 8,
              color: AMBER,
              marginBottom: 8,
            }}
          >
            ✦
          </Text>
          <InkBar widthPct="80%" />
          <View style={{ height: 6 }} />
          <InkBar widthPct="65%" />
          <View style={{ height: 6 }} />
          <InkBar widthPct="50%" />
          <View
            style={{
              marginTop: 10,
              height: 1,
              width: '70%',
              backgroundColor: 'rgba(196,149,106,0.70)',
            }}
          />
        </Animated.View>

        <Text
          style={{
            marginTop: 12,
            fontFamily: 'DMSans_500Medium',
            fontSize: 13,
            color: INK,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: MUTED,
            textAlign: 'center',
          }}
        >
          {subtext}
        </Text>
      </Pressable>
    </View>
  )
}

function InkBar({ widthPct }: { widthPct: `${number}%` }) {
  return (
    <View
      style={{
        height: 2,
        width: widthPct,
        backgroundColor: 'rgba(61,47,42,0.30)',
      }}
    />
  )
}
