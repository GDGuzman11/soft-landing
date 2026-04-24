import { View, Text, Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'

type SymbolRow = { symbol: string; label: string }

type Props = {
  text?: string
  rows?: SymbolRow[]
  buttonLabel?: string
  onDismiss: () => void
}

export default function TourTooltip({ text, rows, buttonLabel = 'Got it →', onDismiss }: Props) {
  const translateY = useSharedValue(100)
  const opacity = useSharedValue(0)
  const overlayOpacity = useSharedValue(0)

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 300 })
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 })
    opacity.value = withTiming(1, { duration: 300 })
  }, [])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }))

  function dismiss() {
    overlayOpacity.value = withTiming(0, { duration: 200 })
    translateY.value = withTiming(100, { duration: 250 })
    opacity.value = withTiming(0, { duration: 200 })
    setTimeout(onDismiss, 260)
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {/* Dim overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(30, 20, 15, 0.18)',
          },
          overlayStyle,
        ]}
      />

      {/* Tooltip card */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#F5F0E8',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 28,
            paddingTop: 20,
            paddingBottom: 44,
            alignItems: 'center',
          },
          cardStyle,
        ]}
      >
        {/* Drag handle */}
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#D9D0C4',
            marginBottom: 20,
          }}
        />

        {/* Ornament */}
        <Text
          style={{
            fontSize: 13,
            color: '#C4956A',
            marginBottom: 12,
            opacity: 0.8,
          }}
        >
          ✦
        </Text>

        {/* Text body */}
        {text ? (
          <Text
            style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: 17,
              color: '#3D2F2A',
              textAlign: 'center',
              lineHeight: 26,
              marginBottom: 24,
              maxWidth: 300,
            }}
          >
            {text}
          </Text>
        ) : null}

        {/* Symbol rows */}
        {rows ? (
          <View style={{ width: '100%', marginBottom: 24, gap: 14 }}>
            {rows.map((row) => (
              <View
                key={row.symbol}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  paddingHorizontal: 8,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: '#EDE8E0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 20,
                      color: '#3D2F2A',
                    }}
                  >
                    {row.symbol}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: 'Lora_400Regular_Italic',
                    fontSize: 15,
                    color: '#3D2F2A',
                    lineHeight: 22,
                    flex: 1,
                  }}
                >
                  {row.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Action button */}
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          style={({ pressed }) => ({
            backgroundColor: '#C4956A',
            borderRadius: 24,
            paddingHorizontal: 32,
            paddingVertical: 12,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 14,
              color: '#FFFFFF',
            }}
          >
            {buttonLabel}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}
