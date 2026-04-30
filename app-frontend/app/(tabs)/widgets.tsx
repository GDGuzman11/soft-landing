import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  Modal,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'
import { router } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import WidgetPreview from '@/components/widgets/WidgetPreview'
import SoftOpen from '@/components/widgets/Small/SoftOpen'
import CarriedVerse from '@/components/widgets/Small/CarriedVerse'
import DoorOpen from '@/components/widgets/Small/DoorOpen'
import LineThatStayed from '@/components/widgets/Small/LineThatStayed'

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
  description: string
  bullets: [string, string, string]
}

const SMALL_WIDGETS: readonly WidgetMeta[] = [
  {
    id: 'soft-open',
    name: 'SoftOpen',
    tagline: 'A gentle door, every morning.',
    description:
      'Five emotion dots and a time-of-day greeting — tap any dot to jump straight into a check-in for that feeling. Your streak shows below so you feel the pull to keep going.',
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
    description:
      "Keeps today's scripture in plain sight, updated daily from your saved collection. A single tap opens the letter-compose screen so reflection is always one step away.",
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
    description:
      "Signals when a new letter is waiting for you. Once you've checked in today it quietly switches to 'all caught up,' so it only calls you when there's something real to find.",
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
    description:
      'Opens a blank letter the moment words need to come out. A daily prompt gives you a gentle starting point, and Begin → takes you straight to the writing screen.',
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
    description:
      'Surfaces a line from your own past letters — the kind that clearly wanted to stay. Rotates every 24 hours so something new rises to the top each morning.',
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
    description:
      'Gives the whole scripture room to breathe — reference, full text, and emotion color all at a glance. Tap to save it or share it with someone who needs it today.',
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
    description:
      'Pairs a short encouraging message with its scripture anchor. The pool rotates so each visit feels like a new word spoken just for you.',
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
    description:
      "Shows six weeks of your emotional check-ins as a color grid. Letters glow brighter than check-ins so you can see where you've gone deep and where you've been quiet.",
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
    description:
      'Surfaces the last two or three AI letters written for you, each with its emotion tag and date. Tap any excerpt to read the full letter again.',
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
    description:
      'Pairs the current time with a biblical scene and its verse. Ten scenes cycle through the day so the same hour never looks the same twice.',
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
    description:
      'A small animated presence that stays with you on your home screen. Choose your companion, tap it for a reaction, and let it sit quietly while you go about your day.',
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
  /**
   * Optional per-item renderer. Keyed by item id. When a renderer is
   * provided for an item, its return value replaces the placeholder card
   * inside the WidgetPreview wrapper.
   */
  itemRenderers?: Readonly<Record<string, () => React.ReactNode>>
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
  itemRenderers,
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
              {itemRenderers?.[item.id] ? (
                itemRenderers[item.id]()
              ) : (
                <View style={styles.placeholderCard}>
                  <Text style={styles.placeholderText}>{itemNames[i] ?? item.id}</Text>
                </View>
              )}
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

// ---- Widget detail modal ---------------------------------------------
type ModalWidget = WidgetMeta & { size: 'small' | 'medium' }

function WidgetDetailModal({
  widget,
  onClose,
  smallRenderer,
}: {
  widget: ModalWidget | null
  onClose: () => void
  smallRenderer?: () => React.ReactNode
}) {
  const translateY = useSharedValue(600)
  const isVisible = widget !== null

  // Animate in when widget changes to non-null
  useEffect(() => {
    if (widget) {
      translateY.value = withSpring(0, { stiffness: 80, damping: 16 })
    } else {
      translateY.value = 600
    }
  }, [widget, translateY])

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        translateY.value = withTiming(600, { duration: 300 }, (finished) => {
          if (finished) runOnJS(onClose)()
        })
      } else {
        translateY.value = withSpring(0, { stiffness: 80, damping: 16 })
      }
    })

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  if (!widget) return null

  const cardW = widget.size === 'small' ? 158 : 280
  // Maintain Medium card aspect ratio (329 / 155) when scaling preview width down to 280.
  const cardH = widget.size === 'small' ? 158 : 131

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim backdrop — tap to dismiss */}
      <Pressable
        style={styles.modalBackdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.modalSheet, sheetStyle]}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Widget preview at 1:1 */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <WidgetPreview width={cardW} height={cardH} isActive>
                {smallRenderer ? (
                  smallRenderer()
                ) : (
                  <View style={[styles.placeholderCard, { borderRadius: 22 }]}>
                    <Text style={styles.placeholderText}>{widget.name}</Text>
                  </View>
                )}
              </WidgetPreview>
            </View>

            {/* Name + tagline */}
            <Text style={styles.modalWidgetName}>{widget.name}</Text>
            <Text style={styles.modalWidgetTagline}>{widget.tagline}</Text>

            {/* Description */}
            <Text style={styles.modalDescription}>{widget.description}</Text>

            {/* What it shows */}
            <Text style={styles.modalSectionDivider}>{'── WHAT IT SHOWS ──'}</Text>
            {widget.bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletGlyph}>{'○'}</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}

            {/* How to add it CTA */}
            <Pressable
              onPress={() => {
                onClose()
                router.push('/widgets/how-to-add')
              }}
              style={({ pressed }) => [
                styles.howToPillFull,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="How to add it"
            >
              <Text style={styles.howToPillText}>{'How to add it'}</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  )
}

// ---- Main screen ------------------------------------------------------
export default function WidgetsTabScreen() {
  const [smallActive, setSmallActive] = useState(0)
  const [mediumActive, setMediumActive] = useState(0)
  const [modalWidget, setModalWidget] = useState<ModalWidget | null>(null)

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

  // Per-item renderers for the SMALL section. Only ids listed here render
  // a real widget; everything else falls back to the placeholder card.
  const smallRenderers: Readonly<Record<string, () => React.ReactNode>> = useMemo(
    () => ({
      'soft-open': () => <SoftOpen name="you" streak={3} />,
      'carried-verse': () => (
        <CarriedVerse
          reference="Psalm 34:18"
          body="The Lord is close to the broken-hearted and saves those who are crushed in spirit."
          emotionId="sad"
          savedAt="2026-04-17T08:00:00Z"
          hasLetter={false}
        />
      ),
      'door-open': () => <DoorOpen checkedInToday={false} />,
      'line-that-stayed': () => (
        <LineThatStayed
          line="Even on a good day I forget to rest in this. That's what I needed to hear."
          source="From your letter · Apr 24"
        />
      ),
    }),
    [],
  )

  const handleSmallTap = (i: number) => {
    const w = SMALL_WIDGETS[i]
    if (w) setModalWidget({ ...w, size: 'small' })
  }
  const handleMediumTap = (i: number) => {
    const w = MEDIUM_WIDGETS[i]
    if (w) setModalWidget({ ...w, size: 'medium' })
  }

  // UI states:
  // - Loading: omitted — all gallery data is static, no async fetch.
  // - Error:   omitted — no async or external dependencies that can fail.
  // - Empty:   the LARGE section is the meaningful empty state ("Coming soon.").
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 }, headerStyle]}
        >
          <Text style={styles.title}>{'Carry it with you.'}</Text>
          <Text style={styles.subhead}>{'Add Soft Landing to your home screen.'}</Text>
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
          itemRenderers={smallRenderers}
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

      <WidgetDetailModal
        widget={modalWidget}
        onClose={() => setModalWidget(null)}
        smallRenderer={
          modalWidget?.size === 'small' ? smallRenderers[modalWidget.id] : undefined
        }
      />
    </View>
  )
}

// ---- Styles -----------------------------------------------------------
// StyleSheet used for static visual tokens. NativeWind className would also work
// but the warm shadow + animated children require composing styles via arrays,
// so we keep all section styles consistent here.
const styles = StyleSheet.create({
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
  // ---- Modal styles ---------------------------------------------------
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(61, 47, 42, 0.32)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    shadowColor: '#3D2F2A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4CABE',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 8,
  },
  modalWidgetName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 20,
    color: '#3D2F2A',
  },
  modalWidgetTagline: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 14,
    color: '#6B5D54',
    marginTop: 4,
    marginBottom: 16,
  },
  modalDescription: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: '#3D2F2A',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalSectionDivider: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: '#9C8B7E',
    letterSpacing: 1.4,
    textAlign: 'center',
    marginBottom: 14,
  },
  howToPillFull: {
    marginTop: 28,
    backgroundColor: '#C4956A',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
})
