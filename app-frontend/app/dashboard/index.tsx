import { View, Text, ScrollView, Pressable } from 'react-native'
import { useState } from 'react'
import { EMOTIONS } from '@/constants/emotions'

if (!__DEV__) {
  throw new Error('Dashboard is only available in development')
}

export default function DashboardScreen() {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24 }}>
      <Text
        className="text-text-primary text-2xl mb-6"
        style={{ fontFamily: 'DMSans_700Bold' }}
      >
        Dev Dashboard
      </Text>

      <Text
        className="text-text-secondary text-xs mb-2 uppercase"
        style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
      >
        Emotion Picker Preview
      </Text>
      <View className="bg-surface rounded-2xl p-4 mb-6 border border-border">
        {EMOTIONS.map((emotion) => (
          <Pressable
            key={emotion.id}
            onPress={() => setSelectedEmotion(emotion.id)}
            className="flex-row items-center py-3 px-4 rounded-xl mb-2"
            style={{ backgroundColor: selectedEmotion === emotion.id ? emotion.color : 'transparent' }}
          >
            <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: emotion.color }} />
            <Text style={{ fontFamily: 'DMSans_400Regular' }}>{emotion.label}</Text>
          </Pressable>
        ))}
        {selectedEmotion && (
          <Text
            className="text-text-secondary text-xs mt-2 text-center"
            style={{ fontFamily: 'DMSans_400Regular' }}
          >
            Selected: {selectedEmotion}
          </Text>
        )}
      </View>

      <Text
        className="text-text-secondary text-xs mb-2 uppercase"
        style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
      >
        Phase Status
      </Text>
      <View className="bg-surface rounded-2xl p-4 border border-border">
        {[
          { label: 'Phase 0 — Foundation', done: true },
          { label: 'Phase 1 — Infrastructure', done: false },
          { label: 'Phase 2 — Core Flow', done: false },
          { label: 'Phase 3 — Polish', done: false },
          { label: 'Phase 4 — Production', done: false },
        ].map((phase) => (
          <View key={phase.label} className="flex-row items-center py-2">
            <Text style={{ marginRight: 8 }}>{phase.done ? '✓' : '○'}</Text>
            <Text
              className={phase.done ? 'text-text-primary' : 'text-text-secondary'}
              style={{ fontFamily: 'DMSans_400Regular' }}
            >
              {phase.label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
