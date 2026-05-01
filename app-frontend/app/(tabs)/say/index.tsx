import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
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

// ---- Design tokens --------------------------------------------------------
const COLORS = {
  bg: '#FAF8F5',
  amber: '#C4956A',
  inkPrimary: '#3D2F2A',
  inkMuted: '#9A8F82',
  inkSubtle: '#C4B59A',
} as const

// ---- Voice data -----------------------------------------------------------
type VoiceId = 'kind' | 'still' | 'steady' | 'wise'

type Voice = {
  id: VoiceId
  name: string
  descriptor: string
  glyph: string
  glyphColor: string
  bg: string
  border: string
  premium: boolean
  offer: string
}

const VOICES: readonly Voice[] = [
  {
    id: 'kind',
    name: 'Kind',
    descriptor: 'warm, close, unhurried',
    glyph: '◐',
    glyphColor: '#C4956A',
    bg: '#FAF6F0',
    border: 'rgba(196,149,106,0.22)',
    premium: false,
    offer: 'come sit. tell me about your day.',
  },
  {
    id: 'still',
    name: 'Still',
    descriptor: 'quiet presence, no need to fill the room',
    glyph: '◯',
    glyphColor: '#9A8F82',
    bg: '#F6F4F0',
    border: 'rgba(154,143,130,0.22)',
    premium: true,
    offer: "i'm here. no need to fill the room.",
  },
  {
    id: 'steady',
    name: 'Steady',
    descriptor: 'grounded, unwavering — here for the heavy days',
    glyph: '◑',
    glyphColor: '#7D5D4B',
    bg: '#F4F0EA',
    border: 'rgba(125,93,75,0.22)',
    premium: true,
    offer: "whatever it is, we'll hold it together.",
  },
  {
    id: 'wise',
    name: 'Wise',
    descriptor: 'older voice, longer view, longer patience',
    glyph: '◕',
    glyphColor: '#6C5944',
    bg: '#F2EEE6',
    border: 'rgba(108,89,68,0.22)',
    premium: true,
    offer: "start anywhere. i've got time.",
  },
] as const

// ---- Types ----------------------------------------------------------------
type LastMessage = { content: string; createdAt: Timestamp }
type SayStateData = Partial<Record<VoiceId, { hasUnread?: boolean }>>

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
  lastMessage: LastMessage | null
  hasUnread: boolean
  onPress: () => void
}

function VoiceCard({ voice, index, lastMessage, hasUnread, onPress }: VoiceCardProps) {
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

  const isOffer = !lastMessage
  const previewText = lastMessage?.content ?? voice.offer

  return (
    <Animated.View style={[styles.cardWrapper, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${voice.name}. ${voice.descriptor}${hasUnread ? '. new message' : ''}`}
      >
        <View style={[styles.card, { backgroundColor: voice.bg, borderColor: voice.border }]}>
          {/* Row 1: glyph + name (left) · premium ✦ + unread dot (right) */}
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              <Text style={[styles.glyph, { color: voice.glyphColor }]}>{voice.glyph}</Text>
              <Text style={styles.name}>{voice.name}</Text>
            </View>
            <View style={styles.topRowRight}>
              {voice.premium ? <Text style={styles.premiumMark}>{'✦'}</Text> : null}
              {hasUnread ? <View style={styles.unreadDot} /> : null}
            </View>
          </View>
          {/* Row 2: descriptor */}
          <Text style={styles.descriptor}>{voice.descriptor}</Text>
          {/* Row 3: last message preview or opening offer */}
          <Text
            style={[styles.preview, isOffer && styles.previewOffer]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {previewText}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ---- Main screen ----------------------------------------------------------
export default function SayLobbyScreen() {
  const [authReady, setAuthReady] = useState(false)
  const [lastMessages, setLastMessages] = useState<Partial<Record<VoiceId, LastMessage>>>({})
  const [unreadState, setUnreadState] = useState<SayStateData>({})
  const [loading, setLoading] = useState(true)

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

  // Load last messages + fire reach-out
  useEffect(() => {
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
                query(collection(db, 'say', uid, v.id), orderBy('createdAt', 'desc'), limit(1)),
              )
              if (snap.empty) return [v.id, null] as const
              const d = snap.docs[0].data() as { content?: unknown; createdAt?: unknown }
              const content = typeof d.content === 'string' ? d.content : ''
              if (!(d.createdAt instanceof Timestamp)) return [v.id, null] as const
              return [v.id, { content, createdAt: d.createdAt }] as const
            } catch {
              return [v.id, null] as const
            }
          }),
        )
        if (cancelled) return
        const next: Partial<Record<VoiceId, LastMessage>> = {}
        for (const [id, lm] of results) {
          if (lm) next[id as VoiceId] = lm
        }
        setLastMessages(next)
        callMaybeDeliverReachOut(-new Date().getTimezoneOffset() / 60).catch(() => {})
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
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

  const handlePress = useCallback((voice: Voice) => {
    // TODO: re-enable premium gate before launch
    router.push({ pathname: '/say/[personaId]', params: { personaId: voice.id } })
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <Text style={styles.greeting}>{greeting}</Text>
        </Animated.View>

        <View style={styles.stack}>
          {VOICES.map((voice, i) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              index={i}
              lastMessage={loading ? null : (lastMessages[voice.id] ?? null)}
              hasUnread={unreadState[voice.id]?.hasUnread ?? false}
              onPress={() => handlePress(voice)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ---- Styles ---------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 64,
  },
  header: {
    marginBottom: 40,
  },
  greeting: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 24,
    color: COLORS.inkPrimary,
    lineHeight: 34,
  },
  stack: {
    gap: 16,
  },
  // ---- Card ----
  cardWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    minHeight: 132,
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glyph: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 22,
    lineHeight: 26,
  },
  name: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
    color: COLORS.inkPrimary,
  },
  topRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumMark: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: COLORS.amber,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.amber,
  },
  descriptor: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: COLORS.inkMuted,
    marginBottom: 10,
  },
  preview: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 15,
    color: COLORS.inkMuted,
    lineHeight: 22,
  },
  previewOffer: {
    color: COLORS.inkSubtle,
  },
})
