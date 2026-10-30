import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { db } from '@/services/firebase'
import { useTheme } from '@/theme'
import { startSayChat, type SayPersonaId } from '@/components/say/startSayChat'
import { SAY_IMAGES } from '@/components/say/sayImages'
import { deleteSayChat } from '@/services/sayChats'
import { localDayKey } from '@/storage/storage'
import * as Haptics from 'expo-haptics'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Ionicons } from '@expo/vector-icons'

type VoiceId = SayPersonaId
type ChatKind = 'journal' | 'everyday'

const VOICE_NAME: Record<VoiceId, string> = { kind: 'Kind', still: 'Still', steady: 'Steady', wise: 'Wise' }

function isVoiceId(v: unknown): v is VoiceId {
  return v === 'kind' || v === 'still' || v === 'steady' || v === 'wise'
}

// ---- Types ----------------------------------------------------------------
// Mirrors the Firestore chat doc: say/{uid}/{personaId}/{chatId}
type SayChat = {
  id: string
  createdAt: Timestamp | null
  lastMessageAt: Timestamp | null
  preview: string
  title?: string
  summary?: string
  daySummary?: string
  kind: ChatKind
}

// ---- Helpers --------------------------------------------------------------
function timeOfDay(ts: Timestamp | null): string {
  if (!ts) return ''
  return ts.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function sectionLabel(dayKey: string): string {
  const today = localDayKey()
  const yesterday = localDayKey(new Date(Date.now() - 86400000))
  if (dayKey === today) return 'Today'
  if (dayKey === yesterday) return 'Yesterday'
  const [y, m, d] = dayKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

type DayGroup = { key: string; label: string; items: SayChat[] }

function groupByDay(chats: SayChat[]): DayGroup[] {
  const groups: DayGroup[] = []
  const index = new Map<string, DayGroup>()
  for (const c of chats) {
    const key = c.lastMessageAt ? localDayKey(c.lastMessageAt.toDate()) : 'unknown'
    let g = index.get(key)
    if (!g) {
      g = { key, label: key === 'unknown' ? 'Earlier' : sectionLabel(key), items: [] }
      index.set(key, g)
      groups.push(g)
    }
    g.items.push(c)
  }
  return groups
}

// ---- Zen mark (minimal breathing enso, replaces per-entry photos) ---------
function ZenMark({ reduced }: { reduced: boolean }) {
  const p = useSharedValue(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    p.value = withRepeat(withSequence(withTiming(1, { duration: 1600 }), withTiming(0, { duration: 1600 })), -1, false)
  }, [reduced])
  const inner = useAnimatedStyle(() => ({ opacity: 0.4 + p.value * 0.5, transform: [{ scale: 0.8 + p.value * 0.25 }] }))
  return (
    <View style={styles.zen}>
      <Animated.View style={[styles.zenDot, inner]} />
    </View>
  )
}

// ---- Chat row -------------------------------------------------------------
const ROW_DELAYS = [60, 120, 180, 240, 300] as const

function ChatRow({
  chat,
  index,
  reduced,
  onPress,
  onDelete,
}: {
  chat: SayChat
  index: number
  reduced: boolean
  onPress: () => void
  onDelete: () => void
}) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(10)
  const scale = useSharedValue(1)

  useEffect(() => {
    const delay = ROW_DELAYS[Math.min(index, ROW_DELAYS.length - 1)] ?? 60
    const cfg = { duration: 440, easing: Easing.out(Easing.cubic) }
    opacity.value = withDelay(delay, withTiming(1, cfg))
    translateY.value = withDelay(delay, withTiming(0, cfg))
  }, [opacity, translateY, index])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }))

  const title = chat.title?.trim() || chat.preview.trim() || 'New chat'
  const summary = chat.summary?.trim() || chat.daySummary?.trim() || chat.preview.trim() || ''
  const time = timeOfDay(chat.lastMessageAt)

  const renderRightActions = () => (
    <Pressable
      onPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel="Delete chat"
      style={({ pressed }) => [styles.deleteAction, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
    </Pressable>
  )

  return (
    <Animated.View style={[styles.cardWrapper, animStyle]}>
      <ReanimatedSwipeable friction={2} rightThreshold={40} overshootRight={false} renderRightActions={renderRightActions}>
        <Pressable
          onPress={onPress}
          onPressIn={() => { scale.value = withTiming(0.98, { duration: 150 }) }}
          onPressOut={() => { scale.value = withTiming(1, { duration: 150 }) }}
          accessibilityRole="button"
          accessibilityLabel={`${title}${summary ? `. ${summary}` : ''}${time ? `, ${time}` : ''}`}
        >
          <View style={styles.card}>
            <ZenMark reduced={reduced} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
              {summary ? (
                <Text style={styles.cardSummary} numberOfLines={2}>{summary}</Text>
              ) : null}
            </View>
            <View style={styles.cardRight}>
              {time ? <Text style={styles.cardTime}>{time}</Text> : null}
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.55)" />
            </View>
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  )
}

// ---- Main screen ----------------------------------------------------------
export default function SayChatListScreen() {
  const { isDark, colors } = useTheme()
  const reduced = useReducedMotion()
  const params = useLocalSearchParams<{ personaId?: string | string[] }>()
  const rawPersona = Array.isArray(params.personaId) ? params.personaId[0] : params.personaId
  const personaId: VoiceId = isVoiceId(rawPersona) ? rawPersona : 'kind'
  const name = VOICE_NAME[personaId]

  const [authReady, setAuthReady] = useState(false)
  const [chats, setChats] = useState<SayChat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [starting, setStarting] = useState(false)
  const [tab, setTab] = useState<ChatKind>('journal')

  const headerOpacity = useSharedValue(0)
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }))
  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) })
  }, [headerOpacity])

  // Auth gate
  useEffect(() => {
    if (!getAuth().currentUser) {
      router.replace('/sign-in')
      return
    }
    setAuthReady(true)
  }, [])

  // Subscribe to this persona's chats, most-recent first.
  useEffect(() => {
    if (!authReady) return
    const user = getAuth().currentUser
    if (!user) return
    const q = query(collection(db, 'say', user.uid, personaId), orderBy('lastMessageAt', 'desc'))
    return onSnapshot(
      q,
      (snap) => {
        const next: SayChat[] = []
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>
          next.push({
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
            lastMessageAt: data.lastMessageAt instanceof Timestamp ? data.lastMessageAt : null,
            preview: typeof data.preview === 'string' ? data.preview : '',
            title: typeof data.title === 'string' ? data.title : undefined,
            summary: typeof data.summary === 'string' ? data.summary : undefined,
            daySummary: typeof data.daySummary === 'string' ? data.daySummary : undefined,
            kind: data.kind === 'journal' ? 'journal' : 'everyday',
          })
        })
        setChats(next)
        setError(false)
        setLoading(false)
      },
      () => {
        setError(true)
        setLoading(false)
      },
    )
  }, [authReady, personaId])

  const groups = useMemo(() => groupByDay(chats.filter((c) => c.kind === tab)), [chats, tab])

  const handleStartNewChat = useCallback(async () => {
    if (starting) return
    setStarting(true)
    try {
      const chatId = await startSayChat(personaId)
      router.push({ pathname: '/say/[personaId]/[chatId]', params: { personaId, chatId } })
    } catch {
      setStarting(false)
    }
  }, [personaId, starting])

  const handleOpenChat = useCallback(
    (chatId: string) => router.push({ pathname: '/say/[personaId]/[chatId]', params: { personaId, chatId } }),
    [personaId],
  )

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      Alert.alert('Delete this chat?', "This can't be undone.", [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
            deleteSayChat(personaId, chatId).catch(() => Alert.alert('Could not delete', 'Please try again.'))
          },
        },
      ])
    },
    [personaId],
  )

  const heroTitle = tab === 'journal' ? 'Your Journal\nConversations' : 'Your Everyday\nConversations'
  const heroSubtitle =
    tab === 'journal'
      ? 'Pick a past entry to continue the conversation or explore it deeper.'
      : 'Chat about anything on your mind — support, new perspectives, or a kinder way forward.'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <Image
        source={isDark ? SAY_IMAGES[personaId].night : SAY_IMAGES[personaId].day}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header: back + name (no glyph, no subtitle) */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
          <Text style={styles.headerName}>{name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.hero}>{heroTitle}</Text>
          <Text style={styles.heroSub}>{heroSubtitle}</Text>

          {/* Journal / Everyday toggle */}
          <View style={styles.toggle}>
            {(['journal', 'everyday'] as const).map((t) => {
              const activeTab = tab === t
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeTab }}
                  style={[styles.toggleItem, activeTab && { backgroundColor: colors.amber }]}
                >
                  <Ionicons
                    name={t === 'journal' ? 'book-outline' : 'chatbubble-outline'}
                    size={14}
                    color={activeTab ? '#FFFFFF' : 'rgba(255,255,255,0.8)'}
                  />
                  <Text style={[styles.toggleLabel, { color: activeTab ? '#FFFFFF' : 'rgba(255,255,255,0.8)' }]}>
                    {t === 'journal' ? 'Journal Entries' : 'Everyday Chat'}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color="#FFFFFF" size="small" />
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Text style={styles.stateText}>{"couldn't load your chats"}</Text>
              <Pressable onPress={() => { setError(false); setLoading(true) }} hitSlop={10} style={{ marginTop: 10 }}>
                <Text style={[styles.stateText, { color: colors.amber }]}>try again</Text>
              </Pressable>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.stateText}>
                {tab === 'journal'
                  ? `No journal entries yet.\nHand a letter to ${name} to start one.`
                  : `No everyday chats yet.\nTap New Chat to begin with ${name}.`}
              </Text>
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.key} style={{ marginBottom: 8 }}>
                <Text style={styles.sectionLabel}>{g.label}</Text>
                <View style={styles.stack}>
                  {g.items.map((chat, i) => (
                    <ChatRow
                      key={chat.id}
                      chat={chat}
                      index={i}
                      reduced={reduced}
                      onPress={() => handleOpenChat(chat.id)}
                      onDelete={() => handleDeleteChat(chat.id)}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* New-chat FAB — everyday chats only (journal chats come from letters) */}
        {tab === 'everyday' ? (
          <Animated.View style={[styles.fabWrap, headerStyle]}>
            <Pressable
              onPress={handleStartNewChat}
              disabled={starting}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
              style={({ pressed }) => [styles.fab, { backgroundColor: colors.amber, opacity: starting ? 0.7 : pressed ? 0.9 : 1 }]}
            >
              {starting ? <ActivityIndicator color="#3D2F2A" size="small" /> : <Ionicons name="add" size={28} color="#3D2F2A" />}
            </Pressable>
            <Text style={styles.fabLabel}>New Chat</Text>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </View>
  )
}

// ---- Styles ---------------------------------------------------------------
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backArrow: { fontFamily: 'DMSans_400Regular', fontSize: 24, lineHeight: 28, color: '#FFFFFF', width: 40 },
  headerName: { fontFamily: 'Lora_400Regular_Italic', fontSize: 20, color: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  hero: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 30,
    lineHeight: 38,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
    padding: 4,
    gap: 4,
    marginTop: 18,
    marginBottom: 20,
  },
  toggleItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13 },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 10,
    marginLeft: 2,
  },
  stack: { gap: 10 },
  cardWrapper: { width: '100%' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  zen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.85)' },
  cardTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#FFFFFF' },
  cardSummary: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  cardTime: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  deleteAction: {
    backgroundColor: '#C96A58',
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
    alignSelf: 'stretch',
    borderRadius: 16,
    marginLeft: 8,
  },
  centerState: { alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingHorizontal: 24 },
  stateText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    color: 'rgba(255,255,255,0.85)',
  },
  fabWrap: { position: 'absolute', bottom: 24, right: 20, alignItems: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 6, letterSpacing: 0.3, color: 'rgba(255,255,255,0.85)' },
})
