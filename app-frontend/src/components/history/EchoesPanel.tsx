import React from 'react'
import { View, Text, ScrollView } from 'react-native'

const AMBER = '#C4956A'
const INK = '#3D2F2A'
const MUTED = '#9A8880'
const NEUTRAL_TINT = '#C4B59A'

const EMOTION_TINTS: Record<string, string> = {
  stressed: '#C97B5A',
  tired:    '#9C8FB5',
  sad:      '#7A95B0',
  neutral:  '#C4B59A',
  good:     '#9CB59A',
}

interface EchoEntry {
  messageId: string
  savedAt: string
  emotionId?: string
}

interface Props {
  messageId: string
  currentSavedAt: string
  allEntries: EchoEntry[]
  isPremium: boolean
}

function formatChipDate(savedAt: string): string {
  const d = new Date(savedAt)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function EchoesPanel({ messageId, currentSavedAt, allEntries, isPremium }: Props) {
  const echoes = allEntries
    .filter(e => e.messageId === messageId && e.savedAt !== currentSavedAt)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))

  if (echoes.length === 0) return null

  const n = echoes.length
  const countLabel = `This verse has found you ${n} time${n === 1 ? '' : 's'} before.`

  return (
    <View
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(196,149,106,0.25)',
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: AMBER }}>✦</Text>
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 11,
            letterSpacing: 2,
            color: MUTED,
          }}
        >
          ECHOES
        </Text>
      </View>

      {/* Count */}
      <Text
        style={{
          fontFamily: 'Lora_400Regular_Italic',
          fontSize: 14,
          color: INK,
          marginBottom: 10,
        }}
      >
        {countLabel}
      </Text>

      {/* Date chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingRight: 4 }}
      >
        {echoes.map((echo, i) => {
          const tint = EMOTION_TINTS[echo.emotionId ?? ''] ?? NEUTRAL_TINT
          const label = echo.emotionId
            ? `${formatChipDate(echo.savedAt)} · ${echo.emotionId}`
            : formatChipDate(echo.savedAt)
          return (
            <View
              key={i}
              style={{
                height: 28,
                paddingHorizontal: 10,
                borderRadius: 4,
                backgroundColor: tint + '2E', // ~18% opacity
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: INK }}>
                {label}
              </Text>
            </View>
          )
        })}
      </ScrollView>

      {/* Premium lock placeholder */}
      {!isPremium && (
        <View
          style={{
            marginTop: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: AMBER }}>✦</Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 11,
              fontStyle: 'italic',
              color: MUTED,
            }}
          >
            Unlock the full reflection
          </Text>
        </View>
      )}
    </View>
  )
}
