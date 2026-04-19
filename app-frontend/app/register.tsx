import { View, Text, TextInput, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import * as Haptics from 'expo-haptics'
import { getSettings, saveSettings } from '@/storage/storage'

export default function RegisterScreen() {
  const [name, setName] = useState('')

  async function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, name: name.trim() })
    } catch {
      // storage failure is non-fatal — navigate regardless
    }
    router.replace('/faith-intro')
  }

  async function handleSkip() {
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, name: '' })
    } catch {
      // storage failure is non-fatal — navigate regardless
    }
    router.replace('/faith-intro')
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FAF8F5',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      <Text
        style={{
          fontFamily: 'Lora_400Regular_Italic',
          fontSize: 28,
          color: '#1A1A1A',
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        What's your name?
      </Text>

      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 14,
          color: '#A09080',
          textAlign: 'center',
          marginBottom: 40,
        }}
      >
        We'll use it to greet you each day.
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleContinue}
        placeholder="Your name"
        placeholderTextColor="#C4B59A"
        style={{
          width: '100%',
          borderWidth: 1,
          borderColor: '#E8E3DC',
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 14,
          fontFamily: 'DMSans_400Regular',
          fontSize: 16,
          backgroundColor: '#FFFFFF',
          color: '#1A1A1A',
          marginBottom: 24,
        }}
      />

      <Pressable
        onPress={handleContinue}
        className="bg-accent px-12 py-4 rounded-full active:opacity-80"
        style={{
          shadowColor: '#C4956A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
          marginBottom: 20,
        }}
        accessibilityRole="button"
        accessibilityLabel="Continue"
      >
        <Text
          className="text-white text-base"
          style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 }}
        >
          Continue
        </Text>
      </Pressable>

      <Pressable onPress={handleSkip} accessibilityRole="button" accessibilityLabel="Skip">
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 13,
            color: '#A09080',
          }}
        >
          Skip
        </Text>
      </Pressable>
    </View>
  )
}
