import { View, Text } from 'react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'

function navigate() {
  router.replace('/(tabs)')
}

export default function SplashScreen() {
  const crossOpacity = useSharedValue(0)
  const crossScale = useSharedValue(0.7)
  const titleOpacity = useSharedValue(0)
  const titleY = useSharedValue(10)
  const screenOpacity = useSharedValue(1)

  useEffect(() => {
    // Cross appears first
    crossOpacity.value = withTiming(1, { duration: 600 })
    crossScale.value = withSpring(1, { damping: 16, stiffness: 90 })

    // Title fades in after cross
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 700 }))
    titleY.value = withDelay(400, withTiming(0, { duration: 700 }))

    // Hold, then fade out and navigate
    screenOpacity.value = withDelay(1800, withTiming(0, { duration: 500 }, () => {
      runOnJS(navigate)()
    }))
  }, [])

  const crossStyle = useAnimatedStyle(() => ({
    opacity: crossOpacity.value,
    transform: [{ scale: crossScale.value }],
  }))

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }))

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }))

  return (
    <Animated.View
      style={[{
        flex: 1,
        backgroundColor: '#FAF8F5',
        alignItems: 'center',
        justifyContent: 'center',
      }, screenStyle]}
    >
      {/* Cross */}
      <Animated.View style={[{ alignItems: 'center', marginBottom: 28 }, crossStyle]}>
        <View style={{ width: 52, height: 68, position: 'relative', alignItems: 'center' }}>
          <View style={{
            position: 'absolute',
            width: 5,
            height: 68,
            backgroundColor: '#C4956A',
            borderRadius: 2.5,
            alignSelf: 'center',
          }} />
          <View style={{
            position: 'absolute',
            width: 36,
            height: 5,
            backgroundColor: '#C4956A',
            borderRadius: 2.5,
            top: 18,
            alignSelf: 'center',
          }} />
        </View>
      </Animated.View>

      {/* App name */}
      <Animated.View style={[{ alignItems: 'center' }, titleStyle]}>
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 32,
            color: '#1A1A1A',
            letterSpacing: 0.3,
          }}
        >
          Soft Landing
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 13,
            color: '#A09080',
            marginTop: 8,
            letterSpacing: 0.4,
          }}
        >
          Find rest in His Word.
        </Text>
      </Animated.View>
    </Animated.View>
  )
}
