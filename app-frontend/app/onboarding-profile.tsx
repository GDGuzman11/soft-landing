import { View, Text, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { getSettings, saveSettings } from '@/storage/storage'
import type { AppSettings } from '@/types'

type FaithBackground = AppSettings['faithBackground']
type PrimaryIntent = AppSettings['primaryIntent']
type LifeStage = AppSettings['lifeStage']

const SLIDES = [
  {
    question: 'Where are you with faith?',
    options: [
      { label: 'Walking with it for a while', value: 'established' as const },
      { label: 'Still finding my way', value: 'exploring' as const },
      { label: 'Somewhere in the middle', value: 'between' as const },
    ],
  },
  {
    question: 'What are you looking for?',
    options: [
      { label: 'Peace in the chaos', value: 'peace' as const },
      { label: 'Strength to keep going', value: 'strength' as const },
      { label: 'Comfort in a hard season', value: 'comfort' as const },
      { label: 'Guidance for a decision', value: 'guidance' as const },
      { label: 'Just exploring', value: 'exploring' as const },
    ],
  },
  {
    question: 'Where are you in life?',
    options: [
      { label: 'Early — still figuring things out', value: 'early' as const },
      { label: 'Busy — a lot on my plate', value: 'middle' as const },
      { label: 'Reflective — taking things slower', value: 'later' as const },
    ],
  },
] as const

const TOTAL_SLIDES = SLIDES.length

type OptionCardProps = {
  label: string
  isSelected: boolean
  onPress: () => void
}

function OptionCard({ label, isSelected, onPress }: OptionCardProps) {
  const scale = useSharedValue(1)
  const shadowOpacityAnim = useSharedValue(0.04)
  const shadowRadiusAnim = useSharedValue(4)
  const dotOpacity = useSharedValue(0)

  useEffect(() => {
    if (isSelected) {
      scale.value = withSpring(1.02, { damping: 15, stiffness: 200 })
      shadowOpacityAnim.value = withTiming(0.22, { duration: 300 })
      shadowRadiusAnim.value = withTiming(18, { duration: 300 })
      dotOpacity.value = withTiming(1, { duration: 200 })
    } else {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 })
      shadowOpacityAnim.value = withTiming(0.04, { duration: 200 })
      shadowRadiusAnim.value = withTiming(4, { duration: 200 })
      dotOpacity.value = withTiming(0, { duration: 150 })
    }
  }, [isSelected])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacityAnim.value,
    shadowRadius: shadowRadiusAnim.value,
  }))

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }))

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          {
            backgroundColor: '#FDF9F4',
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 20,
            marginBottom: 12,
            borderWidth: isSelected ? 1.5 : 1,
            borderColor: isSelected ? '#C4956A' : '#EDE8E0',
            shadowColor: '#C4956A',
            shadowOffset: { width: 0, height: 2 },
            elevation: isSelected ? 6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
          },
          cardStyle,
        ]}
      >
        <Animated.Text
          style={[
            {
              fontSize: 7,
              color: '#C4956A',
              marginRight: 10,
              lineHeight: 22,
            },
            dotStyle,
          ]}
        >
          ●
        </Animated.Text>
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 15,
            color: '#1A1A1A',
            lineHeight: 22,
            flex: 1,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

export default function OnboardingProfileScreen() {
  const [slide, setSlide] = useState(0)
  const [faithBackground, setFaithBackground] = useState<FaithBackground>(null)
  const [primaryIntent, setPrimaryIntent] = useState<PrimaryIntent>(null)
  const [lifeStage, setLifeStage] = useState<LifeStage>(null)
  const opacity = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  function transitionToSlide(nextSlide: number) {
    opacity.value = withTiming(0, { duration: 220 }, () => {
      setSlide(nextSlide)
      opacity.value = withTiming(1, { duration: 280 })
    })
  }

  async function finish(fb: FaithBackground, pi: PrimaryIntent, ls: LifeStage) {
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
      {/* ✦ progress ornaments — fixed at top */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          position: 'absolute',
          top: 52,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        {SLIDES.map((_, i) => (
          <Text
            key={i}
            style={{
              fontSize: 14,
              color: i === slide ? '#C4956A' : '#D9D0C4',
            }}
          >
            ✦
          </Text>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 28,
          paddingTop: 116,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[{ width: '100%' }, animStyle]}>
          {/* Ornament above question */}
          <Text
            style={{
              fontSize: 18,
              color: '#C4956A',
              textAlign: 'center',
              marginBottom: 16,
              opacity: 0.7,
            }}
          >
            ✦
          </Text>

          {/* Question */}
          <Text
            style={{
              fontFamily: 'Lora_400Regular_Italic',
              fontSize: 24,
              color: '#1A1A1A',
              textAlign: 'center',
              marginBottom: 16,
              lineHeight: 34,
            }}
          >
            {current.question}
          </Text>

          {/* Thin amber rule */}
          <View
            style={{
              width: 40,
              height: 1,
              backgroundColor: '#C4956A',
              opacity: 0.4,
              alignSelf: 'center',
              marginBottom: 32,
            }}
          />

          {/* Options */}
          {current.options.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              isSelected={selectedValue === option.value}
              onPress={() => handleSelect(option.value)}
            />
          ))}

          {/* Skip */}
          <Pressable
            onPress={handleSkip}
            style={{ marginTop: 8, alignItems: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Skip this question"
          >
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 13,
                color: '#A09080',
              }}
            >
              I'd rather not say
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  )
}
