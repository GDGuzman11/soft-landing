import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
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
  withTiming,
} from 'react-native-reanimated'
import app, { db } from '@/services/firebase'

// ---- Design tokens ----------------------------------------------------
const COLORS = {
  bg: '#FAF8F5',
  amber: '#C4956A',
  inkPrimary: '#3D2F2A',
  inkMuted: '#9A8F82',
  inkSubtle: '#C4B59A',
  amberTint: 'rgba(196,149,106,0.05)',
  amberHairline: 'rgba(196,149,106,0.2)',
} as const

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

// ---- Voice metadata ---------------------------------------------------
type VoiceId = 'kind' | 'still' | 'steady' | 'wise'

const VOICE_META: Record<VoiceId, { name: string; glyph: string; glyphColor: string }> = {
  kind: { name: 'Kind', glyph: '◐', glyphColor: '#C4956A' },
  still: { name: 'Still', glyph: '◯', glyphColor: '#9A8F82' },
  steady: { name: 'Steady', glyph: '◑', glyphColor: '#C4956A' },
  wise: { name: 'Wise', glyph: '◕', glyphColor: '#6B5E56' },
}

function isVoiceId(value: unknown): value is VoiceId {
  return value === 'kind' || value === 'still' || value === 'steady' || value === 'wise'
}

// ---- Storage keys -----------------------------------------------------
const STORAGE_KEYS = {
  consent: 'say_consent_shown',
} as const

// ---- Message + thread item types --------------------------------------
type SayMessage = {
  id: string
  role: 'user' | 'assistant' | 'reachOut'
  content: string
  reference?: string
  createdAt: Timestamp
}

type ThreadItem =
  | { kind: 'message'; message: SayMessage; marginTop: number }
  | { kind: 'date-divider'; id: string; label: string }
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

function isAssistantLike(role: SayMessage['role']): boolean {
  return role === 'assistant' || role === 'reachOut'
}

function computeMarginTop(prev: SayMessage | null, curr: SayMessage): number {
  if (!prev) return 0
  const prevAssistant = isAssistantLike(prev.role)
  const currAssistant = isAssistantLike(curr.role)
  if (prevAssistant === currAssistant) return 16
  // user → assistant
  if (!prevAssistant && currAssistant) return 20
  // assistant → user
  return 40
}

/**
 * Build the FlatList data array. Returns items in REVERSE chronological order
 * because the FlatList is `inverted`. `reachOut` rows are treated like assistant
 * rows for layout.
 *
 * Input `messages` is expected in chronological (oldest → newest) order.
 */
function buildThreadItems(
  messages: readonly SayMessage[],
  thinking: boolean,
  errored: boolean,
): ThreadItem[] {
  const chrono: ThreadItem[] = []

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

// ---- User message (naked on parchment) --------------------------------
function UserMessage({ content, marginTop }: { content: string; marginTop: number }) {
  return (
    <View style={[styles.userRow, { marginTop }]}>
      <Text style={styles.userText}>{content}</Text>
    </View>
  )
}

// ---- Assistant message (amber-tinted card) ----------------------------
function AssistantMessage({
  content,
  reference,
  marginTop,
}: {
  content: string
  reference?: string
  marginTop: number
}) {
  return (
    <View style={[styles.assistantCard, { marginTop }]}>
      <Text style={styles.assistantGlyph}>{'✦'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.assistantText}>{content}</Text>
        {reference ? <Text style={styles.referenceText}>{reference}</Text> : null}
      </View>
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

// ---- Cloud Function call ----------------------------------------------
type SayResponsePayload = { message: string; personaId: VoiceId }
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
export default function SayThreadScreen() {
  const params = useLocalSearchParams<{ personaId?: string | string[] }>()
  const rawPersonaId = Array.isArray(params.personaId) ? params.personaId[0] : params.personaId
  const personaId: VoiceId = isVoiceId(rawPersonaId) ? rawPersonaId : 'kind'
  const meta = VOICE_META[personaId]

  const [messages, setMessages] = useState<SayMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errored, setErrored] = useState(false)
  const [consentVisible, setConsentVisible] = useState(false)
  const [snapshotReceived, setSnapshotReceived] = useState(false)
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
        // non-fatal
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ---- Auth check + consent load -------------------------------------
  useEffect(() => {
    let cancelled = false
    const user = getAuth().currentUser
    if (!user) {
      router.replace('/sign-in')
      return
    }
    setAuthReady(true)

    AsyncStorage.getItem(STORAGE_KEYS.consent)
      .then((storedConsent) => {
        if (cancelled) return
        setConsentVisible(storedConsent !== 'true')
      })
      .catch(() => {
        // non-fatal
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

    const messagesRef = collection(db, 'say', user.uid, personaId)
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: SayMessage[] = []
        snap.forEach((d) => {
          const data = d.data() as {
            role?: unknown
            content?: unknown
            reference?: unknown
            createdAt?: unknown
          }
          let role: SayMessage['role'] = 'user'
          if (data.role === 'assistant') role = 'assistant'
          else if (data.role === 'reachOut') role = 'reachOut'
          const content = typeof data.content === 'string' ? data.content : ''
          const reference = typeof data.reference === 'string' ? data.reference : undefined
          if (!(data.createdAt instanceof Timestamp)) return
          docs.push({ id: d.id, role, content, reference, createdAt: data.createdAt })
        })
        docs.reverse()
        setMessages(docs)
        setSnapshotReceived(true)
      },
      () => {
        setSnapshotReceived(true)
        setErrored(true)
      },
    )

    return () => unsub()
    // NOTE: do NOT write to /sayState/{uid} from the client — Firestore rules
    // block client writes; the backend owns that document. The unread dot
    // clears server-side via the reach-out delivery flow.
  }, [authReady, personaId])

  // ---- Send handler --------------------------------------------------
  const handleSend = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSending) return
    setErrored(false)
    setIsSending(true)
    setDraft('')
    const payload: SayResponsePayload = { message: trimmed, personaId }
    lastSendPayloadRef.current = payload

    try {
      const result = await callGenerateSayResponse(payload)
      if (result.blocked || result.rateLimited) {
        setErrored(true)
      } else if (result.showCrisisPrompt) {
        router.push('/check-in/message' as never)
      }
    } catch {
      setErrored(true)
    } finally {
      setIsSending(false)
    }
  }, [draft, isSending, personaId])

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

  // ---- Consent dismiss -----------------------------------------------
  const handleConsentDismiss = useCallback(() => {
    setConsentVisible(false)
    AsyncStorage.setItem(STORAGE_KEYS.consent, 'true').catch(() => {
      // non-fatal
    })
  }, [])

  // ---- Build thread items --------------------------------------------
  const threadItems = useMemo(
    () => buildThreadItems(messages, isSending, errored),
    [messages, isSending, errored],
  )

  const draftLength = draft.length
  const showCharCounter = draftLength >= 1800
  const sendDisabled = draft.trim().length === 0 || isSending

  const renderItem: ListRenderItem<ThreadItem> = useCallback(
    ({ item }) => {
      switch (item.kind) {
        case 'message': {
          const msg = item.message
          if (msg.role === 'user') {
            return <UserMessage content={msg.content} marginTop={item.marginTop} />
          }
          return (
            <AssistantMessage
              content={msg.content}
              reference={msg.reference}
              marginTop={item.marginTop}
            />
          )
        }
        case 'date-divider':
          return <DateDivider label={item.label} />
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
      case 'thinking':
        return 'thinking'
      case 'error':
        return 'error'
    }
  }, [])

  // UI states explicit:
  // - Loading: pre-snapshot — render the empty state silently (no spinner; the parchment IS the loading aesthetic).
  // - Error: inline ErrorRow at the bottom of the thread (rendered via threadItems).
  // - Empty: when snapshot has arrived AND no messages — render EmptyState (with optional consent notice).
  const showEmptyState = snapshotReceived && messages.length === 0

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Text style={styles.backArrow}>{'←'}</Text>
        </Pressable>
        <View style={styles.headerVoice}>
          <Text style={[styles.headerGlyph, { color: meta.glyphColor }]}>{meta.glyph}</Text>
          <Text style={styles.headerName}>{meta.name}</Text>
        </View>
        <View style={{ width: 32 }} />
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
    </SafeAreaView>
  )
}

// ---- Styles -----------------------------------------------------------
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
  backArrow: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 22,
    color: COLORS.inkPrimary,
    width: 32,
  },
  headerVoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerGlyph: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 20,
  },
  headerName: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 20,
    color: COLORS.inkPrimary,
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
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    color: COLORS.inkPrimary,
    lineHeight: 26,
  },
  referenceText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: COLORS.inkSubtle,
    fontStyle: 'italic',
    marginTop: 6,
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
})
