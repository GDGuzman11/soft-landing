import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native'
import { router } from 'expo-router'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
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
  cardWarmBorder: '#E8E3DC',
  amberTint: 'rgba(196,149,106,0.05)',
  amberTintActive: 'rgba(196,149,106,0.06)',
  amberHairline: 'rgba(196,149,106,0.2)',
  modalBackdrop: 'rgba(61, 47, 42, 0.42)',
} as const

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

// ---- Persona data -----------------------------------------------------
type PersonaId = 'kind' | 'still' | 'steady' | 'wise'

type Persona = {
  id: PersonaId
  name: string
  descriptor: string
  premium: boolean
}

const PERSONAS: readonly Persona[] = [
  { id: 'kind', name: 'Kind', descriptor: 'warm, close, unhurried — like someone who knows your weather', premium: false },
  { id: 'still', name: 'Still', descriptor: 'a quiet that listens longer than it speaks', premium: true },
  { id: 'steady', name: 'Steady', descriptor: 'grounded presence for the heavy days', premium: true },
  { id: 'wise', name: 'Wise', descriptor: 'older voice, longer view — perspective without lecture', premium: true },
] as const

const PERSONA_BY_ID: Readonly<Record<PersonaId, Persona>> = PERSONAS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p }),
  {} as Record<PersonaId, Persona>,
)

// ---- Storage keys -----------------------------------------------------
const STORAGE_KEYS = {
  persona: 'say_persona_id',
  consent: 'say_consent_shown',
} as const

// ---- Message + thread item types --------------------------------------
type SayMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Timestamp
}

type ThreadItem =
  | { kind: 'message'; message: SayMessage; marginTop: number }
  | { kind: 'date-divider'; id: string; label: string }
  | { kind: 'persona-divider'; id: string; from: PersonaId; to: PersonaId }
  | { kind: 'thinking'; id: string }
  | { kind: 'error'; id: string }

// ---- Helpers ----------------------------------------------------------
function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDateLabel(date: Date): string {
  const now = new Date()
  if (isSameCalendarDay(date, now)) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameCalendarDay(date, yesterday)) return 'Yesterday'
  // Within last 6 days → weekday name; older → "April 30"
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' })
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

function shouldInsertDivider(prev: SayMessage, curr: SayMessage): boolean {
  const prevDate = prev.createdAt.toDate()
  const currDate = curr.createdAt.toDate()
  if (!isSameCalendarDay(prevDate, currDate)) return true
  return Math.abs(currDate.getTime() - prevDate.getTime()) > SIX_HOURS_MS
}

function computeMarginTop(prev: SayMessage | null, curr: SayMessage): number {
  if (!prev) return 0
  if (prev.role === curr.role) return 16
  // user → assistant
  if (prev.role === 'user' && curr.role === 'assistant') return 20
  // assistant → user
  return 40
}

/**
 * Build the FlatList data array. Returns items in REVERSE chronological order
 * because the FlatList is `inverted`. Persona dividers and thinking/error rows
 * are interleaved at the correct positions.
 *
 * Input `messages` is expected in chronological (oldest → newest) order.
 */
function buildThreadItems(
  messages: readonly SayMessage[],
  personaTransitions: readonly { afterMessageId: string | null; from: PersonaId; to: PersonaId; id: string }[],
  thinking: boolean,
  errored: boolean,
): ThreadItem[] {
  // Build chronologically, then reverse at the end.
  const chrono: ThreadItem[] = []

  // Transitions queued at the very start of the thread (afterMessageId === null).
  const startTransitions = personaTransitions.filter((t) => t.afterMessageId === null)
  for (const t of startTransitions) {
    chrono.push({ kind: 'persona-divider', id: t.id, from: t.from, to: t.to })
  }

  let prev: SayMessage | null = null
  for (const m of messages) {
    if (prev && shouldInsertDivider(prev, m)) {
      chrono.push({
        kind: 'date-divider',
        id: `date-${m.id}`,
        label: formatDateLabel(m.createdAt.toDate()),
      })
    }
    chrono.push({ kind: 'message', message: m, marginTop: computeMarginTop(prev, m) })
    // Insert any persona transitions queued to appear AFTER this message
    for (const t of personaTransitions.filter((tt) => tt.afterMessageId === m.id)) {
      chrono.push({ kind: 'persona-divider', id: t.id, from: t.from, to: t.to })
    }
    prev = m
  }

  if (thinking) chrono.push({ kind: 'thinking', id: 'thinking' })
  if (errored) chrono.push({ kind: 'error', id: 'error' })

  return chrono.reverse()
}

// ---- ThinkingGlyph ----------------------------------------------------
function ThinkingGlyph({ reduceMotion }: { reduceMotion: boolean }) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0.55)
  const scale = useSharedValue(1)

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1
      scale.value = 1
      return () => {
        // no animation to cancel
      }
    }
    // 400ms entry delay before breathing begins
    opacity.value = withDelay(
      400,
      withRepeat(
        withSequence(withTiming(1, { duration: 1200 }), withTiming(0.55, { duration: 1200 })),
        -1,
        false,
      ),
    )
    scale.value = withDelay(
      400,
      withRepeat(
        withSequence(withTiming(1.08, { duration: 1200 }), withTiming(1, { duration: 1200 })),
        -1,
        false,
      ),
    )
    return () => {
      cancelAnimation(opacity)
      cancelAnimation(scale)
    }
  }, [opacity, scale, reduceMotion])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return (
    <View style={styles.thinkingRow}>
      <Animated.Text style={[styles.thinkingGlyph, animatedStyle]}>{'✦'}</Animated.Text>
      <Text style={styles.thinkingDots}>{'…'}</Text>
    </View>
  )
}

// ---- Date divider -----------------------------------------------------
function DateDivider({ label }: { label: string }) {
  return <Text style={styles.dateDivider}>{`· · · ${label} · · ·`}</Text>
}

// ---- Persona divider --------------------------------------------------
function PersonaDivider({ from, to }: { from: PersonaId; to: PersonaId }) {
  const fromName = PERSONA_BY_ID[from]?.name ?? from
  const toName = PERSONA_BY_ID[to]?.name ?? to
  return <Text style={styles.dateDivider}>{`· · · ${fromName} → ${toName} · · ·`}</Text>
}

// ---- User message (naked on parchment) --------------------------------
function UserMessage({ content, marginTop }: { content: string; marginTop: number }) {
  return (
    <View style={[styles.userRow, { marginTop }]}>
      <Text style={styles.userText}>{content}</Text>
    </View>
  )
}

// ---- Assistant message (amber-tinted card) ----------------------------
function AssistantMessage({ content, marginTop }: { content: string; marginTop: number }) {
  return (
    <View style={[styles.assistantCard, { marginTop }]}>
      <Text style={styles.assistantGlyph}>{'✦'}</Text>
      <Text style={styles.assistantText}>{content}</Text>
    </View>
  )
}

// ---- Inline error row -------------------------------------------------
function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorRow}>
      <Text style={styles.errorText}>{`Something didn't reach me. Want to send it again? `}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again">
        <Text style={styles.errorRetry}>{'Try again'}</Text>
      </Pressable>
    </View>
  )
}

// ---- Empty state ------------------------------------------------------
function EmptyState({
  consentVisible,
  onConsentDismiss,
}: {
  consentVisible: boolean
  onConsentDismiss: () => void
}) {
  // FlatList is inverted so its empty container is flipped — counter-rotate.
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyGlyph}>{'✦'}</Text>
      <View style={{ height: 16 }} />
      {consentVisible ? (
        <>
          <Text style={styles.consentText}>
            {'Your words are stored to help this space remember you. You can delete everything from Settings.'}
          </Text>
          <Pressable
            onPress={onConsentDismiss}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginTop: 12 })}
          >
            <Text style={styles.consentButton}>{'✦  Got it'}</Text>
          </Pressable>
          <View style={{ height: 24 }} />
        </>
      ) : null}
      <Text style={styles.emptyHeadline}>{'This is a quiet space.'}</Text>
      <View style={{ height: 8 }} />
      <Text style={styles.emptySubhead}>{'Say anything — or nothing.'}</Text>
    </View>
  )
}

// ---- Persona picker bottom sheet --------------------------------------
function PersonaPickerModal({
  visible,
  selectedId,
  isPremium,
  onSelect,
  onClose,
}: {
  visible: boolean
  selectedId: PersonaId
  isPremium: boolean
  onSelect: (id: PersonaId) => void
  onClose: () => void
}) {
  const translateY = useSharedValue(600)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { stiffness: 80, damping: 16 })
    } else {
      translateY.value = withTiming(600, { duration: 250 })
    }
  }, [visible, translateY])

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={styles.modalBackdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close persona picker"
      />
      <Animated.View style={[styles.modalSheet, sheetStyle]}>
        <View style={styles.dragHandle} />
        <Text style={styles.pickerTitle}>{'Your voice'}</Text>
        <View style={{ gap: 8 }}>
          {PERSONAS.map((p) => {
            const isActive = p.id === selectedId
            const isLocked = p.premium && !isPremium
            return (
              <Pressable
                key={p.id}
                onPress={() => onSelect(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`${p.name} voice${isLocked ? ', locked' : ''}`}
                style={({ pressed }) => [
                  styles.personaCard,
                  isActive && styles.personaCardActive,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.personaName}>{p.name}</Text>
                  <Text style={styles.personaDescriptor}>{p.descriptor}</Text>
                </View>
                {isLocked ? <Text style={styles.personaLock}>{'✦'}</Text> : null}
              </Pressable>
            )
          })}
        </View>
      </Animated.View>
    </Modal>
  )
}

// ---- Cloud Function call ----------------------------------------------
type SayResponsePayload = { message: string; personaId: PersonaId }
type SayResponseResult = {
  response?: string
  blocked?: boolean
  showCrisisPrompt?: boolean
  rateLimited?: boolean
  rateLimitType?: 'daily' | 'burst'
}

async function callGenerateSayResponse(payload: SayResponsePayload): Promise<SayResponseResult> {
  const functions = getFunctions(app, 'us-central1')
  const fn = httpsCallable<SayResponsePayload, SayResponseResult>(functions, 'generateSayResponse')
  const result = await fn(payload)
  return result.data
}

// ---- Main screen ------------------------------------------------------
type PersonaTransition = {
  id: string
  afterMessageId: string | null
  from: PersonaId
  to: PersonaId
}

export default function SayScreen() {
  const [messages, setMessages] = useState<SayMessage[]>([])
  const [draft, setDraft] = useState('')
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId>('kind')
  const [isPremium, setIsPremium] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [errored, setErrored] = useState(false)
  const [consentVisible, setConsentVisible] = useState(false)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [snapshotReceived, setSnapshotReceived] = useState(false)
  const [personaTransitions, setPersonaTransitions] = useState<PersonaTransition[]>([])
  const [authReady, setAuthReady] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  const lastSendPayloadRef = useRef<SayResponsePayload | null>(null)

  // ---- Reduce motion -------------------------------------------------
  useEffect(() => {
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(enabled)
      })
      .catch(() => {
        // non-fatal; default to motion enabled
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ---- Auth check + persona/consent load -----------------------------
  useEffect(() => {
    let cancelled = false
    const user = getAuth().currentUser
    if (!user) {
      router.replace('/sign-in')
      return
    }
    setAuthReady(true)

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.persona).catch(() => null),
      AsyncStorage.getItem(STORAGE_KEYS.consent).catch(() => null),
      getSettings().catch(() => null),
    ]).then(([storedPersona, storedConsent, settings]) => {
      if (cancelled) return
      const personaId = (storedPersona as PersonaId | null) ?? 'kind'
      const validPersonaId: PersonaId =
        personaId === 'kind' || personaId === 'still' || personaId === 'steady' || personaId === 'wise'
          ? personaId
          : 'kind'
      setSelectedPersonaId(validPersonaId)
      setConsentVisible(storedConsent !== 'true')
      setIsPremium(settings?.subscription.tier === 'premium')
    })

    return () => {
      cancelled = true
    }
  }, [])

  // ---- Firestore subscription ----------------------------------------
  useEffect(() => {
    if (!authReady) return
    const user = getAuth().currentUser
    if (!user) return

    const messagesRef = collection(db, 'say', user.uid, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: SayMessage[] = []
        snap.forEach((d) => {
          const data = d.data() as { role?: unknown; content?: unknown; createdAt?: unknown }
          const role = data.role === 'assistant' ? 'assistant' : 'user'
          const content = typeof data.content === 'string' ? data.content : ''
          // createdAt may be a server-pending FieldValue on initial local emit;
          // skip messages without a resolved Timestamp.
          if (!(data.createdAt instanceof Timestamp)) return
          docs.push({ id: d.id, role, content, createdAt: data.createdAt })
        })
        // Firestore returned desc by createdAt; we want chronological for buildThreadItems.
        docs.reverse()
        setMessages(docs)
        setSnapshotReceived(true)
      },
      () => {
        // Listener errors: surface as inline error and mark snapshot received so empty state can render.
        setSnapshotReceived(true)
        setErrored(true)
      },
    )

    return () => unsub()
  }, [authReady])

  // ---- Send handler --------------------------------------------------
  const handleSend = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSending) return
    setErrored(false)
    setIsSending(true)
    setDraft('')
    const payload: SayResponsePayload = { message: trimmed, personaId: selectedPersonaId }
    lastSendPayloadRef.current = payload

    try {
      const result = await callGenerateSayResponse(payload)
      if (result.blocked || result.rateLimited) {
        setErrored(true)
      } else if (result.showCrisisPrompt) {
        // Crisis content detected — onSnapshot will have the user's message;
        // route to the existing crisis resources screen.
        router.push('/check-in/message' as never)
      }
      // On success (result.response set): onSnapshot will reconcile automatically.
    } catch {
      setErrored(true)
    } finally {
      setIsSending(false)
    }
  }, [draft, isSending, selectedPersonaId])

  const handleRetry = useCallback(async () => {
    const last = lastSendPayloadRef.current
    if (!last || isSending) return
    setErrored(false)
    setIsSending(true)
    try {
      const result = await callGenerateSayResponse(last)
      if (result.blocked || result.rateLimited) setErrored(true)
    } catch {
      setErrored(true)
    } finally {
      setIsSending(false)
    }
  }, [isSending])

  // ---- Persona change ------------------------------------------------
  const handlePersonaSelect = useCallback(
    (nextId: PersonaId) => {
      const persona = PERSONA_BY_ID[nextId]
      if (persona.premium && !isPremium) {
        setPickerVisible(false)
        router.push('/paywall')
        return
      }
      if (nextId === selectedPersonaId) {
        setPickerVisible(false)
        return
      }
      const fromId = selectedPersonaId
      // Anchor the divider after the most recent message currently in the thread.
      // If the thread is empty, anchor at the start (afterMessageId: null).
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
      const anchorId = lastMessage ? lastMessage.id : null
      const transition: PersonaTransition = {
        id: `transition-${Date.now()}`,
        afterMessageId: anchorId,
        from: fromId,
        to: nextId,
      }
      setPersonaTransitions((prev) => [...prev, transition])
      setSelectedPersonaId(nextId)
      AsyncStorage.setItem(STORAGE_KEYS.persona, nextId).catch(() => {
        // non-fatal
      })
      setPickerVisible(false)
    },
    [selectedPersonaId, isPremium, messages],
  )

  // ---- Consent dismiss -----------------------------------------------
  const handleConsentDismiss = useCallback(() => {
    setConsentVisible(false)
    AsyncStorage.setItem(STORAGE_KEYS.consent, 'true').catch(() => {
      // non-fatal
    })
  }, [])

  // ---- Build thread items --------------------------------------------
  const threadItems = useMemo(
    () => buildThreadItems(messages, personaTransitions, isSending, errored),
    [messages, personaTransitions, isSending, errored],
  )

  // ---- Render --------------------------------------------------------
  const activePersonaName = PERSONA_BY_ID[selectedPersonaId]?.name ?? 'Kind'
  const draftLength = draft.length
  const showCharCounter = draftLength >= 1800
  const sendDisabled = draft.trim().length === 0 || isSending

  const renderItem: ListRenderItem<ThreadItem> = useCallback(
    ({ item }) => {
      switch (item.kind) {
        case 'message':
          return item.message.role === 'user' ? (
            <UserMessage content={item.message.content} marginTop={item.marginTop} />
          ) : (
            <AssistantMessage content={item.message.content} marginTop={item.marginTop} />
          )
        case 'date-divider':
          return <DateDivider label={item.label} />
        case 'persona-divider':
          return <PersonaDivider from={item.from} to={item.to} />
        case 'thinking':
          return <ThinkingGlyph reduceMotion={reduceMotion} />
        case 'error':
          return <ErrorRow onRetry={handleRetry} />
      }
    },
    [reduceMotion, handleRetry],
  )

  const keyExtractor = useCallback((item: ThreadItem) => {
    switch (item.kind) {
      case 'message':
        return `msg-${item.message.id}`
      case 'date-divider':
        return `date-${item.id}`
      case 'persona-divider':
        return `persona-${item.id}`
      case 'thinking':
        return 'thinking'
      case 'error':
        return 'error'
    }
  }, [])

  // UI states explicit:
  // - Loading: pre-snapshot — render the empty state silently (no spinner; the parchment IS the loading aesthetic).
  // - Error:   inline ErrorRow at the bottom of the thread (rendered via threadItems).
  // - Empty:   when snapshot has arrived AND no messages — render EmptyState (with optional consent notice).
  const showEmptyState = snapshotReceived && messages.length === 0

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{'Say'}</Text>
        <Pressable
          onPress={() => setPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Voice: ${activePersonaName}. Tap to change.`}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={styles.headerPersonaButton}>{activePersonaName}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {showEmptyState ? (
          <View style={{ flex: 1 }}>
            <EmptyState consentVisible={consentVisible} onConsentDismiss={handleConsentDismiss} />
          </View>
        ) : (
          <FlatList
            data={threadItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {showCharCounter ? (
            <Text style={styles.charCounter}>{`${2000 - draftLength}`}</Text>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Say something…"
              placeholderTextColor={COLORS.inkSubtle}
              multiline
              maxLength={2000}
              style={styles.input}
              accessibilityLabel="Say message input"
            />
            <Pressable
              onPress={handleSend}
              disabled={sendDisabled}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: sendDisabled }}
              hitSlop={8}
              style={({ pressed }) => ({
                opacity: sendDisabled ? 0.3 : pressed ? 0.6 : 1,
                paddingHorizontal: 6,
              })}
            >
              <Text style={styles.sendButton}>{'✦'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <PersonaPickerModal
        visible={pickerVisible}
        selectedId={selectedPersonaId}
        isPremium={isPremium}
        onSelect={handlePersonaSelect}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  )
}

// ---- Styles -----------------------------------------------------------
// StyleSheet used for typography + numeric tokens that don't map cleanly to
// NativeWind defaults (custom hex colors, exact line-heights, font families).
// Layout containers use the StyleSheet for cohesion with the existing screens.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 24,
    color: COLORS.inkPrimary,
  },
  headerPersonaButton: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: COLORS.amber,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  // ---- Empty state ----
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyGlyph: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 32,
    color: COLORS.amber,
  },
  emptyHeadline: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    color: COLORS.inkPrimary,
    textAlign: 'center',
  },
  emptySubhead: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: COLORS.inkMuted,
    textAlign: 'center',
  },
  consentText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: COLORS.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  consentButton: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: COLORS.amber,
  },
  // ---- Messages ----
  userRow: {
    paddingVertical: 4,
    paddingHorizontal: 20,
  },
  userText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    color: COLORS.inkPrimary,
    textAlign: 'left',
  },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: COLORS.amberTint,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  assistantGlyph: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: COLORS.amber,
    marginRight: 8,
    lineHeight: 26,
  },
  assistantText: {
    flex: 1,
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    color: COLORS.inkPrimary,
    lineHeight: 26,
  },
  // ---- Dividers ----
  dateDivider: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: COLORS.inkMuted,
    textAlign: 'center',
    marginVertical: 16,
  },
  // ---- Thinking ----
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginTop: 20,
  },
  thinkingGlyph: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 18,
    color: COLORS.amber,
    marginRight: 10,
  },
  thinkingDots: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    color: COLORS.inkMuted,
  },
  // ---- Error ----
  errorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: COLORS.inkMuted,
  },
  errorRetry: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: COLORS.amber,
  },
  // ---- Input bar ----
  inputBar: {
    backgroundColor: COLORS.bg,
    borderTopColor: COLORS.amberHairline,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: COLORS.inkPrimary,
    maxHeight: 120,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  sendButton: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 22,
    color: COLORS.amber,
  },
  charCounter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: COLORS.inkMuted,
    textAlign: 'right',
    marginBottom: 4,
  },
  // ---- Persona picker modal ----
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.modalBackdrop,
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
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
    marginBottom: 16,
  },
  pickerTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: COLORS.inkPrimary,
    marginBottom: 16,
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.cardWarmBorder,
  },
  personaCardActive: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.amber,
    backgroundColor: COLORS.amberTintActive,
  },
  personaName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: COLORS.inkPrimary,
  },
  personaDescriptor: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 13,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  personaLock: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: COLORS.amber,
    marginLeft: 8,
  },
})
