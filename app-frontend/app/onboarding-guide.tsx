import { View, Text, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'

const STEPS = [
  {
    number: '1',
    title: 'Check in',
    body: 'Open the app. Pick the emotion that fits right now. Good, tired, stressed — whatever is true. No explanation needed.',
  },
  {
    number: '2',
    title: 'Open your envelope',
    body: 'A verse is waiting inside, sealed with wax. Tap to open it. It was chosen for this moment.',
  },
  {
    number: '3',
    title: 'Save or skip',
    body: 'Swipe right to keep a verse. Swipe left to let it pass. Come back for another if you need to.',
  },
  {
    number: '4',
    title: 'Write it out',
    body: 'Something on your mind? Head to the Say tab and type it out. A personal letter comes back.',
  },
  {
    number: '5',
    title: 'Come back when you need to',
    body: 'No streaks. No pressure. This is yours to return to whenever.',
  },
]

export default function OnboardingGuideScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 32,
          paddingTop: 72,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 28,
            color: '#3D2F2A',
            marginBottom: 40,
          }}
        >
          Here's how it works.
        </Text>

        {STEPS.map((step, i) => (
          <View key={step.number}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#C4956A',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#FFFFFF' }}>
                  {step.number}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 16,
                    color: '#3D2F2A',
                    marginBottom: 4,
                  }}
                >
                  {step.title}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: '#5A4A40',
                    lineHeight: 22,
                  }}
                >
                  {step.body}
                </Text>
              </View>
            </View>

            {i < STEPS.length - 1 && (
              <View
                style={{
                  height: 1,
                  backgroundColor: '#E8E0D8',
                  marginVertical: 20,
                  marginLeft: 46,
                }}
              />
            )}
          </View>
        ))}

        <Pressable
          onPress={() => router.replace('/onboarding-profile')}
          accessibilityRole="button"
          accessibilityLabel="I'm ready"
          className="active:opacity-80"
          style={{
            backgroundColor: '#C4956A',
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            width: '100%',
            marginTop: 40,
            shadowColor: '#C4956A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
            I'm ready →
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
