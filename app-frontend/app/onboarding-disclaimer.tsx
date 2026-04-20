import { View, Text, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { getSettings, saveSettings } from '@/storage/storage'

export default function OnboardingDisclaimerScreen() {
  async function handleAccept() {
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, disclaimerAccepted: true })
    } catch {
      // non-fatal — proceed regardless
    }
    router.replace('/onboarding')
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingVertical: 64,
        }}
      >
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 26,
            color: '#3D2F2A',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          A note before you begin.
        </Text>

        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: '#5A4A40',
            lineHeight: 24,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          Soft Landing offers spiritual encouragement through Bible verses and AI-written
          reflections.
        </Text>

        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: '#5A4A40',
            lineHeight: 24,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          It is not a mental health service and does not provide professional advice of any kind.
        </Text>

        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: '#5A4A40',
            lineHeight: 24,
            marginBottom: 40,
            textAlign: 'center',
          }}
        >
          If you are in crisis or need mental health support, please reach out to a qualified
          professional or call 988.
        </Text>

        <Pressable
          onPress={handleAccept}
          accessibilityRole="button"
          accessibilityLabel="I understand — Continue"
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#B5845A' : '#C4956A',
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: '#C4956A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
            I understand — Continue
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
