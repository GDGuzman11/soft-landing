import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  collection,
  deleteDoc,
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
import { useTheme, VOICE_DARK } from '@/theme'

const STAMP = require('../../../assets/images/icon-nobackground.png') as number

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

// ---- Voice metadata -------------------------------------------------------
type VoiceId = 'kind' | 'still' | 'steady' | 'wise'

const VOICE_META: Record<VoiceId, { name: string; glyph: string; glyphColor: string; bg: string; border: string }> = {
  kind:   { name: 'Kind',   glyph: '◐', glyphColor: '#C4956A', bg: '#FAF6F0', border: 'rgba(196,149,106,0.22)' },
  still:  { name: 'Still',  glyph: '◯', glyphColor: '#9A8F82', bg: '#F6F4F0', border: 'rgba(154,143,130,0.22)' },
  steady: { name: 'Steady', glyph: '◑', glyphColor: '#7D5D4B', bg: '#F4F0EA', border: 'rgba(125,93,75,0.22)' },
  wise:   { name: 'Wise',   glyph: '◕', glyphColor: '#6C5944', bg: '#F2EEE6', border: 'rgba(108,89,68,0.22)' },
}

function voiceSurface(id: VoiceId, isDark: boolean) {
  return isDark
    ? { bg: VOICE_DARK[id]?.bg ?? VOICE_META[id].bg, border: VOICE_DARK[id]?.border ?? VOICE_META[id].border }
    : { bg: VOICE_META[id].bg, border: VOICE_META[id].border }
}

function isVoiceId(v: unknown): v is VoiceId {
  return v === 'kind' || v === 'still' || v === 'steady' || v === 'wise'
}

// ---- Types ----------------------------------------------------------------
type SayMessage = {
  id: string
  role: 'user' | 'assistant' | 'reachOut'
  content: string
  reference?: string
  createdAt: Timestamp
}

type ThreadItem =
  | { kind: 'message'; message: SayMessage; isLastInGroup: boolean }
  | { kind: 'date-divider'; id: string; label: string }
  | { kind: 'typing'; id: string }
  | { kind: 'error'; id: string }

// ---- Helpers --------------------------------------------------------------
function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatDateLabel(date: Date): string {
  const now = new Date()
  if (isSameCalendarDay(date, now)) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameCalendarDay(date, yesterday)) return 'Yesterday'
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' })
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

function isAI(role: SayMessage['role']): boolean {
  return role === 'assistant' || role === 'reachOut'
}

function buildThreadItems(
  messages: readonly SayMessage[],
  typing: boolean,
  errored: boolean,
): ThreadItem[] {
  const chrono: ThreadItem[] = []
  let prev: SayMessage | null = null

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!
    const next = messages[i + 1]

    if (prev) {
      const prevDate = prev.createdAt.toDate()
      const currDate = m.createdAt.toDate()
      if (!isSameCalendarDay(prevDate, currDate) ||
          Math.abs(currDate.getTime() - prevDate.getTime()) > SIX_HOURS_MS) {
        chrono.push({ kind: 'date-divider', id: `date-${m.id}`, label: formatDateLabel(currDate) })
      }
    }

    const isLastInGroup = !next || isAI(next.role) !== isAI(m.role)
    chrono.push({ kind: 'message', message: m, isLastInGroup })
    prev = m
  }

  if (typing) chrono.push({ kind: 'typing', id: 'typing' })
  if (errored) chrono.push({ kind: 'error', id: 'error' })

  return chrono.reverse()
}

// ---- Typing indicator — three bouncing dots -------------------------------
function TypingDot({ delay, reduceMotion }: { delay: number; reduceMotion: boolean }) {
  const y = useSharedValue(0)
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    if (reduceMotion) return
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(-5, { duration: 300 }), withTiming(0, { duration: 300 })),
        -1,
        false,
      ),
    )
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 300 }), withTiming(0.4, { duration: 300 })),
        -1,
        false,
      ),
    )
    return () => {
      cancelAnimation(y)
      cancelAnimation(opacity)
    }
  }, [y, opacity, delay, reduceMotion])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }))

  return <Animated.View style={[styles.typingDot, style]} />
}

function TypingIndicator({ voiceId, reduceMotion, bg, border }: { voiceId: VoiceId; reduceMotion: boolean; bg: string; border: string }) {
  const meta = VOICE_META[voiceId]
  return (
    <View style={[styles.aiBubbleRow, styles.typingRow]}>
      <Text style={[styles.voiceAvatar, { color: meta.glyphColor }]}>{meta.glyph}</Text>
      <View style={[styles.aiBubble, styles.typingBubble, { backgroundColor: bg, borderColor: border }]}>
        <TypingDot delay={0} reduceMotion={reduceMotion} />
        <TypingDot delay={150} reduceMotion={reduceMotion} />
        <TypingDot delay={300} reduceMotion={reduceMotion} />
      </View>
    </View>
  )
}

// ---- Date divider ---------------------------------------------------------
function DateDivider({ label }: { label: string }) {
  return <Text style={styles.dateDivider}>{`· · · ${label} · · ·`}</Text>
}

// ---- User bubble (right-aligned) ------------------------------------------
function UserBubble({
  content,
  isLastInGroup,
  highlight,
}: {
  content: string
  isLastInGroup: boolean
  highlight: boolean
}) {
  return (
    <View style={styles.userBubbleWrapper}>
      <View style={[styles.userBubble, isLastInGroup && styles.userBubbleTail, highlight && styles.highlightBubble]}>
        <Text style={styles.userBubbleText}>{content}</Text>
      </View>
    </View>
  )
}

// ---- AI bubble (left-aligned) ---------------------------------------------
function AIBubble({
  content,
  reference,
  voiceId,
  isLastInGroup,
  highlight,
  bg,
  border,
  inkPrimary,
  inkSubtle,
}: {
  content: string
  reference?: string
  voiceId: VoiceId
  isLastInGroup: boolean
  highlight: boolean
  bg: string
  border: string
  inkPrimary: string
  inkSubtle: string
}) {
  const meta = VOICE_META[voiceId]
  return (
    <View style={styles.aiBubbleRow}>
      {isLastInGroup ? (
        <Text style={[styles.voiceAvatar, { color: meta.glyphColor }]}>{meta.glyph}</Text>
      ) : (
        <View style={styles.voiceAvatarGap} />
      )}
      <View style={[
        styles.aiBubble,
        isLastInGroup && styles.aiBubbleTail,
        { backgroundColor: bg, borderColor: border },
        highlight && styles.highlightBubble,
      ]}>
        <Text style={[styles.aiBubbleText, { color: inkPrimary }]}>{content}</Text>
        {reference ? <Text style={[styles.referenceText, { color: inkSubtle }]}>{reference}</Text> : null}
      </View>
    </View>
  )
}

// ---- Inline error ---------------------------------------------------------
function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorRow}>
      <Text style={styles.errorText}>{"didn't reach me. "}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again">
        <Text style={styles.errorRetry}>{'Try again'}</Text>
      </Pressable>
    </View>
  )
}

// ---- Empty state ----------------------------------------------------------
function EmptyState({ meta, consentVisible, onConsentDismiss, inkPrimary, inkMuted }: {
  meta: (typeof VOICE_META)[VoiceId]
  consentVisible: boolean
  onConsentDismiss: () => void
  inkPrimary: string
  inkMuted: string
}) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyGlyph, { color: meta.glyphColor }]}>{meta.glyph}</Text>
      <View style={{ height: 12 }} />
      <Text style={[styles.emptyName, { color: inkPrimary }]}>{meta.name}</Text>
      <View style={{ height: 20 }} />
      {consentVisible ? (
        <>
          <Text style={[styles.consentText, { color: inkMuted }]}>
            {'Your words are stored to help this space remember you. You can delete everything from Settings.'}
          </Text>
          <Pressable
            onPress={onConsentDismiss}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginTop: 14 })}
          >
            <Text style={styles.consentButton}>{'got it ✦'}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  )
}

// ---- Cloud Function -------------------------------------------------------
type SayPayload = { message: string; personaId: VoiceId }
type SayResult = {
  response?: string
  blocked?: boolean
  showCrisisPrompt?: boolean
  rateLimited?: boolean
  rateLimitType?: 'daily' | 'burst'
}

async function callGenerateSayResponse(payload: SayPayload): Promise<SayResult> {
  const fn = httpsCallable<SayPayload, SayResult>(getFunctions(app, 'us-central1'), 'generateSayResponse')
  return (await fn(payload)).data
}

// ---- Main screen ----------------------------------------------------------
export default function SayThreadScreen() {
  const { isDark, colors } = useTheme()
  const params = useLocalSearchParams<{ personaId?: string | string[] }>()
  const raw = Array.isArray(params.personaId) ? params.personaId[0] : params.personaId
  const personaId: VoiceId = isVoiceId(raw) ? raw : 'kind'
  const meta = VOICE_META[personaId]
  const { bg: vBg, border: vBorder } = voiceSurface(personaId, isDark)

  const [messages, setMessages] = useState<SayMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [errored, setErrored] = useState(false)
  const [consentVisible, setConsentVisible] = useState(false)
  const [snapshotReceived, setSnapshotReceived] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [clearing, setClearing] = useState(false)

  const lastPayloadRef = useRef<SayPayload | null>(null)
  const searchInputRef = useRef<TextInput>(null)

  // Manual fetch — fallback for Expo Go where onSnapshot WebSocket is unreliable
  const fetchMessages = useCallback(async () => {
    const user = getAuth().currentUser
    if (!user) return
    try {
      const snap = await getDocs(
        query(collection(db, 'say', user.uid, personaId), orderBy('createdAt', 'desc'), limit(50)),
      )
      const docs: SayMessage[] = []
      snap.forEach((d) => {
        const data = d.data() as { role?: unknown; content?: unknown; reference?: unknown; createdAt?: unknown }
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
    } catch {
      // silent — onSnapshot may still be working
    }
  }, [personaId])

  // Reduce motion
  useEffect(() => {
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (!cancelled) setReduceMotion(v) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Auth + consent
  useEffect(() => {
    let cancelled = false
    if (!getAuth().currentUser) { router.replace('/sign-in'); return }
    setAuthReady(true)
    AsyncStorage.getItem('say_consent_shown')
      .then((v) => { if (!cancelled) setConsentVisible(v !== 'true') })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Initial load + Firestore subscription
  useEffect(() => {
    if (!authReady) return
    const user = getAuth().currentUser
    if (!user) return

    void fetchMessages()

    const q = query(
      collection(db, 'say', user.uid, personaId),
      orderBy('createdAt', 'desc'),
      limit(50),
    )

    return onSnapshot(
      q,
      (snap) => {
        const docs: SayMessage[] = []
        snap.forEach((d) => {
          const data = d.data() as { role?: unknown; content?: unknown; reference?: unknown; createdAt?: unknown }
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
      () => { setSnapshotReceived(true) },
    )
  }, [authReady, personaId, fetchMessages])

  // Send
  const handleSend = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || isTyping) return
    setErrored(false)
    setIsTyping(true)
    setDraft('')
    const payload: SayPayload = { message: trimmed, personaId }
    lastPayloadRef.current = payload

    try {
      const result = await callGenerateSayResponse(payload)
      if (result.blocked || result.rateLimited) setErrored(true)
      else if (result.showCrisisPrompt) router.push('/check-in/message' as never)
      else await fetchMessages()
    } catch {
      setErrored(true)
    } finally {
      setIsTyping(false)
    }
  }, [draft, isTyping, personaId, fetchMessages])

  const handleRetry = useCallback(async () => {
    const last = lastPayloadRef.current
    if (!last || isTyping) return
    setErrored(false)
    setIsTyping(true)
    try {
      const result = await callGenerateSayResponse(last)
      if (result.blocked || result.rateLimited) setErrored(true)
      else await fetchMessages()
    } catch {
      setErrored(true)
    } finally {
      setIsTyping(false)
    }
  }, [isTyping, fetchMessages])

  // Clear conversation
  const handleClearChat = useCallback(() => {
    Alert.alert(
      'Clear conversation',
      `This will permanently delete all messages with ${meta.name}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const user = getAuth().currentUser
            if (!user) return
            setClearing(true)
            try {
              const snap = await getDocs(
                query(collection(db, 'say', user.uid, personaId), limit(500)),
              )
              await Promise.all(
                snap.docs.map((d) => deleteDoc(doc(db, 'say', user.uid, personaId, d.id))),
              )
              setMessages([])
            } catch {
              Alert.alert('Something went wrong', 'Could not clear the conversation. Try again.')
            } finally {
              setClearing(false)
            }
          },
        },
      ],
    )
  }, [meta.name, personaId])

  // Search
  const enterSearch = useCallback(() => {
    setSearchMode(true)
    setTimeout(() => searchInputRef.current?.focus(), 80)
  }, [])

  const exitSearch = useCallback(() => {
    setSearchMode(false)
    setSearchQuery('')
  }, [])

  // Overflow menu (search + clear)
  const handleOverflow = useCallback(() => {
    Alert.alert(
      meta.name,
      undefined,
      [
        { text: 'Search messages', onPress: enterSearch },
        { text: 'Clear conversation', style: 'destructive', onPress: handleClearChat },
        { text: 'Cancel', style: 'cancel' },
      ],
    )
  }, [meta.name, enterSearch, handleClearChat])

  // Filtered messages for search
  const visibleMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  }, [messages, searchQuery])

  const isSearching = searchMode && searchQuery.trim().length > 0

  const threadItems = useMemo(
    () => buildThreadItems(
      isSearching ? visibleMessages : messages,
      isTyping && !searchMode,
      errored && !searchMode,
    ),
    [messages, visibleMessages, isTyping, errored, searchMode, isSearching],
  )

  const renderItem: ListRenderItem<ThreadItem> = useCallback(
    ({ item }) => {
      switch (item.kind) {
        case 'message': {
          const { message: m, isLastInGroup } = item
          const highlight = isSearching && m.content.toLowerCase().includes(searchQuery.trim().toLowerCase())
          if (m.role === 'user') {
            return <UserBubble content={m.content} isLastInGroup={isLastInGroup} highlight={highlight} />
          }
          return (
            <AIBubble
              content={m.content}
              reference={m.reference}
              voiceId={personaId}
              isLastInGroup={isLastInGroup}
              highlight={highlight}
              bg={vBg}
              border={vBorder}
              inkPrimary={colors.inkPrimary}
              inkSubtle={colors.inkSubtle}
            />
          )
        }
        case 'date-divider': return <DateDivider label={item.label} />
        case 'typing': return <TypingIndicator voiceId={personaId} reduceMotion={reduceMotion} bg={vBg} border={vBorder} />
        case 'error': return <ErrorRow onRetry={handleRetry} />
      }
    },
    [personaId, reduceMotion, handleRetry, isSearching, searchQuery],
  )

  const keyExtractor = useCallback((item: ThreadItem) => {
    switch (item.kind) {
      case 'message': return `msg-${item.message.id}`
      case 'date-divider': return `date-${item.id}`
      case 'typing': return 'typing'
      case 'error': return 'error'
    }
  }, [])

  const sendDisabled = draft.trim().length === 0 || isTyping || clearing
  const showCharCounter = draft.length >= 1800
  const showEmpty = snapshotReceived && messages.length === 0 && !searchMode
  const showSearchEmpty = isSearching && visibleMessages.length === 0

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.headerBg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBg} />

      {/* Header */}
      {searchMode ? (
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.hairline }]}>
          <TextInput
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="search messages…"
            placeholderTextColor={colors.inkSubtle}
            style={[styles.searchInput, { color: colors.inkPrimary, backgroundColor: colors.searchBg }]}
            accessibilityLabel="Search messages"
            returnKeyType="search"
            autoCorrect={false}
          />
          <Pressable
            onPress={exitSearch}
            accessibilityRole="button"
            accessibilityLabel="Cancel search"
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={[styles.cancelSearch, { color: colors.amber }]}>{'Cancel'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.hairline }]}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
            <Text style={[styles.backArrow, { color: colors.inkPrimary }]}>{'←'}</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerGlyph, { color: meta.glyphColor }]}>{meta.glyph}</Text>
            <Text style={[styles.headerName, { color: colors.inkPrimary }]}>{meta.name}</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={enterSearch}
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={[styles.headerIcon, { color: colors.inkPrimary }]}>{'⌕'}</Text>
            </Pressable>
            <Pressable
              onPress={handleOverflow}
              accessibilityRole="button"
              accessibilityLabel="More options"
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={[styles.headerIcon, { color: colors.inkPrimary }]}>{'···'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={[styles.body, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {showSearchEmpty ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.searchEmptyText, { color: colors.inkMuted }]}>{`no messages matching "${searchQuery.trim()}"`}</Text>
          </View>
        ) : showEmpty ? (
          <View style={{ flex: 1 }}>
            <EmptyState
              meta={meta}
              consentVisible={consentVisible}
              inkPrimary={colors.inkPrimary}
              inkMuted={colors.inkMuted}
              onConsentDismiss={() => {
                setConsentVisible(false)
                AsyncStorage.setItem('say_consent_shown', 'true').catch(() => {})
              }}
            />
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

        {/* Input bar — hidden while searching */}
        {!searchMode ? (
          <View style={[styles.inputBar, { borderTopColor: colors.hairline, backgroundColor: colors.bg }]}>
            {showCharCounter ? (
              <Text style={[styles.charCounter, { color: colors.inkMuted }]}>{`${2000 - draft.length}`}</Text>
            ) : null}
            <View style={[styles.inputRow, { backgroundColor: colors.inputRow }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="say something…"
                placeholderTextColor={colors.inkSubtle}
                multiline
                maxLength={2000}
                style={[styles.input, { color: colors.inkPrimary }]}
                accessibilityLabel="Say message input"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              <Pressable
                onPress={handleSend}
                disabled={sendDisabled}
                accessibilityRole="button"
                accessibilityLabel="Send"
                hitSlop={8}
                style={({ pressed }) => ({
                  marginLeft: 8,
                  opacity: sendDisabled ? 0.25 : pressed ? 0.6 : 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Image source={STAMP} style={{ width: 36, height: 36 }} resizeMode="contain" />
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ---- Styles ---------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backArrow: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 22,
    lineHeight: 28,
    opacity: 0.75,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerGlyph: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 20,
  },
  headerName: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: 64,
    justifyContent: 'flex-end',
  },
  headerIcon: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 20,
  },
  // ---- Search header ----
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    marginRight: 12,
  },
  cancelSearch: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
  // ---- Thread ----
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  // ---- User bubble ----
  userBubbleWrapper: {
    alignItems: 'flex-end',
    marginTop: 3,
    paddingLeft: 60,
  },
  userBubble: {
    backgroundColor: '#C4956A',
    borderRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  userBubbleTail: {
    borderBottomRightRadius: 5,
  },
  userBubbleText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  // ---- AI bubble ----
  aiBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 3,
    paddingRight: 60,
  },
  voiceAvatar: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    width: 28,
    marginRight: 6,
    textAlign: 'center',
    marginBottom: 2,
  },
  voiceAvatarGap: {
    width: 34,
  },
  aiBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
    flex: 1,
  },
  aiBubbleTail: {
    borderBottomLeftRadius: 5,
  },
  aiBubbleText: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 17,
    lineHeight: 25,
  },
  referenceText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 6,
  },
  // ---- Search highlight ----
  highlightBubble: {
    borderWidth: 2,
    borderColor: '#C4956A',
  },
  // ---- Typing indicator ----
  typingRow: {
    marginTop: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: 'flex-start',
    flex: 0,
    maxWidth: 72,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9A8F82',
  },
  // ---- Date divider ----
  dateDivider: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#9A8F82',
    textAlign: 'center',
    marginVertical: 14,
  },
  // ---- Error ----
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#9A8F82',
  },
  errorRetry: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#C4956A',
  },
  // ---- Empty state ----
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyGlyph: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 36,
  },
  emptyName: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 22,
  },
  consentText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  consentButton: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#C4956A',
  },
  searchEmptyText: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 15,
    textAlign: 'center',
  },
  // ---- Input bar ----
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    borderTopWidth: 1,
  },
  charCounter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 5,
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 6,
  },
})
