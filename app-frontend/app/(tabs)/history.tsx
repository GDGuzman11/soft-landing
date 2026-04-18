import { View, Text } from 'react-native'

export default function HistoryScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <Text
        className="text-text-secondary text-base text-center"
        style={{ fontFamily: 'DMSans_400Regular' }}
      >
        Your saved notes will appear here.
      </Text>
    </View>
  )
}
