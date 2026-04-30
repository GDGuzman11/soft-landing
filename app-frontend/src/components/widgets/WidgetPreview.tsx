import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'

type Props = {
  children: React.ReactNode
  width: number
  height: number
  isActive: boolean
}

const SPRING_CONFIG = { stiffness: 80, damping: 14 } as const

export default function WidgetPreview({ children, width, height, isActive }: Props) {
  const scale = useSharedValue(isActive ? 1 : 0.85)
  const opacity = useSharedValue(isActive ? 1 : 0.75)

  useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.85, SPRING_CONFIG)
    opacity.value = withSpring(isActive ? 1 : 0.75, SPRING_CONFIG)
  }, [isActive, scale, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        styles.container,
        { width, height },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  )
}

// StyleSheet used here because Reanimated's animated style is composed via array
// style prop and the static shadow tokens are not expressible as NativeWind classes.
const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FAF8F5',
    shadowColor: '#3D2F2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
})
