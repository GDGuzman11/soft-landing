import React from 'react'
import { View, Text, Pressable, useWindowDimensions } from 'react-native'

const AMBER = '#C4956A'
const INK = '#3D2F2A'
const MUTED = '#9A8880'
const BG = '#FAF8F5'
const EMPTY_BORDER = 'rgba(196,149,106,0.25)'
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface Props {
  slots: (string | null)[]
  today: string
  colorByDay: Record<string, string>
  hasLetterByDay: Record<string, boolean>
  selectedDay: string | null
  onSelectDay: (date: string) => void
  monthLabel: string
  onPrevMonth: () => void
  onNextMonth: () => void
}

export default function MonthGrid({
  slots,
  today,
  colorByDay,
  hasLetterByDay,
  selectedDay,
  onSelectDay,
  monthLabel,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const { width } = useWindowDimensions()
  const tileW = Math.floor((width - 48) / 7)
  const tileH = 36

  return (
    <View style={{ paddingHorizontal: 24 }}>
      {/* Month nav */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Pressable
          onPress={onPrevMonth}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 18, color: AMBER }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 16, color: INK }}>
          {monthLabel}
        </Text>
        <Pressable
          onPress={onNextMonth}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 18, color: AMBER }}>›</Text>
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={{ width: tileW, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 9,
                letterSpacing: 1.2,
                color: MUTED,
              }}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', marginBottom: 4 }}>
          {Array.from({ length: 7 }, (_, col) => {
            const slot = slots[row * 7 + col]
            if (!slot) {
              return <View key={col} style={{ width: tileW, height: tileH }} />
            }

            const color = colorByDay[slot]
            const hasColor = !!color
            const isToday = slot === today
            const isSelected = slot === selectedDay
            const hasLetter = hasLetterByDay[slot] ?? false
            const dayNum = parseInt(slot.split('-')[2] ?? '0', 10)

            return (
              <Pressable
                key={col}
                onPress={() => onSelectDay(slot)}
                accessibilityRole="button"
                accessibilityLabel={`Day ${dayNum}${hasColor ? ', has check-in' : ''}${hasLetter ? ', has letter' : ''}`}
                accessibilityState={{ selected: isSelected }}
                style={{ width: tileW, height: tileH, padding: 2 }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 6,
                    backgroundColor: hasColor ? color : BG,
                    borderWidth: isToday || isSelected ? 1.5 : hasColor ? 0 : 1,
                    borderColor: isToday || isSelected ? AMBER : EMPTY_BORDER,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 10,
                      color: hasColor ? 'rgba(255,255,255,0.9)' : MUTED,
                    }}
                  >
                    {dayNum}
                  </Text>
                  {hasLetter && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 3,
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: hasColor ? 'rgba(255,255,255,0.7)' : AMBER,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}
