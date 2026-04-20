import { View, Text, Pressable, Alert } from 'react-native'
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

export default function WelcomeScreen() {
  const outerGlowOpacity = useSharedValue(0)
  const innerGlowOpacity = useSharedValue(0.06)
  const crossOpacity = useSharedValue(0)
  const crossScale = useSharedValue(0.75)
  const titleOpacity = useSharedValue(0)
  const titleY = useSharedValue(12)
  const buttonsOpacity = useSharedValue(0)
  const buttonsY = useSharedValue(16)

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      router.replace('/(tabs)')
      return
    }

    outerGlowOpacity.value = withTiming(0.12, { duration: 1000, easing: Easing.out(Easing.quad) })

    innerGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.06, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    )

    crossOpacity.value = withDelay(200, withTiming(1, { duration: 600 }))
    crossScale.value = withDelay(200, withSpring(1, { damping: 18, stiffness: 80 }))

    titleOpacity.value = withDelay(600, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }))
    titleY.value = withDelay(600, withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }))

    buttonsOpacity.value = withDelay(1400, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }))
    buttonsY.value = withDelay(1400, withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }))
  }, [])

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: outerGlowOpacity.value,
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

      <Animated.View style={[{ alignItems: 'center', marginBottom: 32 }, crossStyle]}>
        <View style={{ width: 52, height: 68, position: 'relative', alignItems: 'center' }}>
          <View
            style={{
              position: 'absolute',
              width: 5,
              height: 68,
              backgroundColor: '#C4956A',
              borderRadius: 2.5,
              alignSelf: 'center',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 36,
              height: 5,
              backgroundColor: '#C4956A',
              borderRadius: 2.5,
              top: 18,
              alignSelf: 'center',
            }}
          />
        </View>
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center', marginBottom: 56 }, titleStyle]}>
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 30,
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
