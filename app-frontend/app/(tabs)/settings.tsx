import { View, Text } from 'react-native'

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text
        className="text-text-primary text-xl mb-2"
        style={{ fontFamily: 'DMSans_500Medium' }}
      >
        Settings
      </Text>
      <Text
        className="text-text-secondary text-sm text-center"
        style={{ fontFamily: 'DMSans_400Regular' }}
      >
        Notifications and subscription coming soon.
      </Text>
    </View>
  )
}
