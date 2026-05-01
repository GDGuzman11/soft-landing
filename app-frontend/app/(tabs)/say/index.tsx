import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
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
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import app, { db } from '@/services/firebase'
import { getSettings } from '@/storage/storage'

// ---- Design tokens ----------------------------------------------------
const COLORS = {
  bg: '#FAF8F5',
  amber: '#C4956A',
  inkPrimary: '#3D2F2A',
  inkMuted: '#9A8F82',
  inkSubtle: '#C4B59A',
  amberHairline: 'rgba(196,149,106,0.2)',
} as const

// ---- Voice data -------------------------------------------------------
type VoiceId = 'kind' | 'still' | 'steady' | 'wise'

type Voice = {
  id: VoiceId
  name: string
  descriptor: string
  glyph: string
  glyphColor: string
  tint: string
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
    tint: '#FBF6EE',
    premium: false,
    offer: 'tell me about your day.',
  },
  {
    id: 'still',
    name: 'Still',
    descriptor: 'quiet, present, unhurried',
    glyph: '◯',
    glyphColor: '#9A8F82',
    tint: '#F1F2F0',
    premium: true,
    offer: 'sit with me a minute?',
  },
  {
    id: 'steady',
    name: 'Steady',
    descriptor: 'grounded, present, unwavering',
    glyph: '◑',
    glyphColor: '#C4956A',
    tint: '#F4EDE0',
    premium: true,
    offer: "i'm here. start anywhere.",
  },
  {
    id: 'wise',
    name: 'Wise',
    descriptor: 'older voice, longer view',
    glyph: '◕',
    glyphColor: '#6B5E56',
    tint: '#EFE8DA',
    premium: true,
    offer: 'what are you turning over?',
  },
] as const

// ---- Types ------------------------------------------------------------
type LastMessage = {
  content: string
  createdAt: Timestamp
}

type VoiceState = {
  hasUnread: boolean
}

type SayStateData = Partial<Record<VoiceId, VoiceState>>

// ---- Helpers ----------------------------------------------------------
function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d`
  return `${Math.floor(diffDays / 7)}w`
}

function getGreeting(date: Date): string {
  const hour = date.getHours()
  if (hour >= 5 && hour <= 10) return "good morning. who's with you today?"
  if (hour >= 11 && hour <= 16) return "hey. what's the day asking of you?"
  if (hour >= 17 && hour <= 20) return 'long day? pick a door.'
  return "still up. it's okay. someone's here."
}

// ---- Cloud Function ---------------------------------------------------
type ReachOutPayload = { userTimezoneOffset: number }
type ReachOutResult = { delivered?: boolean }

async function callMaybeDeliverReachOut(payload: ReachOutPayload): Promise<ReachOutResult> {
  const functions = getFunctions(app, 'us-central1')
  const fn = httpsCallable<ReachOutPayload, ReachOutResult>(functions, 'maybeDeliverReachOut')
  const result = await fn(payload)
  return result.data
}

// ---- Voice card -------------------------------------------------------
type VoiceCardProps = {
  voice: Voice
  index: number
  lastMessage: LastMessage | null
  hasUnread: boolean
  isPremium: boolean
  onPress: () => void
}

function VoiceCard({ voice, index, lastMessage, hasUnread, isPremium, onPress }: VoiceCardProps) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(4)

  useEffect(() => {
    const delay = (VOICES.length - 1 - index) * 80
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }))
    translateY.value = withDelay(delay, withTiming(0, { duration: 300 }))
  }, [opacity, translateY, index])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const showLockGlyph = voice.premium && !isPremium
  const previewText = lastMessage?.content ?? voice.offer
  const previewStyle = lastMessage ? styles.cardPreview : styles.cardPreviewOffer
  const timestampText = lastMessage ? formatTimestamp(lastMessage.createdAt.toDate()) : null

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${voice.name}, ${voice.descriptor}${
          showLockGlyph ? ', premium' : ''
        }${hasUnread ? ', has new message' : ''}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: voice.tint, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardGlyph, { color: voice.glyphColor }]}>{voice.glyph}</Text>
            <Text style={styles.cardName}>{voice.name}</Text>
          </View>
          <Text style={styles.cardDescriptor}>{voice.descriptor}</Text>
          <Text style={previewStyle} numberOfLines={1} ellipsizeMode="tail">
            {previewText}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {timestampText ? <Text style={styles.cardTimestamp}>{timestampText}</Text> : null}
          {showLockGlyph ? <Text style={styles.cardLock}>{'✦'}</Text> : null}
          {hasUnread ? <View style={styles.cardUnreadDot} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  )
}

// ---- Main screen ------------------------------------------------------
export default function SayLobbyScreen() {
  const [authReady, setAuthReady] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [lastMessages, setLastMessages] = useState<Partial<Record<VoiceId, LastMessage>>>({})
  const [unreadState, setUnreadState] = useState<SayStateData>({})
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const greetingRef = useRef<string>(getGreeting(new Date()))

  // ---- Auth check ----------------------------------------------------
  useEffect(() => {
    const user = getAuth().currentUser
    if (!user) {
      router.replace('/sign-in')
      return
    }
    setAuthReady(true)
  }, [])

  // ---- Load subscription + last messages + reach-out -----------------
  useEffect(() => {
    if (!authReady) return
    const user = getAuth().currentUser
    if (!user) return

    let cancelled = false

    async function load() {
      try {
        const settings = await getSettings().catch(() => null)
        if (cancelled) return
        setIsPremium(settings?.subscription.tier === 'premium')

        // Load last message for each voice
        const uid = user!.uid
        const results = await Promise.all(
          VOICES.map(async (voice) => {
            try {
              const messagesRef = collection(db, 'say', uid, voice.id)
              const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1))
              const snap = await getDocs(q)
              if (snap.empty) return [voice.id, null] as const
              const docData = snap.docs[0].data() as {
                content?: unknown
                createdAt?: unknown
              }
              const content = typeof docData.content === 'string' ? docData.content : ''
              if (!(docData.createdAt instanceof Timestamp)) return [voice.id, null] as const
              const lm: LastMessage = { content, createdAt: docData.createdAt }
              return [voice.id, lm] as const
            } catch {
              return [voice.id, null] as const
            }
          }),
        )
        if (cancelled) return
        const next: Partial<Record<VoiceId, LastMessage>> = {}
        for (const [id, lm] of results) {
          if (lm) next[id] = lm
        }
        setLastMessages(next)

        // Fire reach-out check (non-blocking; ignore errors)
        try {
          const tzOffset = -new Date().getTimezoneOffset() / 60
          await callMaybeDeliverReachOut({ userTimezoneOffset: tzOffset })
        } catch {
          // non-fatal
        }
      } catch {
        if (!cancelled) setErrored(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [authReady])

  // ---- Real-time unread subscription ---------------------------------
  useEffect(() => {
    if (!authReady) return
    const user = getAuth().currentUser
    if (!user) return

    const stateRef = doc(db, 'sayState', user.uid)
    const unsub = onSnapshot(
      stateRef,
      (snap) => {
        if (!snap.exists()) {
          setUnreadState({})
          return
        }
        const data = snap.data() as SayStateData
        setUnreadState(data ?? {})
      },
      () => {
        // non-fatal; default to no unreads
      },
    )

    return () => unsub()
  }, [authReady])

  // ---- Handlers ------------------------------------------------------
  const handleVoicePress = useCallback(
    (voice: Voice) => {
      // TODO: re-enable premium gate before launch
      // if (voice.premium && !isPremium) {
      //   router.push('/paywall')
      //   return
      // }
      router.push({ pathname: '/say/[personaId]', params: { personaId: voice.id } })
    },
    [isPremium],
  )

  const greeting = useMemo(() => greetingRef.current, [])

  // UI states:
  // - Loading: render greeting + cards (cards animate in regardless; previews show offers).
  //   The parchment IS the loading aesthetic — no spinner.
  // - Error: surface inline error message above cards. Cards still tappable (Kind always works).
  // - Empty: when no thread history exists, each card shows its opening offer (handled in VoiceCard).
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.greeting}>{greeting}</Text>
        {errored ? (
          <Text style={styles.errorText}>
            {"couldn't load your threads. they're still there — try again in a moment."}
          </Text>
        ) : null}
        <View style={styles.cardsList}>
          {VOICES.map((voice, index) => (
            <VoiceCard
              key={voice.id}
              voice={voice}
              index={index}
              lastMessage={loading ? null : lastMessages[voice.id] ?? null}
              hasUnread={unreadState[voice.id]?.hasUnread ?? false}
              isPremium={isPremium}
              onPress={() => handleVoicePress(voice)}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

// ---- Styles -----------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  greeting: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 16,
    color: COLORS.inkMuted,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: COLORS.inkMuted,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  cardsList: {
    gap: 12,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    minHeight: 88,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardGlyph: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    marginRight: 10,
    lineHeight: 28,
  },
  cardName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
    color: COLORS.inkPrimary,
  },
  cardDescriptor: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: COLORS.inkMuted,
    marginTop: 4,
  },
  cardPreview: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 14,
    color: COLORS.inkMuted,
    marginTop: 6,
  },
  cardPreviewOffer: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 14,
    color: COLORS.inkSubtle,
    marginTop: 6,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 6,
  },
  cardTimestamp: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  cardLock: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: COLORS.amber,
  },
  cardUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.amber,
  },
})
