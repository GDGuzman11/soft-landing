import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'

export default function OnboardingScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text
        className="text-text-primary text-3xl text-center mb-4"
        style={{ fontFamily: 'Lora_400Regular_Italic' }}
      >
        Soft Landing
      </Text>

      <Text
        className="text-text-secondary text-base text-center mb-12 leading-7"
        style={{ fontFamily: 'DMSans_400Regular' }}
      >
        A quiet space to check in with yourself.{'\n'}
        No feeds. No streaks. Just a note.
      </Text>

      <Pressable
        className="bg-accent px-10 py-4 rounded-full active:opacity-80"
        onPress={() => router.replace('/(tabs)')}
        style={{
          shadowColor: '#C4956A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Text
          className="text-white text-base"
          style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 }}
        >
          Get Started
        </Text>
      </Pressable>
    </View>
  )
}
