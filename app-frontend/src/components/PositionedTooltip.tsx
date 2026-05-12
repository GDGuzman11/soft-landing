import { View, Text, Pressable, Dimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { useTheme } from '@/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const BUBBLE_WIDTH = 240
const ARROW_SIZE = 10
const GAP = 14

type Props = {
  text: string
  buttonLabel?: string
  onDismiss: () => void
  /** Absolute screen Y of the anchor element's top edge (from measure() pageY) */
  anchorY: number
  /** Horizontal center of the anchor element. Defaults to screen center. */
  anchorCenterX?: number
  /** Whether bubble appears above or below the anchor. Defaults to 'above'. */
  placement?: 'above' | 'below'
}

export default function PositionedTooltip({
  text,
  buttonLabel = 'Got it →',
  onDismiss,
  anchorY,
  anchorCenterX = SCREEN_WIDTH / 2,
  placement = 'above',
}: Props) {
  const { colors } = useTheme()
  const scale = useSharedValue(0.85)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 200 })
    opacity.value = withTiming(1, { duration: 220 })
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  // Keep bubble inside screen horizontally
  const bubbleLeft = Math.max(
    16,
    Math.min(SCREEN_WIDTH - BUBBLE_WIDTH - 16, anchorCenterX - BUBBLE_WIDTH / 2),
  )

  // Arrow offset relative to bubble left edge, clamped inside bubble
  const arrowCenter = anchorCenterX - bubbleLeft
  const arrowLeft = Math.max(ARROW_SIZE + 4, Math.min(BUBBLE_WIDTH - ARROW_SIZE * 3, arrowCenter - ARROW_SIZE))

  const positionStyle = placement === 'above'
    ? { bottom: SCREEN_HEIGHT - anchorY + GAP }
    : { top: anchorY + GAP }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: bubbleLeft,
          width: BUBBLE_WIDTH,
          zIndex: 200,
        },
        positionStyle,
        animStyle,
      ]}
    >
      {/* Upward arrow for 'below' placement */}
      {placement === 'below' && (
        <View
          style={{
            position: 'absolute',
            top: -ARROW_SIZE,
            left: arrowLeft,
            width: 0,
            height: 0,
            borderLeftWidth: ARROW_SIZE,
            borderRightWidth: ARROW_SIZE,
            borderBottomWidth: ARROW_SIZE,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: colors.amber,
          }}
        />
      )}

      {/* Bubble body */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.amber,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: colors.inkPrimary,
            lineHeight: 22,
            marginBottom: buttonLabel ? 12 : 0,
          }}
        >
          {text}
        </Text>
        {!!buttonLabel && (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            style={({ pressed }) => ({
              backgroundColor: colors.amber,
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 8,
              alignSelf: 'flex-end',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#FFFFFF' }}>
              {buttonLabel}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Downward arrow for 'above' placement */}
      {placement === 'above' && (
        <View
          style={{
            position: 'absolute',
            bottom: -ARROW_SIZE,
            left: arrowLeft,
            width: 0,
            height: 0,
            borderLeftWidth: ARROW_SIZE,
            borderRightWidth: ARROW_SIZE,
            borderTopWidth: ARROW_SIZE,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: colors.amber,
          }}
        />
      )}
    </Animated.View>
  )
}
