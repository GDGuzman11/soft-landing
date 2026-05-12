import { View, Text, Pressable, Image, Dimensions } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSettings, saveSettings, getSavedMessages } from '@/storage/storage'
import type { AppSettings } from '@/types'
import { getCurrentUser } from '@/services/auth'
import PositionedTooltip from '@/components/PositionedTooltip'
import { useTheme } from '@/theme'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

const SCREEN_WIDTH = Dimensions.get('window').width
// Path tab is the 2nd of 4 tabs; its horizontal centre sits at 37.5% of screen width
const PATH_TAB_CENTER_X = SCREEN_WIDTH * 0.375

function getGreetingBase(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning,'
  if (hour < 17) return 'Good afternoon,'
  return 'Good evening,'
}

export default function HomeScreen() {
  const { colors } = useTheme()
  const { tourStep } = useLocalSearchParams<{ tourStep?: string }>()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [showTourTooltip, setShowTourTooltip] = useState(tourStep === '5')
  const [buttonAnchorY, setButtonAnchorY] = useState(0)
  const checkInButtonRef = useRef<View>(null)
  const navigationChecked = useRef(false)
  const greetingOpacity = useSharedValue(0)
  const greetingY = useSharedValue(12)
  const buttonOpacity = useSharedValue(0)
  const buttonY = useSharedValue(16)
  const peopleOpacity = useSharedValue(0)
  const pathPulse = useSharedValue(1)
  const showPathTip = tourStep === 'path'

  useEffect(() => {
    if (!navigationChecked.current) {
      navigationChecked.current = true
      getSettings()
        .then((s) => {
          setSettings(s)
          const user = getCurrentUser()
          const isGuest = s.isGuest

          if (!s.name && user?.displayName) {
            saveSettings({ ...s, name: user.displayName })
              .then(() => setSettings(prev => prev ? { ...prev, name: user.displayName! } : prev))
              .catch(() => {})
          }

          if (!user && !isGuest) {
            router.replace('/welcome')
          } else if (!s.disclaimerAccepted) {
            router.replace('/onboarding-disclaimer')
          } else if (!s.onboardingComplete) {
            router.replace('/onboarding')
          } else if (!s.profileComplete) {
            router.replace('/onboarding-profile')
          } else if (!s.faithIntroComplete) {
            router.replace('/faith-intro')
          }
        })
        .catch(() => {})
    }

    greetingOpacity.value = withTiming(1, { duration: 600 })
    greetingY.value = withTiming(0, { duration: 600 })
    buttonOpacity.value = withDelay(300, withTiming(1, { duration: 500 }))
    buttonY.value = withDelay(300, withSpring(0, { damping: 20, stiffness: 160 }))

    getSavedMessages().then(msgs => setSavedCount(msgs.length)).catch(() => {})

    if (showPathTip) {
      pathPulse.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 750 }),
          withTiming(1, { duration: 750 }),
        ),
        -1,
        true,
      )
    }

    if (tourStep === '5') {
      const t = setTimeout(() => {
        checkInButtonRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
          setButtonAnchorY(pageY)
        })
      }, 700)
      return () => clearTimeout(t)
    }
  }, [])

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingY.value }],
  }))

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonY.value }],
  }))

  const peopleStyle = useAnimatedStyle(() => ({ opacity: peopleOpacity.value }))

  const pathPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pathPulse.value }],
    opacity: 2 - pathPulse.value,
  }))

  useFocusEffect(
    useCallback(() => {
      peopleOpacity.value = 0
      peopleOpacity.value = withDelay(300, withTiming(0.35, { duration: 2000 }))
    }, [peopleOpacity])
  )

  function handleCheckIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push('/check-in/emotions')
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
      accessibilityLabel="Home screen"
    >
      <Animated.Image
        source={require('../../assets/images/boy.png')}
        style={[{
          position: 'absolute',
          top: 0,
          left: -SCREEN_WIDTH * 0.1,
          width: SCREEN_WIDTH * 1.0,
          height: SCREEN_WIDTH * 1.0,
          zIndex: 0,
        }, peopleStyle]}
        resizeMode="contain"
      />
      <Animated.Image
        source={require('../../assets/images/girl.png')}
        style={[{
          position: 'absolute',
          bottom: 0,
          right: -SCREEN_WIDTH * 0.08,
          width: SCREEN_WIDTH * 0.82,
          height: SCREEN_WIDTH * 0.82,
          zIndex: 0,
        }, peopleStyle]}
        resizeMode="contain"
      />
      <Animated.View
        style={[{ alignItems: 'center', marginBottom: savedCount > 0 ? 16 : 64, zIndex: 1 }, greetingStyle]}
        accessibilityRole="header"
      >
        <Image
          source={require('../../assets/images/icon-nobackground.png')}
          style={{
            width: 80,
            height: 80,
            marginBottom: 20,
            alignSelf: 'center',
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 13,
            color: colors.inkMuted,
            textAlign: 'center',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          {getGreetingBase()}
        </Text>
        {settings?.name ? (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 32,
              color: colors.inkPrimary,
              textAlign: 'center',
              letterSpacing: 1.5,
            }}
          >
            {settings.name}
          </Text>
        ) : null}
      </Animated.View>

      {savedCount > 0 && (
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 13,
            color: colors.inkMuted,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          ✦  {savedCount} moment{savedCount === 1 ? '' : 's'} of grace  ✦
        </Text>
      )}

      <View ref={checkInButtonRef}>
      <Animated.View style={[buttonStyle, { zIndex: 1 }]}>
        <Pressable
          onPress={handleCheckIn}
          className="bg-accent px-10 py-4 rounded-full"
          style={({ pressed }) => ({
            shadowColor: '#C4956A',
            shadowOffset: { width: 0, height: pressed ? 2 : 6 },
            shadowOpacity: pressed ? 0.2 : 0.35,
            shadowRadius: pressed ? 8 : 14,
            elevation: pressed ? 3 : 8,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
          accessibilityRole="button"
          accessibilityLabel="Start a check-in"
          accessibilityHint="Opens the emotion picker"
        >
          <Text
            className="text-white text-base"
            style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 }}
          >
            Check In
          </Text>
        </Pressable>
      </Animated.View>
      </View>

      {showTourTooltip && buttonAnchorY > 0 && (
        <PositionedTooltip
          text="This is where you return each day. Tap to name how you're feeling — a verse arrives sealed, chosen for this moment."
          buttonLabel="Create an account →"
          anchorY={buttonAnchorY}
          placement="above"
          onDismiss={() => {
            setShowTourTooltip(false)
            router.replace('/register')
          }}
        />
      )}

      {/* Path tab indicator — shown after tour saves a verse */}
      {showPathTip && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 6,
            left: PATH_TAB_CENTER_X - 40,
            width: 80,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 10,
              color: colors.amber,
              letterSpacing: 0.5,
              marginBottom: 5,
              textAlign: 'center',
            }}
          >
            your verse
          </Text>
          <Animated.View
            style={[
              {
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 2,
                borderColor: colors.amber,
              },
              pathPulseStyle,
            ]}
          />
          <Text style={{ fontSize: 9, color: colors.amber, marginTop: 3, opacity: 0.7 }}>▼</Text>
        </View>
      )}
    </View>
  )
}
