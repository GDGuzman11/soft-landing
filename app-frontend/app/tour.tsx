import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'

const SLIDES = [
  {
    title: 'How are you right now?',
    caption: "Each day, pick the word that's closest to where you are.",
    visual: 'emotions' as const,
  },
  {
    title: 'Something is waiting.',
    caption: "Your verse arrives sealed. Tap when you're ready to open it.",
    visual: 'envelope' as const,
  },
  {
    title: 'Save what moves you.',
    caption: 'Swipe right to keep a verse. Swipe left to let it go.',
    visual: 'verse' as const,
  },
  {
    title: "A letter just for you.",
    caption: "Tell us what's on your heart. Receive a letter written for this moment.",
    visual: 'letter' as const,
  },
]

function EmotionsVisual() {
  const items = [
    { color: '#C97B5A', label: 'stressed' },
    { color: '#9C8FB5', label: 'tired' },
    { color: '#7A95B0', label: 'sad' },
    { color: '#9CB59A', label: 'good' },
  ]
  return (
    <View style={{ gap: 8, width: '100%' }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            backgroundColor: item.color,
            borderRadius: 14,
            paddingHorizontal: 20,
            paddingVertical: 13,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#1A1A1A' }}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function EnvelopeVisual() {
  const FOLD_Y = 72
  return (
    <View style={{
      width: '100%',
      height: 170,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#E2D9CC',
      shadowColor: '#8B7355',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 4,
    }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: FOLD_Y, backgroundColor: '#EDE6D9' }} />
      <View style={{ position: 'absolute', top: FOLD_Y, left: 0, right: 0, bottom: 0, backgroundColor: '#F5F0E8' }} />
      <View style={{ position: 'absolute', top: FOLD_Y, left: 0, right: 0, height: 1, backgroundColor: '#D8CFBF' }} />
      {/* Simplified wax seal */}
      <View style={{
        position: 'absolute',
        top: FOLD_Y - 26,
        left: '50%',
        marginLeft: -26,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#A03515',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: '#3D0A00',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 6,
      }}>
        <View style={{ width: 2, height: 15, backgroundColor: '#FAF0E6', position: 'absolute' }} />
        <View style={{ width: 11, height: 2, backgroundColor: '#FAF0E6', position: 'absolute', top: 17 }} />
      </View>
      <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#A09080', letterSpacing: 0.2 }}>
          Tap to open
        </Text>
      </View>
    </View>
  )
}

function VerseVisual() {
  return (
    <View style={{ width: '100%', gap: 14 }}>
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        paddingHorizontal: 22,
        paddingTop: 24,
        paddingBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}>
        <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 14, color: '#1A1A1A', textAlign: 'center', lineHeight: 22 }}>
          "Come to me, all who are weary and burdened, and I will give you rest."
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#C4956A', textAlign: 'center', marginTop: 10 }}>
          Matthew 11:28
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#C4B59A', textAlign: 'center', marginTop: 8, letterSpacing: 0.3 }}>
          ← skip · save →
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 36 }}>
        {[
          { symbol: '☆', label: 'Save' },
          { symbol: '↑', label: 'Share' },
          { symbol: '×', label: 'Done' },
        ].map(({ symbol, label }) => (
          <View key={label} style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 20, color: '#A09080' }}>{symbol}</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: '#A09080' }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function LetterVisual() {
  return (
    <View style={{
      backgroundColor: '#F5F0E8',
      borderRadius: 14,
      padding: 22,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    }}>
      <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 13, color: '#C4956A', marginBottom: 10 }}>
        Dear friend,
      </Text>
      <Text style={{ fontFamily: 'Lora_400Regular', fontSize: 13, color: '#3D2F2A', lineHeight: 21 }}>
        You're not carrying this alone. Even in the weight of what you're facing today, there is rest being offered — not when everything is fixed, but right now.
      </Text>
      <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 12, color: '#9A8F82', marginTop: 12 }}>
        With you in this.
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: '#C4B59A', marginTop: 6 }}>
        Written by AI for spiritual encouragement only.
      </Text>
    </View>
  )
}

export default function TourScreen() {
  const [activeSlide, setActiveSlide] = useState(0)
  const slideOpacity = useSharedValue(1)
  const slideY = useSharedValue(0)

  const slideStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [{ translateY: slideY.value }],
  }))

  function advanceSlide() {
    if (activeSlide >= SLIDES.length - 1) {
      router.replace('/check-in/emotions')
      return
    }
    const next = activeSlide + 1
    slideOpacity.value = withTiming(0, { duration: 180 }, () => {
      runOnJS(setActiveSlide)(next)
      slideY.value = 10
      slideOpacity.value = withTiming(1, { duration: 270 })
      slideY.value = withTiming(0, { duration: 270 })
    })
  }

  const slide = SLIDES[activeSlide]
  const isLast = activeSlide === SLIDES.length - 1

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#FAF8F5',
      paddingHorizontal: 28,
      paddingTop: 56,
      paddingBottom: 44,
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>

      {/* Progress indicators */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === activeSlide ? 22 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === activeSlide ? '#C4956A' : '#DDD6CC',
            }}
          />
        ))}
      </View>

      {/* Slide content */}
      <Animated.View style={[{
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
      }, slideStyle]}>
        <Text style={{ fontSize: 13, color: '#C4956A', marginBottom: 14, opacity: 0.8 }}>
          ✦
        </Text>

        <Text style={{
          fontFamily: 'Lora_400Regular_Italic',
          fontSize: 21,
          color: '#1A1A1A',
          textAlign: 'center',
          marginBottom: 26,
          lineHeight: 31,
          maxWidth: 260,
        }}>
          {slide.title}
        </Text>

        <View style={{ width: '100%', marginBottom: 26 }}>
          {slide.visual === 'emotions' && <EmotionsVisual />}
          {slide.visual === 'envelope' && <EnvelopeVisual />}
          {slide.visual === 'verse' && <VerseVisual />}
          {slide.visual === 'letter' && <LetterVisual />}
        </View>

        <Text style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 14,
          color: '#A09080',
          textAlign: 'center',
          lineHeight: 22,
          maxWidth: 270,
        }}>
          {slide.caption}
        </Text>
      </Animated.View>

      {/* Navigation */}
      <View style={{ width: '100%', alignItems: 'center', gap: 14 }}>
        <Pressable
          onPress={advanceSlide}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Enter the App' : 'Next slide'}
          style={({ pressed }) => ({
            backgroundColor: '#C4956A',
            borderRadius: 9999,
            paddingHorizontal: 40,
            paddingVertical: 16,
            width: '100%',
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#C4956A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
            {isLast ? 'Enter the App →' : 'Next →'}
          </Text>
        </Pressable>

        {!isLast && (
          <Pressable
            onPress={() => router.replace('/check-in/emotions')}
            accessibilityRole="button"
            accessibilityLabel="Skip tour"
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingVertical: 4 })}
          >
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#C0A898' }}>
              Skip →
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
