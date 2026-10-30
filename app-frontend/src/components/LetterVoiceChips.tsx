import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { useTheme } from '@/theme'
import { getSettings } from '@/storage/storage'
import { V1_UNLOCK_ALL } from '@/constants'

export type LetterVoiceId = 'kind' | 'still' | 'steady' | 'wise'

const VOICES: ReadonlyArray<{
  id: LetterVoiceId
  name: string
  glyph: string
  glyphColor: string
  descriptor: string
  premium: boolean
}> = [
  { id: 'kind', name: 'Kind', glyph: '◐', glyphColor: '#C4956A', descriptor: 'Warm support and reassurance', premium: false },
  { id: 'still', name: 'Still', glyph: '◯', glyphColor: '#9A8F82', descriptor: 'A calm space to be present', premium: true },
  { id: 'steady', name: 'Steady', glyph: '◑', glyphColor: '#7D5D4B', descriptor: 'Practical guidance and perspective', premium: true },
  { id: 'wise', name: 'Wise', glyph: '◕', glyphColor: '#6C5944', descriptor: 'Deeper insights and reflection', premium: true },
]

// "Talk to a voice about this" — shown under a generated letter. Tapping a voice
// hands the letter + reflection off to that Say persona (the parent creates the
// journal chat and navigates). Reused by LetterCard + The Path's expanded letter.
export default function LetterVoiceChips({ onPick }: { onPick: (id: LetterVoiceId) => void }) {
  const { colors } = useTheme()
  const [picking, setPicking] = useState<LetterVoiceId | null>(null)

  // Premium voices are gated only when V1_UNLOCK_ALL is off (inert during TestFlight).
  async function handlePick(v: (typeof VOICES)[number]) {
    if (!V1_UNLOCK_ALL && v.premium) {
      const s = await getSettings().catch(() => null)
      if ((s?.subscription?.tier ?? 'free') !== 'premium') {
        router.push('/paywall')
        return
      }
    }
    setPicking(v.id)
    onPick(v.id)
  }

  return (
    <View style={{ marginTop: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Text style={{ fontSize: 15, color: colors.amber }}>◍</Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.inkPrimary }}>
          Talk to a voice about this
        </Text>
      </View>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12.5, color: colors.inkMuted, marginBottom: 14 }}>
        Choose a voice to continue the conversation about this entry.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {VOICES.map((v) => {
          const busy = picking === v.id
          return (
            <Pressable
              key={v.id}
              disabled={picking !== null}
              onPress={() => { void handlePick(v) }}
              accessibilityRole="button"
              accessibilityLabel={`Talk to ${v.name}: ${v.descriptor}`}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.surface,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 6,
                alignItems: 'center',
                opacity: picking !== null && !busy ? 0.5 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.amber} style={{ height: 24 }} />
              ) : (
                <View style={{ height: 24, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20, color: v.glyphColor }}>{v.glyph}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 14, color: colors.inkPrimary }}>
                  {v.name}
                </Text>
                {!V1_UNLOCK_ALL && v.premium ? (
                  <Text style={{ fontSize: 9, color: colors.amber }}>✦</Text>
                ) : null}
              </View>
              <Text
                style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, lineHeight: 13, color: colors.inkMuted, textAlign: 'center', marginTop: 3 }}
              >
                {v.descriptor}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
