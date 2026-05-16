import React, { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'

interface Props {
  mode: 'weekly' | 'monthly'
  onChange: (mode: 'weekly' | 'monthly') => void
}

const AMBER = '#C4956A'
const INK = '#3D2F2A'
const MUTED = '#9A8880'
const LABEL_WIDTH = 72

export default function ViewToggle({ mode, onChange }: Props) {
  // 0 = week, 1 = month
  const underlineX = useSharedValue(mode === 'weekly' ? 0 : 1)

  useEffect(() => {
    underlineX.value = withTiming(mode === 'weekly' ? 0 : 1, { duration: 240 })
  }, [mode, underlineX])

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value * LABEL_WIDTH }],
  }))

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
        position: 'relative',
      }}
    >
      <Pressable
        onPress={() => onChange('weekly')}
        style={{ width: LABEL_WIDTH, alignItems: 'center', paddingBottom: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Week view"
        accessibilityState={{ selected: mode === 'weekly' }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 13,
            color: mode === 'weekly' ? INK : MUTED,
          }}
        >
          Week
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('monthly')}
        style={{ width: LABEL_WIDTH, alignItems: 'center', paddingBottom: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Month view"
        accessibilityState={{ selected: mode === 'monthly' }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 13,
            color: mode === 'monthly' ? INK : MUTED,
          }}
        >
          Month
        </Text>
      </Pressable>
      {/* Sliding underline */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: '50%',
            marginLeft: -LABEL_WIDTH,
            width: LABEL_WIDTH,
            height: 2,
            backgroundColor: AMBER,
            borderRadius: 1,
          },
          underlineStyle,
        ]}
      />
    </View>
  )
}
