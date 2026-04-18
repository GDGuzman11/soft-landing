import '../global.css'
import { Stack, router } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import 'react-native-reanimated'
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora'
import { getSettings } from '@/storage/storage'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
  })
  const [settingsChecked, setSettingsChecked] = useState(false)

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (!fontsLoaded) return

    getSettings().then((settings) => {
      setSettingsChecked(true)
      SplashScreen.hideAsync()
      if (!settings.onboardingComplete) {
        router.replace('/onboarding')
      }
    })
  }, [fontsLoaded])

  if (!fontsLoaded || !settingsChecked) return null

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAF8F5' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in/emotions" options={{ animation: 'fade' }} />
      <Stack.Screen name="check-in/envelope" options={{ animation: 'fade' }} />
      <Stack.Screen name="check-in/message" options={{ animation: 'none' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
    </Stack>
  )
}
