import { View, Text } from 'react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated'

function navigate() {
  router.replace('/(tabs)')
}

export default function SplashScreen() {
  const glowOpacity = useSharedValue(0)
  const glowScale = useSharedValue(0.6)
  const innerGlowOpacity = useSharedValue(0)
  const crossOpacity = useSharedValue(0)
  const crossScale = useSharedValue(0.75)
  const titleOpacity = useSharedValue(0)
  const titleY = useSharedValue(12)
  const screenOpacity = useSharedValue(1)

  useEffect(() => {
    // Ambient glow blooms in first — slow, heavenly
    glowOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) })
    glowScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) })

    // Inner halo pulses gently in a breathing loop
    innerGlowOpacity.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.25, { duration: 1600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    )

    // Cross rises gently after glow establishes
    crossOpacity.value = withDelay(300, withTiming(1, { duration: 700 }))
    crossScale.value = withDelay(300, withSpring(1, { damping: 18, stiffness: 80 }))

    // Title drifts up softly
    titleOpacity.value = withDelay(800, withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }))
    titleY.value = withDelay(800, withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) }))

    // Hold then fade out
    screenOpacity.value = withDelay(2200, withTiming(0, { duration: 500 }, () => {
      runOnJS(navigate)()
    }))
  }, [])

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }))

  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: innerGlowOpacity.value,
  }))

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
      {/* Outer ambient glow — large, very faint warm bloom */}
      <Animated.View
        style={[{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: '#C4956A',
          opacity: 0,
        }, outerGlowStyle]}
        pointerEvents="none"
      />

      {/* Inner breathing halo */}
      <Animated.View
        style={[{
          position: 'absolute',
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: '#C4956A',
          opacity: 0,
        }, innerGlowStyle]}
        pointerEvents="none"
      />

      {/* Cross */}
      <Animated.View style={[{ alignItems: 'center', marginBottom: 32 }, crossStyle]}>
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

      {/* App name + tagline */}
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
            letterSpacing: 0.5,
          }}
        >
          Find rest in His Word.
        </Text>
      </Animated.View>
    </Animated.View>
  )
}
