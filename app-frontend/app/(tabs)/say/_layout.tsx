import { Stack } from 'expo-router'

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
