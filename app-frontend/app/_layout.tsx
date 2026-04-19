import '../global.css'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
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

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: 'splash',
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

  const [minDelayDone, setMinDelayDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (fontsLoaded && minDelayDone) SplashScreen.hideAsync()
  }, [fontsLoaded, minDelayDone])

  if (!fontsLoaded || !minDelayDone) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FAF8F5' } }}>
      <Stack.Screen name="splash" options={{ animation: 'none' }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in/emotions" options={{ animation: 'fade' }} />
      <Stack.Screen name="check-in/envelope" options={{ animation: 'fade' }} />
      <Stack.Screen name="check-in/message" options={{ animation: 'none' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="register" options={{ animation: 'fade' }} />
      <Stack.Screen name="faith-intro" options={{ animation: 'fade' }} />
    </Stack>
    </GestureHandlerRootView>
  )
}
