import { Stack } from 'expo-router'

// Keep the lobby (index) at the base of the Say stack even when a child route is
// opened via a deep navigation (e.g. a letter's "Talk to a voice"), so Back walks
// thread → persona list → lobby instead of exiting to Home.
export const unstable_settings = { initialRouteName: 'index' }

export default function SayLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Persona lobby — the 4 voice cards */}
      <Stack.Screen name="index" />
      {/* Chat list for a persona */}
      <Stack.Screen name="[personaId]/index" />
      {/* A single chat thread */}
      <Stack.Screen name="[personaId]/[chatId]" />
    </Stack>
  )
}
