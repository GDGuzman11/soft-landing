import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import app, { db } from '@/services/firebase'
import { useTheme } from '@/theme'
import { startSayChat } from '@/components/say/startSayChat'
import { SAY_IMAGES } from '@/components/say/sayImages'
import { V1_UNLOCK_ALL } from '@/constants'

// ---- Voice data -----------------------------------------------------------
type VoiceId = 'kind' | 'still' | 'steady' | 'wise'

type Voice = {
  id: VoiceId
  name: string
  glyph: string
  headline: string
  description: string
  premium: boolean
}

const VOICES: readonly Voice[] = [
  {
    id: 'kind',
    name: 'Kind',
    glyph: '◐',
    headline: 'Warm, close, unhurried.',
    description: 'Come sit. Tell me about your day.',
    premium: false,
  },
  {
    id: 'still',
    name: 'Still',
    glyph: '◯',
    headline: 'Quiet presence, no need to fill the room.',
    description: "I'm here. No need to fill the room.",
    premium: true,
  },
  {
    id: 'steady',
    name: 'Steady',
    glyph: '◑',
    headline: 'Grounded, unwavering.',
    description: "Whatever it is, we'll hold it together.",
    premium: true,
  },
  {
    id: 'wise',
    name: 'Wise',
    glyph: '◕',
    headline: 'Older voice, longer view.',
    description: "Start anywhere. I've got time.",
    premium: true,
  },
] as const

// ---- Types ----------------------------------------------------------------
type SayStateData = Partial<Record<VoiceId, { hasUnread?: boolean }>>
type ChatCounts = Partial<Record<VoiceId, number>>

// ---- Helpers --------------------------------------------------------------
function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return "good morning. who's with you today?"
  if (h >= 11 && h < 17) return "hey. what's the day asking of you?"
  if (h >= 17 && h < 21) return 'long day? pick a door.'
  return "still up. it's okay. someone's here."
}

async function callMaybeDeliverReachOut(tzOffset: number): Promise<void> {
  const fn = httpsCallable(getFunctions(app, 'us-central1'), 'maybeDeliverReachOut')
  await fn({ userTimezoneOffset: tzOffset })
}

// ---- VoiceCard ------------------------------------------------------------
const CARD_DELAYS = [120, 220, 320, 420] as const

type VoiceCardProps = {
  voice: Voice
  index: number
  imageSource: number
  hasUnread: boolean
  amber: string
  starting: boolean
  onPress: () => void
}

function VoiceCard({ voice, index, imageSource, hasUnread, amber, starting, onPress }: VoiceCardProps) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(12)
  const scale = useSharedValue(1)

  useEffect(() => {
    const delay = CARD_DELAYS[index] ?? 120
    const cfg = { duration: 550, easing: Easing.out(Easing.cubic) }
    opacity.value = withDelay(delay, withTiming(1, cfg))
    translateY.value = withDelay(delay, withTiming(0, cfg))
  }, [opacity, translateY, index])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }))

  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.98, { duration: 180 })
  }, [scale])

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 180 })
  }, [scale])

  return (
    <Animated.View style={[styles.cardWrapper, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={starting}
        accessibilityRole="button"
        accessibilityState={{ busy: starting }}
        accessibilityLabel={`${voice.name}. ${voice.headline}${hasUnread ? '. new message' : ''}`}
      >
        <View style={styles.card}>
          <Image source={imageSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, styles.scrim]} />

          <View style={styles.cardContent}>
            <View style={styles.topRow}>
              <View style={styles.nameRow}>
                <View style={styles.glyphCircle}>
                  <Text style={styles.glyph}>{voice.glyph}</Text>
                </View>
                <Text style={styles.name}>{voice.name.toUpperCase()}</Text>
              </View>
              <View style={styles.topRowRight}>
                {starting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                {!V1_UNLOCK_ALL && !starting && voice.premium ? <Text style={[styles.premiumMark, { color: amber }]}>{'✦'}</Text> : null}
                {!starting && hasUnread ? <View style={[styles.unreadDot, { backgroundColor: amber }]} /> : null}
              </View>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.cardCopy}>
                <Text style={styles.headline}>{voice.headline}</Text>
                <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
                  {voice.description}
                </Text>
              </View>
              <View style={styles.arrowBtn}>
                <Text style={styles.arrow}>→</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ---- Main screen ----------------------------------------------------------
export default function SayLobbyScreen() {
  const { isDark, colors } = useTheme()
  const [authReady, setAuthReady] = useState(false)
  const [chatCounts, setChatCounts] = useState<ChatCounts>({})
  const [unreadState, setUnreadState] = useState<SayStateData>({})
  const [startingId, setStartingId] = useState<VoiceId | null>(null)

  const headerOpacity = useSharedValue(0)
  const greeting = useRef(getGreeting()).current

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }))

  // Header fade in on mount
  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) })
  }, [headerOpacity])

  // Auth gate
  useEffect(() => {
    if (!getAuth().currentUser) {
      router.replace('/sign-in')
      return
    }
    setAuthReady(true)
  }, [])

  // Load chat counts on every focus (decides new-chat-vs-list on tap).
  useFocusEffect(
    useCallback(() => {
      if (!authReady) return
      const user = getAuth().currentUser
      if (!user) return
      let cancelled = false

      async function load() {
        const uid = user!.uid
        try {
          const results = await Promise.all(
            VOICES.map(async (v) => {
              try {
                const snap = await getDocs(
                  query(collection(db, 'say', uid, v.id), orderBy('lastMessageAt', 'desc')),
                )
                return { id: v.id, count: snap.size } as const
              } catch {
                return { id: v.id, count: 0 } as const
              }
            }),
          )
          if (cancelled) return
          const nextCounts: ChatCounts = {}
          for (const { id, count } of results) nextCounts[id] = count
          setChatCounts(nextCounts)
        } catch {
          // non-fatal
        }
      }

      void load()
      return () => {
        cancelled = true
      }
    }, [authReady])
  )

  // Fire reach-out once on mount (not on every focus)
  useEffect(() => {
    if (!authReady) return
    callMaybeDeliverReachOut(-new Date().getTimezoneOffset() / 60).catch(() => {})
  }, [authReady])

  // Realtime unread state
  useEffect(() => {
    if (!authReady) return
    const user = getAuth().currentUser
    if (!user) return
    return onSnapshot(
      doc(db, 'sayState', user.uid),
      (snap) => setUnreadState(snap.exists() ? (snap.data() as SayStateData) : {}),
      () => {},
    )
  }, [authReady])

  const handlePress = useCallback(
    async (voice: Voice) => {
      // TODO: re-enable premium gate before launch
      if (startingId) return
      const count = chatCounts[voice.id] ?? 0
      if (count === 0) {
        // No chats yet → create one and go straight to the thread.
        setStartingId(voice.id)
        try {
          const chatId = await startSayChat(voice.id)
          router.push({ pathname: '/say/[personaId]/[chatId]', params: { personaId: voice.id, chatId } })
        } catch {
          // Surface nothing destructive — just release the spinner so the user can retry.
        } finally {
          setStartingId(null)
        }
        return
      }
      // 1+ chats → show the persona's chat list.
      router.push({ pathname: '/say/[personaId]', params: { personaId: voice.id } })
    },
    [chatCounts, startingId],
  )

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.eyebrow, { color: colors.inkMuted }]}>SAY</Text>
            <Text style={[styles.cornerLabel, { color: colors.inkSubtle }]}>
              SAME SPACE{'\n'}DIFFERENT CONVERSATIONS
            </Text>
          </View>
          <Text style={[styles.greeting, { color: colors.inkPrimary }]}>{greeting}</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Different moments call for different voices. Choose the one you need right now.
          </Text>
        </Animated.View>

        <View style={styles.stack}>
          {VOICES.map((voice, i) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              index={i}
              imageSource={isDark ? SAY_IMAGES[voice.id].night : SAY_IMAGES[voice.id].day}
              hasUnread={unreadState[voice.id]?.hasUnread ?? false}
              amber={colors.amber}
              starting={startingId === voice.id}
              onPress={() => { void handlePress(voice) }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ---- Styles ---------------------------------------------------------------
const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
} as const

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 64,
  },
  header: {
    marginBottom: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eyebrow: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 3,
  },
  cornerLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 9,
    letterSpacing: 1.5,
    lineHeight: 13,
    textAlign: 'right',
  },
  greeting: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 26,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 10,
  },
  stack: {
    gap: 16,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 168,
    width: '100%',
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  cardContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glyphCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  name: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 2,
    color: '#FFFFFF',
    ...TEXT_SHADOW,
  },
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumMark: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  cardCopy: {
    flex: 1,
  },
  headline: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 20,
    lineHeight: 26,
    color: '#FFFFFF',
    ...TEXT_SHADOW,
  },
  description: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 5,
    ...TEXT_SHADOW,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 18,
    color: '#FFFFFF',
  },
})
