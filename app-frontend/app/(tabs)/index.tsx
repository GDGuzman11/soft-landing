import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 17) return 'Good afternoon.'
  return 'Good evening.'
}

export default function HomeScreen() {
  const [greeting, setGreeting] = useState(getGreeting())

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text
        className="text-text-primary text-3xl mb-16"
        style={{ fontFamily: 'DMSans_400Regular', letterSpacing: -0.5 }}
      >
        {greeting}
      </Text>

      <Pressable
        onPress={() => router.push('/check-in/emotions')}
        className="bg-accent px-10 py-4 rounded-full active:opacity-80"
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
          Check In
        </Text>
      </Pressable>
    </View>
  )
}
