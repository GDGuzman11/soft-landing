import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'

export default function PaywallScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text
        className="text-text-primary text-2xl text-center mb-3"
        style={{ fontFamily: 'DMSans_500Medium' }}
      >
        Soft Landing Premium
      </Text>

      <Text
        className="text-text-secondary text-base text-center mb-10 leading-6"
        style={{ fontFamily: 'DMSans_400Regular' }}
      >
        Unlimited check-ins.{'\n'}Full history. More messages.
      </Text>

      <Pressable
        className="w-full bg-accent rounded-2xl py-4 mb-3 active:opacity-80"
        onPress={() => {}}
      >
        <Text
          className="text-white text-center text-base"
          style={{ fontFamily: 'DMSans_500Medium' }}
        >
          $4.99 / month
        </Text>
      </Pressable>

      <Pressable
        className="w-full border border-accent rounded-2xl py-4 mb-8 active:opacity-80"
        onPress={() => {}}
      >
        <Text
          className="text-accent text-center text-base"
          style={{ fontFamily: 'DMSans_500Medium' }}
        >
          $34.99 / year
        </Text>
        <Text
          className="text-text-secondary text-center text-xs mt-1"
          style={{ fontFamily: 'DMSans_400Regular' }}
        >
          Save 42%
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()} className="active:opacity-60">
        <Text
          className="text-text-secondary text-sm"
          style={{ fontFamily: 'DMSans_400Regular' }}
        >
          Not now
        </Text>
      </Pressable>
    </View>
  )
}
