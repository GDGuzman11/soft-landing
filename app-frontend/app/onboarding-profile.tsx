import { View, Text, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { getSettings, saveSettings } from '@/storage/storage'
import type { AppSettings } from '@/types'

type FaithBackground = AppSettings['faithBackground']
type PrimaryIntent = AppSettings['primaryIntent']
type LifeStage = AppSettings['lifeStage']

const SLIDES = [
  {
    question: 'Where are you with faith right now?',
    options: [
      { label: "I've walked with Jesus for a while", value: 'established' as const },
      { label: "I'm exploring — open but not sure", value: 'exploring' as const },
      { label: 'Somewhere in between', value: 'between' as const },
    ],
  },
  {
    question: 'What are you most looking for?',
    options: [
      { label: 'Peace in the middle of chaos', value: 'peace' as const },
      { label: 'Strength to keep going', value: 'strength' as const },
      { label: "Comfort — I'm going through something hard", value: 'comfort' as const },
      { label: "Guidance for a decision I'm facing", value: 'guidance' as const },
      { label: 'Just exploring for now', value: 'exploring' as const },
    ],
  },
  {
    question: 'Which of these feels most like you?',
    options: [
      { label: 'Early in the journey — figuring things out', value: 'early' as const },
      { label: "In the thick of it — a lot on my plate", value: 'middle' as const },
      { label: 'Slowing down — more reflective these days', value: 'later' as const },
    ],
  },
] as const

const TOTAL_SLIDES = SLIDES.length

export default function OnboardingProfileScreen() {
  const [slide, setSlide] = useState(0)
  const [faithBackground, setFaithBackground] = useState<FaithBackground>(null)
  const [primaryIntent, setPrimaryIntent] = useState<PrimaryIntent>(null)
  const [lifeStage, setLifeStage] = useState<LifeStage>(null)
  const opacity = useSharedValue(1)
  const translateX = useSharedValue(0)

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }))

  function transitionToSlide(nextSlide: number) {
    opacity.value = withTiming(0, { duration: 220 }, () => {
      runOnJS(setSlide)(nextSlide)
      translateX.value = 20
      opacity.value = withTiming(1, { duration: 280 })
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 })
    })
  }

  async function finish(
    fb: FaithBackground,
    pi: PrimaryIntent,
    ls: LifeStage,
  ) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const s = await getSettings()
      await saveSettings({
        ...s,
        faithBackground: fb,
        primaryIntent: pi,
        lifeStage: ls,
        profileComplete: true,
      })
    } catch {
      // storage failure is non-fatal — navigate regardless
    }
    router.replace('/faith-intro')
  }

  function advance(fb: FaithBackground, pi: PrimaryIntent, ls: LifeStage) {
    if (slide < TOTAL_SLIDES - 1) {
      transitionToSlide(slide + 1)
    } else {
      finish(fb, pi, ls)
    }
  }

  function handleSkip() {
    advance(faithBackground, primaryIntent, lifeStage)
  }

  function handleSelect(value: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    let fb = faithBackground
    let pi = primaryIntent
    let ls = lifeStage
    if (slide === 0) { fb = value as FaithBackground; setFaithBackground(fb) }
    else if (slide === 1) { pi = value as PrimaryIntent; setPrimaryIntent(pi) }
    else { ls = value as LifeStage; setLifeStage(ls) }
    setTimeout(() => advance(fb, pi, ls), 350)
  }

  function getSelectedValue(): string | null {
    if (slide === 0) return faithBackground
    if (slide === 1) return primaryIntent
    return lifeStage
  }

  const current = SLIDES[slide]
  const selectedValue = getSelectedValue()
  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 28,
          paddingTop: 72,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[{ width: '100%' }, animStyle]}>
          {/* Question */}
          <Text
            style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: 22,
              color: '#1A1A1A',
              textAlign: 'center',
              marginBottom: 28,
              lineHeight: 32,
            }}
          >
            {current.question}
          </Text>

          {/* Options */}
          {current.options.map((option) => {
            const isSelected = selectedValue === option.value
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                style={{
                  backgroundColor: isSelected ? '#FDF6EE' : '#FFFFFF',
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  marginBottom: 12,
                  borderWidth: 1.5,
                  borderColor: isSelected ? '#C4956A' : '#E8E3DC',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={option.label}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 15,
                    color: '#1A1A1A',
                    lineHeight: 22,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}

          {/* Skip */}
          <Pressable
            onPress={handleSkip}
            style={{ marginTop: 4, marginBottom: 28, alignItems: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Skip this question"
          >
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

        </Animated.View>
      </ScrollView>

      {/* Slide dots */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 40,
        }}
      >
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === slide ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === slide ? '#C4956A' : '#E8E3DC',
            }}
          />
        ))}
      </View>
    </View>
  )
}
