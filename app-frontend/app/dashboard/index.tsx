import { View, Text, ScrollView, Pressable } from 'react-native'
import { useState } from 'react'
import { EMOTIONS } from '@/constants/emotions'
import catalog from '@/messages/catalog.json'

const PHASES = [
  { label: 'Phase 0 — Foundation', done: true },
  { label: 'Phase 1 — Infrastructure', done: true },
  { label: 'Phase 2 — Core Flow', done: true },
  { label: 'Phase 3 — Polish', done: true },
  { label: 'Phase 4 — Production', done: true },
]

const FEATURES = [
  { label: 'NIV Bible verses (150 total, 30 per emotion)', done: true },
  { label: 'Scripture reference on message screen', done: true },
  { label: 'Enhanced envelope (wax seal, fold lines)', done: true },
  { label: 'Faith intro landing page', done: true },
  { label: 'Native share sheet', done: true },
  { label: 'Free tier: 10 check-ins/day', done: true },
  { label: 'RevenueCat integration (needs API keys)', done: false },
  { label: 'Push notifications (wired, needs scheduler)', done: false },
  { label: 'TestFlight / App Store submission', done: false },
]

export default function DashboardScreen() {
  if (!__DEV__) return null

  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [expandedVerse, setExpandedVerse] = useState<string | null>(null)

  const versesForEmotion = selectedEmotion
    ? catalog.filter((m: any) => m.emotionId === selectedEmotion)
    : []

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24 }}>
      <Text
        className="text-text-primary text-2xl mb-1"
        style={{ fontFamily: 'DMSans_700Bold' }}
      >
        Dev Dashboard
      </Text>
      <Text
        className="text-text-secondary text-sm mb-8"
        style={{ fontFamily: 'DMSans_400Regular' }}
      >
        Soft Landing — V1 complete
      </Text>

      {/* ── Phase Status ── */}
      <Text
        className="text-text-secondary text-xs mb-2 uppercase"
        style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
      >
        Phase Status
      </Text>
      <View className="bg-surface rounded-2xl p-4 border border-border mb-6">
        {PHASES.map((phase) => (
          <View key={phase.label} className="flex-row items-center py-2">
            <Text style={{ marginRight: 8, color: phase.done ? '#9CB59A' : '#C4B59A' }}>
              {phase.done ? '✓' : '○'}
            </Text>
            <Text
              className={phase.done ? 'text-text-primary' : 'text-text-secondary'}
              style={{ fontFamily: 'DMSans_400Regular' }}
            >
              {phase.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Feature Checklist ── */}
      <Text
        className="text-text-secondary text-xs mb-2 uppercase"
        style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
      >
        Features
      </Text>
      <View className="bg-surface rounded-2xl p-4 border border-border mb-6">
        {FEATURES.map((f) => (
          <View key={f.label} className="flex-row items-start py-2 gap-3">
            <Text style={{ color: f.done ? '#9CB59A' : '#E8A598', marginTop: 1 }}>
              {f.done ? '✓' : '○'}
            </Text>
            <Text
              className={f.done ? 'text-text-primary' : 'text-text-secondary'}
              style={{ fontFamily: 'DMSans_400Regular', flex: 1 }}
            >
              {f.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Emotion Picker Preview ── */}
      <Text
        className="text-text-secondary text-xs mb-2 uppercase"
        style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
      >
        Emotion Picker
      </Text>
      <View className="bg-surface rounded-2xl p-4 mb-6 border border-border">
        {EMOTIONS.map((emotion) => (
          <Pressable
            key={emotion.id}
            onPress={() => setSelectedEmotion(
              selectedEmotion === emotion.id ? null : emotion.id
            )}
            className="flex-row items-center py-3 px-4 rounded-xl mb-2"
            style={{ backgroundColor: selectedEmotion === emotion.id ? emotion.color + '40' : 'transparent' }}
          >
            <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: emotion.color }} />
            <Text style={{ fontFamily: 'DMSans_400Regular', flex: 1 }}>{emotion.label}</Text>
            <Text className="text-text-secondary" style={{ fontFamily: 'DMSans_400Regular', fontSize: 12 }}>
              {catalog.filter((m: any) => m.emotionId === emotion.id).length} verses
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Verse Preview (appears when emotion selected) ── */}
      {selectedEmotion && versesForEmotion.length > 0 && (
        <>
          <Text
            className="text-text-secondary text-xs mb-2 uppercase"
            style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
          >
            {EMOTIONS.find(e => e.id === selectedEmotion)?.label} Verses
          </Text>
          <View className="bg-surface rounded-2xl p-4 border border-border mb-6">
            {versesForEmotion.map((verse: any) => (
              <Pressable
                key={verse.id}
                onPress={() => setExpandedVerse(expandedVerse === verse.id ? null : verse.id)}
                className="py-3 border-b border-border"
                style={{ borderBottomWidth: verse.id === versesForEmotion[versesForEmotion.length - 1].id ? 0 : 1 }}
              >
                <Text
                  style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#C4956A', marginBottom: 4 }}
                >
                  {verse.reference}
                </Text>
                <Text
                  className="text-text-primary"
                  style={{
                    fontFamily: 'Lora_400Regular',
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                  numberOfLines={expandedVerse === verse.id ? undefined : 2}
                >
                  {verse.body}
                </Text>
                {expandedVerse !== verse.id && (
                  <Text
                    className="text-text-secondary"
                    style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 4 }}
                  >
                    Tap to expand · weight {verse.weight}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ── User Flow ── */}
      <Text
        className="text-text-secondary text-xs mb-2 uppercase"
        style={{ fontFamily: 'DMSans_500Medium', letterSpacing: 1 }}
      >
        User Flow
      </Text>
      <View className="bg-surface rounded-2xl p-4 border border-border mb-6">
        {[
          'Onboarding (2 slides)',
          '→ Faith Intro (cross + tagline)',
          '→ Home (greeting + Check In)',
          '→ Emotion Picker (5 cards)',
          '→ Envelope (fly-in + wax seal)',
          '→ Message (verse + reference)',
          '→ Save / Share / Dismiss',
        ].map((step, i) => (
          <Text
            key={i}
            className="text-text-primary py-1"
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 14 }}
          >
            {step}
          </Text>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}
