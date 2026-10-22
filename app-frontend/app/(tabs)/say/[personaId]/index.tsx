import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { db } from '@/services/firebase'
import { useTheme, VOICE_DARK } from '@/theme'
import { startSayChat, type SayPersonaId } from '@/components/say/startSayChat'
import { deleteSayChat } from '@/services/sayChats'
import * as Haptics from 'expo-haptics'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { Ionicons } from '@expo/vector-icons'

// ---- Voice metadata -------------------------------------------------------
type VoiceId = SayPersonaId

const VOICE_META: Record<VoiceId, { name: string; glyph: string; glyphColor: string; bg: string; border: string }> = {
  kind:   { name: 'Kind',   glyph: '◐', glyphColor: '#C4956A', bg: '#FAF6F0', border: 'rgba(196,149,106,0.22)' },
  still:  { name: 'Still',  glyph: '◯', glyphColor: '#9A8F82', bg: '#F6F4F0', border: 'rgba(154,143,130,0.22)' },
  steady: { name: 'Steady', glyph: '◑', glyphColor: '#7D5D4B', bg: '#F4F0EA', border: 'rgba(125,93,75,0.22)' },
  wise:   { name: 'Wise',   glyph: '◕', glyphColor: '#6C5944', bg: '#F2EEE6', border: 'rgba(108,89,68,0.22)' },
}

function isVoiceId(v: unknown): v is VoiceId {
  return v === 'kind' || v === 'still' || v === 'steady' || v === 'wise'
}

function voiceSurface(id: VoiceId, isDark: boolean): { bg: string; border: string } {
  return isDark
    ? { bg: VOICE_DARK[id]?.bg ?? VOICE_META[id].bg, border: VOICE_DARK[id]?.border ?? VOICE_META[id].border }
    : { bg: VOICE_META[id].bg, border: VOICE_META[id].border }
}

// ---- Types ----------------------------------------------------------------
// Mirrors the Firestore chat doc: say/{uid}/{personaId}/{chatId}
type SayChat = {
  id: string
  createdAt: Timestamp | null
  lastMessageAt: Timestamp | null
  preview: string
  daySummary?: string
}

// ---- Helpers --------------------------------------------------------------
function relativeTime(ts: Timestamp | null): string {
  if (!ts) return ''
  const then = ts.toDate().getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return ts.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Format the chat's start date for the row title (year only when not this year). */
function formatStartDate(ts: Timestamp | null): string {
  if (!ts) return ''
  const d = ts.toDate()
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(
    undefined,
    sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' },
  )
}

// ---- Chat row (reuses the lobby card visual language) ---------------------
const ROW_DELAYS = [80, 150, 220, 290, 360] as const

type ChatRowProps = {
  chat: SayChat
  index: number
  bg: string
  border: string
  inkPrimary: string
  inkMuted: string
  inkSubtle: string
  onPress: () => void
  onDelete: () => void
}

function ChatRow({ chat, index, bg, border, inkPrimary, inkMuted, inkSubtle, onPress, onDelete }: ChatRowProps) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(10)
  const scale = useSharedValue(1)

  useEffect(() => {
    const delay = ROW_DELAYS[Math.min(index, ROW_DELAYS.length - 1)] ?? 80
    const cfg = { duration: 480, easing: Easing.out(Easing.cubic) }
    opacity.value = withDelay(delay, withTiming(1, cfg))
    translateY.value = withDelay(delay, withTiming(0, cfg))
  }, [opacity, translateY, index])

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }))

  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.98, { duration: 160 })
  }, [scale])

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 160 })
  }, [scale])

  const snippet = chat.preview.trim().length > 0 ? chat.preview : 'new chat'
  const startDate = formatStartDate(chat.createdAt ?? chat.lastMessageAt)
  const time = relativeTime(chat.lastMessageAt)

  const renderRightActions = () => (
    <Pressable
      onPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel="Delete chat"
      style={({ pressed }) => [styles.deleteAction, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </Pressable>
  )

  return (
    <Animated.View style={[styles.cardWrapper, animStyle]}>
      <ReanimatedSwipeable
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={renderRightActions}
      >
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel={`Chat started ${startDate}: ${snippet}${time ? `, last active ${time}` : ''}`}
        >
          <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              <Text style={[styles.titleDate, { color: inkPrimary }]}>{startDate}</Text>
              <Text style={[styles.titleSnippet, { color: inkSubtle }]}>{startDate ? '   ·   ' : ''}</Text>
              <Text style={[styles.titleSnippet, { color: inkMuted }]}>{snippet}</Text>
            </Text>
            {chat.daySummary ? (
              <Text style={[styles.daySummary, { color: inkPrimary }]} numberOfLines={1}>
                {chat.daySummary}
              </Text>
            ) : null}
            {time ? <Text style={[styles.cardTime, { color: inkSubtle }]}>{time}</Text> : null}
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  )
}

// ---- Main screen ----------------------------------------------------------
export default function SayChatListScreen() {
  const { isDark, colors } = useTheme()
  const params = useLocalSearchParams<{ personaId?: string | string[] }>()
  const rawPersona = Array.isArray(params.personaId) ? params.personaId[0] : params.personaId
  const personaId: VoiceId = isVoiceId(rawPersona) ? rawPersona : 'kind'
  const meta = VOICE_META[personaId]
  const { bg: cardBg, border: cardBorder } = voiceSurface(personaId, isDark)

  const [authReady, setAuthReady] = useState(false)
  const [chats, setChats] = useState<SayChat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [starting, setStarting] = useState(false)

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

  // Subscribe to this persona's chats, ordered by most recent activity
  useEffect(() => {
    if (!authReady) return
    const user = getAuth().currentUser
    if (!user) return

    // Chat docs live DIRECTLY in the persona collection (no literal 'chats'
    // segment) to keep valid Firestore path arity. orderBy('lastMessageAt')
    // also naturally excludes stray legacy/reach-out docs lacking the field.
    const q = query(
      collection(db, 'say', user.uid, personaId),
      orderBy('lastMessageAt', 'desc'),
    )

    return onSnapshot(
      q,
      (snap) => {
        const next: SayChat[] = []
        snap.forEach((d) => {
          const data = d.data() as {
            createdAt?: unknown
            lastMessageAt?: unknown
            preview?: unknown
            daySummary?: unknown
          }
          next.push({
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
            lastMessageAt: data.lastMessageAt instanceof Timestamp ? data.lastMessageAt : null,
            preview: typeof data.preview === 'string' ? data.preview : '',
            daySummary: typeof data.daySummary === 'string' ? data.daySummary : undefined,
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
    (chatId: string) => {
      router.push({ pathname: '/say/[personaId]/[chatId]', params: { personaId, chatId } })
    },
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
            // The live onSnapshot listener removes the row once the docs are gone.
            deleteSayChat(personaId, chatId).catch(() => {
              Alert.alert('Could not delete', 'Please try again.')
            })
          },
        },
      ])
    },
    [personaId],
  )

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <Text style={[styles.backArrow, { color: colors.inkPrimary }]}>{'←'}</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerGlyph, { color: meta.glyphColor }]}>{meta.glyph}</Text>
          <Text style={[styles.headerName, { color: colors.inkPrimary }]}>{meta.name}</Text>
        </View>
        {/* Right spacer to keep the title centered */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Body states: loading → error → empty → list */}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.amber} size="small" />
            <Text style={[styles.stateText, { color: colors.inkSubtle }]}>{'gathering your chats…'}</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={[styles.stateText, { color: colors.inkMuted }]}>
              {"couldn't load your chats"}
            </Text>
            <Pressable
              onPress={() => {
                setError(false)
                setLoading(true)
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry"
              style={({ pressed }) => ({ marginTop: 10, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[styles.retryText, { color: colors.amber }]}>{'try again'}</Text>
            </Pressable>
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={[styles.emptyGlyph, { color: meta.glyphColor }]}>{meta.glyph}</Text>
            <Text style={[styles.emptyTitle, { color: colors.inkPrimary }]}>{'no chats yet'}</Text>
            <Text style={[styles.stateText, { color: colors.inkMuted }]}>
              {`start a new chat to begin with ${meta.name}.`}
            </Text>
          </View>
        ) : (
          <View style={styles.stack}>
            {chats.map((chat, i) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                index={i}
                bg={cardBg}
                border={cardBorder}
                inkPrimary={colors.inkPrimary}
                inkMuted={colors.inkMuted}
                inkSubtle={colors.inkSubtle}
                onPress={() => handleOpenChat(chat.id)}
                onDelete={() => handleDeleteChat(chat.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating new-chat button */}
      <Animated.View style={[styles.fabWrap, headerStyle]}>
        <Pressable
          onPress={handleStartNewChat}
          disabled={starting}
          accessibilityRole="button"
          accessibilityLabel="Start a new chat"
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.amber, opacity: starting ? 0.7 : pressed ? 0.9 : 1 },
          ]}
        >
          {starting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="add" size={30} color="#FFFFFF" />
          )}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  )
}

// ---- Styles ---------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
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
    width: 40,
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
  headerSpacer: {
    width: 40,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 28,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C4956A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stack: {
    gap: 14,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    minHeight: 84,
    width: '100%',
  },
  title: {
    fontSize: 15,
    lineHeight: 22,
  },
  titleDate: {
    fontFamily: 'DMSans_700Bold',
  },
  titleSnippet: {
    fontFamily: 'Lora_400Regular_Italic',
  },
  cardTime: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginTop: 8,
  },
  daySummary: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginTop: 8,
  },
  deleteAction: {
    backgroundColor: '#C96A58',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    width: 84,
    alignSelf: 'stretch',
    borderRadius: 20,
    marginLeft: 8,
  },
  deleteActionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: '#FFFFFF',
  },
  // ---- States ----
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 10,
  },
  stateText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  emptyGlyph: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 20,
  },
})
