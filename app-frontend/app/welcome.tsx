import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import * as WebBrowser from 'expo-web-browser'
import { getCurrentUser } from '@/services/auth'
import { getSettings, saveSettings } from '@/storage/storage'

WebBrowser.maybeCompleteAuthSession()

const RING_BASE = 100
const RING_DURATION = 3500
const RING_OFFSET = RING_DURATION / 2

export default function WelcomeScreen() {
  const outerGlowOpacity = useSharedValue(0)
  const innerGlowOpacity = useSharedValue(0.06)

  // Option 2 — ripple rings
  const ring1Scale = useSharedValue(0.6)
  const ring1Opacity = useSharedValue(0)
  const ring2Scale = useSharedValue(0.6)
  const ring2Opacity = useSharedValue(0)

  // Option 4 — cross border glow
  const crossGlowOpacity = useSharedValue(0)

  const crossOpacity = useSharedValue(0)
  const crossScale = useSharedValue(0.75)
  const titleOpacity = useSharedValue(0)
  const titleY = useSharedValue(12)
  const buttonsOpacity = useSharedValue(0)
  const buttonsY = useSharedValue(16)

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      if (!user.emailVerified) {
        router.replace('/verify-email')
      } else {
        router.replace('/(tabs)')
      }
      return
    }

    // Ambient background glow
    outerGlowOpacity.value = withTiming(0.12, { duration: 1000, easing: Easing.out(Easing.quad) })
    innerGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.06, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    )

    // Option 2 — ripple ring 1 (starts at 800ms after mount)
    ring1Scale.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(2.4, { duration: RING_DURATION, easing: Easing.out(Easing.cubic) })
      ),
      -1,
      false
    ))
    ring1Opacity.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(0.22, { duration: 0 }),
        withTiming(0, { duration: RING_DURATION, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    ))

    // Option 2 — ripple ring 2 (offset by half a cycle for continuous flow)
    ring2Scale.value = withDelay(800 + RING_OFFSET, withRepeat(
      withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(2.4, { duration: RING_DURATION, easing: Easing.out(Easing.cubic) })
      ),
      -1,
      false
    ))
    ring2Opacity.value = withDelay(800 + RING_OFFSET, withRepeat(
      withSequence(
        withTiming(0.22, { duration: 0 }),
        withTiming(0, { duration: RING_DURATION, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    ))

    // Option 4 — cross glow breathes in sync with inner halo
    crossGlowOpacity.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(0.45, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.12, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    ))

    crossOpacity.value = withDelay(200, withTiming(1, { duration: 600 }))
    crossScale.value = withDelay(200, withSpring(1, { damping: 18, stiffness: 80 }))

    titleOpacity.value = withDelay(600, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }))
    titleY.value = withDelay(600, withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }))

    buttonsOpacity.value = withDelay(1400, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }))
    buttonsY.value = withDelay(1400, withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }))
  }, [])

  const outerGlowStyle = useAnimatedStyle(() => ({ opacity: outerGlowOpacity.value }))
  const innerGlowStyle = useAnimatedStyle(() => ({ opacity: innerGlowOpacity.value }))

  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }))
  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }))

  const crossGlowStyle = useAnimatedStyle(() => ({ opacity: crossGlowOpacity.value }))

  const crossStyle = useAnimatedStyle(() => ({
    opacity: crossOpacity.value,
    transform: [{ scale: crossScale.value }],
  }))

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }))

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsY.value }],
  }))

  async function handleGuest() {
    try {
      const settings = await getSettings()
      await saveSettings({ ...(settings as any), isGuest: true })
    } catch {
      // non-fatal
    }
    router.replace('/(tabs)')
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FAF8F5',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      {/* Ambient background bloom */}
      <Animated.View
        style={[{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: '#FFFFFF',
        }, outerGlowStyle]}
        pointerEvents="none"
      />
      <Animated.View
        style={[{
          position: 'absolute',
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: '#FFFFFF',
        }, innerGlowStyle]}
        pointerEvents="none"
      />

      {/* Option 2 — ripple rings */}
      <Animated.View
        style={[{
          position: 'absolute',
          width: RING_BASE,
          height: RING_BASE,
          borderRadius: RING_BASE / 2,
          borderWidth: 1,
          borderColor: '#FFFFFF',
        }, ring1Style]}
        pointerEvents="none"
      />
      <Animated.View
        style={[{
          position: 'absolute',
          width: RING_BASE,
          height: RING_BASE,
          borderRadius: RING_BASE / 2,
          borderWidth: 1,
          borderColor: '#FFFFFF',
        }, ring2Style]}
        pointerEvents="none"
      />

      {/* Cross + Option 4 glow layer */}
      <Animated.View style={[{ alignItems: 'center', marginBottom: 32 }, crossStyle]}>
        <View style={{ width: 52, height: 68, position: 'relative', alignItems: 'center' }}>

          {/* Option 4 — glowing cross border (white bloom behind real cross) */}
          <Animated.View style={[{ position: 'absolute', alignItems: 'center', width: 52, height: 68 }, crossGlowStyle]}>
            <View style={{
              position: 'absolute',
              width: 11,
              height: 76,
              backgroundColor: '#FFFFFF',
              borderRadius: 5.5,
              alignSelf: 'center',
              top: -4,
            }} />
            <View style={{
              position: 'absolute',
              width: 44,
              height: 11,
              backgroundColor: '#FFFFFF',
              borderRadius: 5.5,
              top: 14,
              alignSelf: 'center',
            }} />
          </Animated.View>

          {/* Real cross */}
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

      {/* Title + tagline */}
      <Animated.View style={[{ alignItems: 'center', marginBottom: 56 }, titleStyle]}>
        <Text style={{
          fontFamily: 'Lora_400Regular_Italic',
          fontSize: 30,
          color: '#1A1A1A',
          letterSpacing: 0.3,
        }}>
          Soft Landing
        </Text>
        <Text style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 13,
          color: '#A09080',
          marginTop: 8,
          letterSpacing: 0.5,
        }}>
          Find rest in His Word.
        </Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[{ width: '100%', alignItems: 'center', gap: 12 }, buttonsStyle]}>
        <Pressable
          onPress={() => router.push('/register')}
          className="active:opacity-80"
          style={{
            backgroundColor: '#C4956A',
            borderRadius: 9999,
            paddingHorizontal: 40,
            paddingVertical: 16,
            width: '100%',
            alignItems: 'center',
            shadowColor: '#C4956A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
          accessibilityRole="button"
          accessibilityLabel="Create Account"
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
            Create Account
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/sign-in')}
          className="active:opacity-80"
          style={{
            backgroundColor: 'transparent',
            borderRadius: 9999,
            paddingHorizontal: 40,
            paddingVertical: 16,
            width: '100%',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#C4956A',
          }}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#C4956A' }}>
            Sign In
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGuest}
          className="active:opacity-80"
          style={{ marginTop: 8, paddingVertical: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Continue as Guest"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#C0A898' }}>
            Continue as Guest
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}
