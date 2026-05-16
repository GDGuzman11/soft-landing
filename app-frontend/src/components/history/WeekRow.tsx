import React from 'react'
import { View, Text, Pressable, useWindowDimensions } from 'react-native'

const AMBER = '#C4956A'
const INK = '#3D2F2A'
const MUTED = '#9A8880'
const BG = '#FAF8F5'
const EMPTY_BORDER = 'rgba(196,149,106,0.25)'

interface Props {
  slots: string[]
  today: string
  colorByDay: Record<string, string>
  hasLetterByDay: Record<string, boolean>
  selectedDay: string | null
  onSelectDay: (date: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
}

function shortMonthDay(dateStr: string, includeMonth: boolean): string {
  const d = new Date(dateStr + 'T00:00:00')
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  return includeMonth ? `${month} ${day}` : `${day}`
}

function formatWeekLabel(slots: string[]): string {
  if (slots.length === 0) return ''
  const first = slots[0]!
  const last = slots[slots.length - 1]!
  const firstMonth = first.slice(5, 7)
  const lastMonth = last.slice(5, 7)
  if (firstMonth === lastMonth) {
    // "May 11–17"
    return `${shortMonthDay(first, true)}–${shortMonthDay(last, false)}`
  }
  // "Apr 28 – May 4"
  return `${shortMonthDay(first, true)} – ${shortMonthDay(last, true)}`
}

export default function WeekRow({
  slots,
  today,
  colorByDay,
  hasLetterByDay,
  selectedDay,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  prevDisabled,
  nextDisabled,
}: Props) {
  const { width } = useWindowDimensions()
  const tileW = Math.floor((width - 48) / 7)
  const tileH = 36
  const label = formatWeekLabel(slots)

  return (
    <View style={{ paddingHorizontal: 24 }}>
      {/* Week nav */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Pressable
          onPress={onPrevWeek}
          hitSlop={12}
          disabled={prevDisabled}
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          style={({ pressed }) => ({ opacity: prevDisabled ? 0.3 : pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 18, color: AMBER }}>‹</Text>
        </Pressable>
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 16, color: INK }}>
          {label}
        </Text>
        <Pressable
          onPress={onNextWeek}
          hitSlop={12}
          disabled={nextDisabled}
          accessibilityRole="button"
          accessibilityLabel="Next week"
          style={({ pressed }) => ({ opacity: nextDisabled ? 0.3 : pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 18, color: AMBER }}>›</Text>
        </Pressable>
      </View>

      {/* Week row */}
      <View style={{ flexDirection: 'row' }}>
        {slots.map((slot, col) => {
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
    </View>
  )
}
