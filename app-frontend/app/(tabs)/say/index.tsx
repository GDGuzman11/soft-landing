import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import {
  collection,
  doc,
  getDocs,
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
import { useTheme, VOICE_DARK } from '@/theme'
import { startSayChat } from '@/components/say/startSayChat'

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
// Preview sourced from the persona's most recent chat (latest lastMessageAt).
type LastMessage = { content: string; createdAt: Timestamp }
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
  lastMessage: LastMessage | null
  hasUnread: boolean
  isDark: boolean
  inkPrimary: string
  inkMuted: string
  inkSubtle: string
  amber: string
  starting: boolean
  onPress: () => void
}

function VoiceCard({ voice, index, lastMessage, hasUnread, isDark, inkPrimary, inkMuted, inkSubtle, amber, starting, onPress }: VoiceCardProps) {
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
  const cardBg = isDark ? (VOICE_DARK[voice.id]?.bg ?? voice.bg) : voice.bg
  const cardBorder = isDark ? (VOICE_DARK[voice.id]?.border ?? voice.border) : voice.border

  return (
    <Animated.View style={[styles.cardWrapper, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={starting}
        accessibilityRole="button"
        accessibilityState={{ busy: starting }}
        accessibilityLabel={`${voice.name}. ${voice.descriptor}${hasUnread ? '. new message' : ''}`}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              <Text style={[styles.glyph, { color: voice.glyphColor }]}>{voice.glyph}</Text>
              <Text style={[styles.name, { color: inkPrimary }]}>{voice.name}</Text>
            </View>
            <View style={styles.topRowRight}>
              {starting ? <ActivityIndicator size="small" color={amber} /> : null}
              {!starting && voice.premium ? <Text style={[styles.premiumMark, { color: amber }]}>{'✦'}</Text> : null}
              {!starting && hasUnread ? <View style={[styles.unreadDot, { backgroundColor: amber }]} /> : null}
            </View>
          </View>
          <Text style={[styles.descriptor, { color: inkMuted }]}>{voice.descriptor}</Text>
          <Text
            style={[styles.preview, { color: inkMuted }, isOffer && { color: inkSubtle }]}
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
  const { isDark, colors } = useTheme()
  const [authReady, setAuthReady] = useState(false)
  const [lastMessages, setLastMessages] = useState<Partial<Record<VoiceId, LastMessage>>>({})
  const [chatCounts, setChatCounts] = useState<ChatCounts>({})
  const [unreadState, setUnreadState] = useState<SayStateData>({})
  const [loading, setLoading] = useState(true)
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

  // Load last messages on every focus (so cleared chats reflect immediately on return)
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
                // Read this persona's chats, most-recent first. Chat docs live
                // DIRECTLY in the persona collection (no literal 'chats'
                // segment). The latest chat provides the lobby preview; the
                // snapshot size is the count used to decide list-vs-new-chat
                // on tap. orderBy('lastMessageAt') excludes legacy/reach-out
                // docs lacking the field.
                const snap = await getDocs(
                  query(collection(db, 'say', uid, v.id), orderBy('lastMessageAt', 'desc')),
                )
                const count = snap.size
                if (snap.empty) return { id: v.id, last: null, count } as const
                const d = snap.docs[0].data() as { preview?: unknown; lastMessageAt?: unknown }
                const content = typeof d.preview === 'string' ? d.preview : ''
                const createdAt = d.lastMessageAt instanceof Timestamp ? d.lastMessageAt : null
                const last = createdAt ? { content, createdAt } : null
                return { id: v.id, last, count } as const
              } catch {
                return { id: v.id, last: null, count: 0 } as const
              }
            }),
          )
          if (cancelled) return
          const nextLast: Partial<Record<VoiceId, LastMessage>> = {}
          const nextCounts: ChatCounts = {}
          for (const { id, last, count } of results) {
            if (last) nextLast[id] = last
            nextCounts[id] = count
          }
          setLastMessages(nextLast)
          setChatCounts(nextCounts)
        } finally {
          if (!cancelled) setLoading(false)
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
          <Text style={[styles.greeting, { color: colors.inkPrimary }]}>{greeting}</Text>
        </Animated.View>

        <View style={styles.stack}>
          {VOICES.map((voice, i) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              index={i}
              lastMessage={loading ? null : (lastMessages[voice.id] ?? null)}
              hasUnread={unreadState[voice.id]?.hasUnread ?? false}
              isDark={isDark}
              inkPrimary={colors.inkPrimary}
              inkMuted={colors.inkMuted}
              inkSubtle={colors.inkSubtle}
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
    marginBottom: 40,
  },
  greeting: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 24,
    lineHeight: 34,
  },
  stack: {
    gap: 16,
  },
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  descriptor: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    marginBottom: 10,
  },
  preview: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 15,
    lineHeight: 22,
  },
})
