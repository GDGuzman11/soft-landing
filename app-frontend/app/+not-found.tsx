import { Link, Stack } from 'expo-router'
import { View, Text } from 'react-native'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text
          className="text-text-primary text-xl mb-4"
          style={{ fontFamily: 'DMSans_500Medium' }}
        >
          Screen not found.
        </Text>
        <Link href="/">
          <Text
            className="text-accent text-base"
            style={{ fontFamily: 'DMSans_400Regular' }}
          >
            Go home
          </Text>
        </Link>
      </View>
    </>
  )
}
