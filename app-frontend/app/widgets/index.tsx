import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import WidgetPreview from '@/components/widgets/WidgetPreview'

// ---- Design tokens used locally ----------------------------------------
const COLORS = {
  bg: '#FAF8F5',
  amber: '#C4956A',
  inkPrimary: '#3D2F2A',
  inkMuted: '#6B5D54',
  inkSubtle: '#A09080',
  cardWarm: '#F5F0E8',
  dotInactive: '#D4CABE',
} as const

const CARD_GAP = 24

// ---- Widget data ------------------------------------------------------
type WidgetMeta = {
  id: string
  name: string
  tagline: string
  bullets: [string, string, string]
}

const SMALL_WIDGETS: readonly WidgetMeta[] = [
  {
    id: 'soft-open',
    name: 'SoftOpen',
    tagline: 'A gentle door, every morning.',
    bullets: [
      'Tap an emotion to check in',
      'Shows your current streak',
      'Opens the app in one tap',
    ],
  },
  {
    id: 'carried-verse',
    name: 'CarriedVerse',
    tagline: "Today's verse, in your pocket.",
    bullets: [
      'Updates daily with a new verse',
      'Color-coded to your emotion',
      'Tap to write about it',
    ],
  },
  {
    id: 'door-open',
    name: 'DoorOpen',
    tagline: 'A letter is waiting for you.',
    bullets: [
      'Only shows when you have new content',
      'Tap to open your letter',
      'Updates after each check-in',
    ],
  },
  {
    id: 'speak-freely',
    name: 'SpeakFreely',
    tagline: 'A blank page, when words come.',
    bullets: [
      'Daily rotating prompt',
      "Tied to yesterday's emotion",
      'One tap to begin writing',
    ],
  },
  {
    id: 'line-that-stayed',
    name: 'LineThatStayed',
    tagline: "The line you didn't want to lose.",
    bullets: [
      'Surfaces lines from your own letters',
      'Rotates every 24 hours',
      'Tap to read the full letter',
    ],
  },
] as const

const MEDIUM_WIDGETS: readonly WidgetMeta[] = [
  {
    id: 'full-verse',
    name: 'FullVerse',
    tagline: 'The whole verse, room to breathe.',
    bullets: [
      'Full verse text with reference',
      'Emotion color and date',
      'Tap to save or share',
    ],
  },
  {
    id: 'from-god',
    name: 'FromGod',
    tagline: 'A few words, sent ahead of you.',
    bullets: [
      'Rotating pool of short messages',
      'Each paired with scripture',
      'Tap for a new one',
    ],
  },
  {
    id: 'emotion-mosaic',
    name: 'EmotionMosaic',
    tagline: "Six weeks of how you've been.",
    bullets: [
      '42-cell color-coded grid',
      'Letters show brighter than check-ins',
      'Shows your emotional pattern over time',
    ],
  },
  {
    id: 'recent-letters',
    name: 'RecentLetters',
    tagline: "What's been written for you lately.",
    bullets: [
      'Last 2-3 letter excerpts',
      'Emotion tag and date per letter',
      'Tap to read any letter',
    ],
  },
  {
    id: 'clock-landscape',
    name: 'ClockLandscape',
    tagline: "The hour, in scripture's light.",
    bullets: [
      'Current time + biblical scene',
      '10 scenes to cycle through',
      'Each scene paired with a verse',
    ],
  },
  {
    id: 'companion',
    name: 'Companion',
    tagline: 'Something small that stays with you.',
    bullets: [
      'Animated pet with idle loop',
      '10 tap reactions',
      'Choose your companion',
    ],
  },
] as const

// ---- Pagination dot ---------------------------------------------------
function PaginationDot({ isActive }: { isActive: boolean }) {
  const opacity = useSharedValue(isActive ? 1 : 0.4)

  useEffect(() => {
    opacity.value = withTiming(isActive ? 1 : 0.4, { duration: 300 })
  }, [isActive, opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: isActive ? COLORS.amber : COLORS.dotInactive },
        animatedStyle,
      ]}
    />
  )
}

// ---- Info panel -------------------------------------------------------
type InfoPanelContent = {
  name: string
  tagline: string
  bullets: readonly string[]
}

function InfoPanel({ content }: { content: InfoPanelContent | null }) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(20)
  const [renderedContent, setRenderedContent] = useState<InfoPanelContent | null>(content)

  // Entrance: slide-up + fade once on mount
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250 })
    translateY.value = withSpring(0, { stiffness: 80, damping: 14 })
    // Intentional: empty deps — entrance runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Crossfade content swap when activeIndex changes
  useEffect(() => {
    if (content?.name === renderedContent?.name) return
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        opacity.value = withTiming(1, { duration: 200 })
      }
    })
    // Swap displayed content at the midpoint of the crossfade
    const swapTimer = setTimeout(() => {
      setRenderedContent(content)
    }, 200)
    return () => clearTimeout(swapTimer)
  }, [content, renderedContent, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  // Empty state: no widget selected — render a stable spacer so layout doesn't jump.
  if (!renderedContent) {
    return <View style={styles.infoPanelContainer} />
  }

  return (
    <Animated.View style={[styles.infoPanelContainer, animatedStyle]}>
      <Text style={styles.widgetName}>{renderedContent.name}</Text>
      <Text style={styles.widgetTagline}>{renderedContent.tagline}</Text>
      <View style={{ marginTop: 8 }}>
        {renderedContent.bullets.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletGlyph}>{'○'}</Text>
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => router.push('/widgets/how-to-add')}
        style={({ pressed }) => [
          styles.howToPill,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.howToPillText}>How to add it</Text>
      </Pressable>
    </Animated.View>
  )
}

// ---- Widget section ---------------------------------------------------
type WidgetSectionItem = { id: string; placeholder?: boolean }

type WidgetSectionProps = {
  label: string
  cardWidth: number
  cardHeight: number
  items: readonly WidgetSectionItem[]
  onActiveChange?: (index: number) => void
  activeIndex: number
  infoPanelContent: InfoPanelContent | null
  onCardTap: (index: number) => void
  comingSoon?: boolean
  itemNames: readonly string[]
}

function WidgetSection({
  label,
  cardWidth,
  cardHeight,
  items,
  onActiveChange,
  activeIndex,
  infoPanelContent,
  onCardTap,
  comingSoon = false,
  itemNames,
}: WidgetSectionProps) {
  const screenWidth = Dimensions.get('window').width
  const sideInset = Math.max(0, (screenWidth - cardWidth) / 2)
  const snapInterval = cardWidth + CARD_GAP

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onActiveChange) return
    const x = e.nativeEvent.contentOffset.x
    // The first card sits at x = -sideInset (because of contentInset),
    // so the visible-center index is round((x + sideInset) / snapInterval).
    const idx = Math.round((x + sideInset) / snapInterval)
    const clamped = Math.max(0, Math.min(items.length - 1, idx))
    if (clamped !== activeIndex) onActiveChange(clamped)
  }

  if (comingSoon) {
    return (
      <View style={{ marginBottom: 56 }}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <View style={styles.comingSoonBox}>
          <Text style={styles.comingSoonText}>Coming soon.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ marginBottom: 56 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        snapToAlignment="center"
        contentInset={{ left: sideInset, right: sideInset }}
        contentInsetAdjustmentBehavior="never"
        contentOffset={{ x: -sideInset, y: 0 }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: 12 }}
      >
        {items.map((item, i) => (
          <Pressable
            key={item.id}
            onPress={() => onCardTap(i)}
            style={{
              marginRight: i === items.length - 1 ? 0 : CARD_GAP,
            }}
          >
            <WidgetPreview
              width={cardWidth}
              height={cardHeight}
              isActive={i === activeIndex}
            >
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderText}>{itemNames[i] ?? item.id}</Text>
              </View>
            </WidgetPreview>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {items.map((_, i) => (
          <PaginationDot key={i} isActive={i === activeIndex} />
        ))}
      </View>

      <InfoPanel content={infoPanelContent} />
    </View>
  )
}

// ---- Main screen ------------------------------------------------------
export default function WidgetGalleryScreen() {
  const [smallActive, setSmallActive] = useState(0)
  const [mediumActive, setMediumActive] = useState(0)

  // Header entrance animation
  const headerOpacity = useSharedValue(0)
  const headerTranslate = useSharedValue(12)

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 400 })
    headerTranslate.value = withSpring(0, { stiffness: 80, damping: 14 })
  }, [headerOpacity, headerTranslate])

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }))

  const smallItems = useMemo(
    () => SMALL_WIDGETS.map((w) => ({ id: w.id, placeholder: true })),
    [],
  )
  const mediumItems = useMemo(
    () => MEDIUM_WIDGETS.map((w) => ({ id: w.id, placeholder: true })),
    [],
  )

  const smallNames = useMemo(() => SMALL_WIDGETS.map((w) => w.name), [])
  const mediumNames = useMemo(() => MEDIUM_WIDGETS.map((w) => w.name), [])

  const smallInfo: InfoPanelContent | null = SMALL_WIDGETS[smallActive]
    ? {
        name: SMALL_WIDGETS[smallActive].name,
        tagline: SMALL_WIDGETS[smallActive].tagline,
        bullets: SMALL_WIDGETS[smallActive].bullets,
      }
    : null

  const mediumInfo: InfoPanelContent | null = MEDIUM_WIDGETS[mediumActive]
    ? {
        name: MEDIUM_WIDGETS[mediumActive].name,
        tagline: MEDIUM_WIDGETS[mediumActive].tagline,
        bullets: MEDIUM_WIDGETS[mediumActive].bullets,
      }
    : null

  const handleSmallTap = (i: number) => {
    const w = SMALL_WIDGETS[i]
    if (w) console.log('[widgets] tapped small:', w.id)
  }
  const handleMediumTap = (i: number) => {
    const w = MEDIUM_WIDGETS[i]
    if (w) console.log('[widgets] tapped medium:', w.id)
  }

  // UI states:
  // - Loading: omitted — all gallery data is static, no async fetch.
  // - Error:   omitted — no async or external dependencies that can fail.
  // - Empty:   the LARGE section is the meaningful empty state ("Coming soon.").
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 56, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={COLORS.inkPrimary} />
        </Pressable>

        <Animated.View style={[{ paddingHorizontal: 24, marginBottom: 32 }, headerStyle]}>
          <Text style={styles.title}>Carry it with you.</Text>
          <Text style={styles.subhead}>Add Soft Landing to your home screen.</Text>
        </Animated.View>

        <WidgetSection
          label="SMALL"
          cardWidth={158}
          cardHeight={158}
          items={smallItems}
          itemNames={smallNames}
          activeIndex={smallActive}
          onActiveChange={setSmallActive}
          infoPanelContent={smallInfo}
          onCardTap={handleSmallTap}
        />

        <WidgetSection
          label="MEDIUM"
          cardWidth={329}
          cardHeight={155}
          items={mediumItems}
          itemNames={mediumNames}
          activeIndex={mediumActive}
          onActiveChange={setMediumActive}
          infoPanelContent={mediumInfo}
          onCardTap={handleMediumTap}
        />

        <WidgetSection
          label="LARGE"
          cardWidth={329}
          cardHeight={329}
          items={[]}
          itemNames={[]}
          activeIndex={0}
          infoPanelContent={null}
          onCardTap={() => {}}
          comingSoon
        />
      </ScrollView>
    </View>
  )
}

// ---- Styles -----------------------------------------------------------
// StyleSheet used for static visual tokens. NativeWind className would also work
// but the warm shadow + animated children require composing styles via arrays,
// so we keep all section styles consistent here.
const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 28,
    color: COLORS.inkPrimary,
    marginBottom: 8,
  },
  subhead: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: COLORS.inkSubtle,
  },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.6,
    color: COLORS.inkSubtle,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  placeholderCard: {
    flex: 1,
    backgroundColor: COLORS.cardWarm,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 14,
    color: COLORS.inkSubtle,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  infoPanelContainer: {
    minHeight: 140,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  widgetName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: COLORS.inkPrimary,
  },
  widgetTagline: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 14,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletGlyph: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: COLORS.inkMuted,
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: COLORS.inkMuted,
    lineHeight: 20,
    flex: 1,
  },
  howToPill: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.amber,
  },
  howToPillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  comingSoonBox: {
    marginHorizontal: 24,
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 16,
    color: COLORS.inkSubtle,
  },
})
