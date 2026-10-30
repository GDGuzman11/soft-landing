import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { EMOTIONS } from '@/constants/emotions'
import { canCheckIn, performCheckIn, bookmarkMessage } from '@/services/checkIn'
import { fetchFreshVerse } from '@/messages/selector'
import { getReflectionLine } from '@/messages/reflections'
import { generateLetter } from '@/services/letterService'
import { getSettings, updateCheckIn } from '@/storage/storage'
import { getCurrentUser } from '@/services/auth'
import LetterCard from '@/components/LetterCard'
import type { LetterVoiceId } from '@/components/LetterVoiceChips'
import { startSayLetterChat } from '@/components/say/startSayChat'
import { useTheme } from '@/theme'
import { logAnalyticsEvent } from '@/services/firebase'
import type { AppSettings, EmotionId, Message } from '@/types'

/** Pills shown in this order (lightest → heaviest), per the design. */
const DISPLAY_ORDER: EmotionId[] = ['good', 'neutral', 'tired', 'sad', 'stressed']
const EMO = Object.fromEntries(EMOTIONS.map((e) => [e.id, e])) as Record<
  EmotionId,
  (typeof EMOTIONS)[number]
>

type LetterError = 'network' | 'blocked' | 'rateLimited' | null

// Tour (logged-out "How it works") uses fixed demo content — no auth, no API.
const DEMO_VERSES: Message[] = [
  {
    id: 'tour-demo-1',
    emotionId: 'good',
    body: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
    modernText: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.',
    reference: 'Matthew 11:28',
    message:
      "When everything asks something of you, this verse offers a different invitation: rest. You don't need to solve everything before you can pause.",
    tags: [],
    tier: 'free',
    weight: 10,
    usageCount: 0,
    lastUsed: null,
  },
  {
    id: 'tour-demo-2',
    emotionId: 'good',
    body: 'The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures.',
    modernText: "The LORD is my shepherd; I shall lack nothing. He makes me lie down in green pastures.",
    reference: 'Psalm 23:1-2',
    message:
      'Being led somewhere quiet is not falling behind. Rest can be the thing you were being guided toward all along.',
    tags: [],
    tier: 'free',
    weight: 10,
    usageCount: 0,
    lastUsed: null,
  },
]

const DEMO_LETTER = `You paused.

That actually means something. You've been in motion, and in the middle of that, something in you looked up and let this land.

The offer of rest isn't only for people barely holding it together. It's for anyone carrying something, which right now includes you.

It's okay to receive something here anyway.`

export default function CheckInScreen() {
  const { colors } = useTheme()
  const { tourMode } = useLocalSearchParams<{ tourMode?: string }>()
  const isTour = tourMode === 'true'
  const scrollRef = useRef<ScrollView>(null)

  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [emotion, setEmotion] = useState<EmotionId | null>(null)
  const [verse, setVerse] = useState<Message | null>(null)
  const [checkInId, setCheckInId] = useState<string | null>(null)
  const [verseBusy, setVerseBusy] = useState(false)

  const [reflectOpen, setReflectOpen] = useState(false)
  const [line, setLine] = useState('')
  const [lineIndex, setLineIndex] = useState<number | undefined>(undefined)
  const [userInput, setUserInput] = useState('')

  const [letter, setLetter] = useState<string | null>(null)
  const [letterLoading, setLetterLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [letterError, setLetterError] = useState<LetterError>(null)
  const [showCrisis, setShowCrisis] = useState(false)
  const [letterSaved, setLetterSaved] = useState(false)

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null))
  }, [])

  const tier = settings?.subscription?.tier ?? 'free'
  const userName = settings?.name?.trim() || 'friend'

  function scrollToEnd() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60)
  }

  // Randomized KJV/WEB display per verse (reseeds when the verse changes).
  const display = useMemo(() => {
    if (!verse) return null
    const useModern = verse.modernText && Math.random() < 0.5
    return {
      text: useModern ? (verse.modernText as string) : verse.body,
      label: useModern ? 'WEB' : 'KJV',
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verse?.id])

  // Clears everything downstream of the emotion pick so changing your mind
  // starts the verse/reflection/letter fresh.
  function resetDownstream() {
    setReflectOpen(false)
    setLine('')
    setLineIndex(undefined)
    setUserInput('')
    setLetter(null)
    setLetterError(null)
    setShowCrisis(false)
  }

  async function handleSelectEmotion(id: EmotionId) {
    if (verseBusy || id === emotion) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})

    const isChange = emotion !== null && checkInId !== null
    resetDownstream()

    if (isTour) {
      setEmotion(id)
      setVerse({ ...DEMO_VERSES[0], emotionId: id })
      scrollToEnd()
      return
    }

    setEmotion(id)
    setVerseBusy(true)
    try {
      if (isChange && checkInId) {
        // Reuse the existing check-in slot — fetch a verse for the new emotion
        // and update the stored event, so we don't pile up duplicate check-ins.
        const next = await fetchFreshVerse(id, tier, verse?.id ?? '', settings?.primaryIntent ?? null)
        await updateCheckIn(checkInId, { emotionId: id, messageId: next.id })
        setVerse(next)
      } else {
        if (!(await canCheckIn())) {
          router.push('/paywall')
          setEmotion(null)
          return
        }
        const { event, message } = await performCheckIn(id)
        setCheckInId(event.id)
        setVerse(message)
      }
    } catch {
      // On a first pick, roll back so they can retry; on a change, keep the
      // new emotion highlighted and let them tap again.
      if (!isChange) setEmotion(null)
    } finally {
      setVerseBusy(false)
      scrollToEnd()
    }
  }

  async function handleNewVerse() {
    if (!emotion || !verse || verseBusy) return
    Haptics.selectionAsync().catch(() => {})
    if (isTour) {
      const next = DEMO_VERSES.find((v) => v.id !== verse.id) ?? DEMO_VERSES[0]
      setVerse({ ...next, emotionId: emotion })
      return
    }
    setVerseBusy(true)
    try {
      const next = await fetchFreshVerse(emotion, tier, verse.id, settings?.primaryIntent ?? null)
      setVerse(next)
    } catch {
      // keep the current verse on failure
    } finally {
      setVerseBusy(false)
    }
  }

  function handleOpenReflection() {
    if (!emotion) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    const picked = getReflectionLine(emotion)
    setLine(picked.line)
    setLineIndex(picked.index)
    setReflectOpen(true)
    scrollToEnd()
  }

  function handleNewLine() {
    if (!emotion) return
    Haptics.selectionAsync().catch(() => {})
    const picked = getReflectionLine(emotion, lineIndex)
    setLine(picked.line)
    setLineIndex(picked.index)
  }

  async function handleWriteLetter() {
    if (!emotion || !verse || generating) return
    if (isTour) {
      setLetterLoading(true)
      setGenerating(true)
      setLetterError(null)
      scrollToEnd()
      setTimeout(() => {
        setLetterLoading(false)
        setLetter(DEMO_LETTER)
        setGenerating(false)
        scrollToEnd()
      }, 1300)
      return
    }
    if (!getCurrentUser()) {
      router.push('/sign-in')
      return
    }
    setLetterLoading(true)
    setGenerating(true)
    setLetterError(null)
    setShowCrisis(false)
    scrollToEnd()
    try {
      const result = await generateLetter({
        emotionId: emotion,
        verseBody: verse.body,
        reference: verse.reference ?? '',
        modernText: verse.modernText || undefined,
        verseMessage: verse.message?.trim() || undefined,
        reflectionLine: line.trim() || undefined,
        userInput: userInput.trim() || undefined,
        userName,
        hourOfDay: new Date().getHours(),
        faithBackground: settings?.faithBackground ?? null,
        primaryIntent: settings?.primaryIntent ?? null,
        lifeStage: settings?.lifeStage ?? null,
      })
      setLetterLoading(false)

      if (result.showCrisisPrompt) {
        setShowCrisis(true)
        scrollToEnd()
        return
      }
      if (result.blocked) {
        setLetterError('blocked')
        return
      }
      if (result.rateLimited) {
        setLetterError('rateLimited')
        return
      }
      if (!result.letter) {
        setLetterError('network')
        return
      }

      setLetter(result.letter)
      logAnalyticsEvent('letter_generated', { emotion })
      if (checkInId) {
        await bookmarkMessage(checkInId, verse.id, {
          letter: result.letter,
          note: userInput.trim() || undefined,
          emotionId: emotion,
        })
        setLetterSaved(true)
      }
      scrollToEnd()
    } finally {
      setLetterLoading(false)
      setGenerating(false)
    }
  }

  async function handleShare() {
    if (!letter || !verse) return
    try {
      await Share.share({
        message: `"${verse.body}" — ${verse.reference ?? ''}\n\n${letter}\n\nWith you in this.\n\nvia Soft Landing`,
      })
    } catch {
      // dismissed
    }
  }

  async function handlePickVoice(personaId: LetterVoiceId) {
    if (!letter) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    try {
      const chatId = await startSayLetterChat(personaId, {
        letter,
        reflection: userInput.trim() || undefined,
        emotionId: emotion ?? undefined,
        verseReference: verse?.reference ?? undefined,
      })
      router.push({ pathname: '/say/[personaId]/[chatId]', params: { personaId, chatId } })
    } catch {
      // leave the chips tappable so the user can retry
    }
  }

  const hasLetter = letter !== null

  function handleKeep() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    router.replace('/(tabs)')
  }

  // Full-screen letter takeover — once we're generating or have a letter, the
  // letter becomes the whole page (pills / verse / reflection slide away).
  if (letterLoading || hasLetter || letterError) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 56, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)} style={{ flex: 1 }}>
            <LetterCard
              letter={letter}
              name={userName}
              isLoading={letterLoading}
              error={letterError}
              onRetry={handleWriteLetter}
              onPickVoice={isTour || !letter ? undefined : handlePickVoice}
            />

            {hasLetter && isTour && (
              <Pressable
                onPress={() => router.replace('/welcome')}
                accessibilityRole="button"
                accessibilityLabel="Create an account"
                style={{ backgroundColor: colors.amber, borderRadius: 28, paddingVertical: 15, alignItems: 'center', marginTop: 28 }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#FFFFFF' }}>
                  Create an account →
                </Text>
              </Pressable>
            )}

            {hasLetter && !isTour && (
              <>
                <Pressable
                  onPress={handleKeep}
                  accessibilityRole="button"
                  accessibilityLabel="Keep this letter"
                  className="active:opacity-80"
                  style={{
                    backgroundColor: colors.amber,
                    borderRadius: 28,
                    paddingVertical: 15,
                    alignItems: 'center',
                    marginTop: 28,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#FFFFFF' }}>
                    ❖  Keep this letter
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share letter"
                  className="active:opacity-60"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.amber,
                    borderRadius: 28,
                    paddingVertical: 14,
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.amber }}>
                    Share ↑
                  </Text>
                </Pressable>

                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: colors.inkSubtle,
                    textAlign: 'center',
                    marginTop: 14,
                  }}
                >
                  {letterSaved ? 'Saved to your History' : 'Saved'}
                </Text>

                <Pressable
                  onPress={() => router.replace('/(tabs)')}
                  accessibilityRole="button"
                  accessibilityLabel="Done, go home"
                  className="active:opacity-50"
                  style={{ alignItems: 'center', marginTop: 20 }}
                >
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>
                    Done — go home
                  </Text>
                </Pressable>
              </>
            )}

            {letterError && letterError !== 'rateLimited' && (
              <Pressable
                onPress={handleWriteLetter}
                accessibilityRole="button"
                accessibilityLabel="Retry"
                className="active:opacity-50"
                style={{ alignItems: 'center', marginTop: 16 }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.amber }}>Try again →</Text>
              </Pressable>
            )}

            {(letterError === 'rateLimited' || letterError === 'blocked') && (
              <Pressable
                onPress={() => router.replace('/(tabs)')}
                accessibilityRole="button"
                accessibilityLabel="Go home"
                className="active:opacity-50"
                style={{ alignItems: 'center', marginTop: 16 }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>
                  Go home
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 64 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="active:opacity-50"
          style={{ marginBottom: 20 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>
            ← Back
          </Text>
        </Pressable>

        {/* Stage A — emotion pills */}
        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 28,
            color: colors.inkPrimary,
            marginBottom: 20,
          }}
        >
          How are you right now?
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          {DISPLAY_ORDER.map((id) => {
            const e = EMO[id]
            const selected = emotion === id
            return (
              <Pressable
                key={id}
                onPress={() => handleSelectEmotion(id)}
                disabled={verseBusy}
                accessibilityRole="button"
                accessibilityLabel={e.label}
                accessibilityState={{ selected }}
                className="active:opacity-70"
                style={{
                  paddingVertical: 11,
                  paddingHorizontal: 20,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: selected ? e.color : colors.cardBorder,
                  backgroundColor: selected ? e.color : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: selected ? 'DMSans_500Medium' : 'DMSans_400Regular',
                    fontSize: 15,
                    color: selected ? '#3D2F2A' : colors.inkMuted,
                  }}
                >
                  {e.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {emotion !== null && (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: colors.inkSubtle,
              marginTop: 10,
            }}
          >
            Changed your mind? Tap another.
          </Text>
        )}

        {/* Stage B — verse + tie-in message */}
        {verseBusy && !verse && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <ActivityIndicator color={colors.amber} />
          </View>
        )}

        {verse && (
          <Animated.View key={verse.id} entering={FadeInDown.duration(450)} style={{ marginTop: 32 }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 11,
                  letterSpacing: 1.5,
                  color: colors.inkMuted,
                  marginBottom: 14,
                }}
              >
                A VERSE FOR THIS MOMENT
              </Text>

              <Text
                style={{
                  fontFamily: 'Lora_400Regular',
                  fontSize: 20,
                  lineHeight: 32,
                  color: colors.inkPrimary,
                }}
              >
                {'“'}
                {display?.text}
                {'”'}
              </Text>

              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 13,
                  color: colors.amber,
                  marginTop: 14,
                }}
              >
                {verse.reference} · {display?.label}
              </Text>

              {verse.message?.trim() ? (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.hairline,
                    marginTop: 18,
                    paddingTop: 16,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 14,
                      lineHeight: 22,
                      color: colors.inkMuted,
                    }}
                  >
                    {verse.message}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* New verse */}
            <Pressable
              onPress={handleNewVerse}
              disabled={verseBusy}
              className="active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel="Show another verse"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}
            >
              {verseBusy ? (
                <ActivityIndicator color={colors.amber} size="small" />
              ) : (
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.amber }}>
                  ↻ Show me another verse
                </Text>
              )}
            </Pressable>

            {/* Proceed to reflection */}
            {!reflectOpen && (
              <Pressable
                onPress={handleOpenReflection}
                className="active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Let's put some of this to words"
                style={{
                  backgroundColor: colors.amber,
                  borderRadius: 28,
                  paddingVertical: 15,
                  alignItems: 'center',
                  marginTop: 24,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#FFFFFF' }}>
                  Let's put some of this to words
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Stage C — reflection */}
        {reflectOpen && !hasLetter && (
          <Animated.View entering={FadeInDown.duration(450)} style={{ marginTop: 36 }}>
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 20,
                color: colors.inkPrimary,
                marginBottom: 16,
              }}
            >
              Let's put some of that weight into words.
            </Text>

            <Text
              style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMuted, marginBottom: 8 }}
            >
              You can start with this one thought:
            </Text>
            <View
              style={{
                backgroundColor: colors.inputRow,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Lora_400Regular_Italic',
                  fontSize: 15,
                  lineHeight: 23,
                  color: colors.inkPrimary,
                }}
              >
                {line ? `“${line}”` : ' '}
              </Text>
            </View>
            <Pressable
              onPress={handleNewLine}
              className="active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel="Give me another thought"
              style={{ alignSelf: 'flex-start', marginBottom: 20 }}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.amber }}>
                ↻ Another thought
              </Text>
            </Pressable>

            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                minHeight: 140,
                marginBottom: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <TextInput
                multiline
                value={userInput}
                onChangeText={(t) => setUserInput(t.slice(0, 2000))}
                placeholder="Dear God, today has been…"
                placeholderTextColor={colors.inkSubtle}
                style={{
                  fontFamily: 'Lora_400Regular',
                  fontSize: 15,
                  lineHeight: 24,
                  color: colors.inkPrimary,
                  flex: 1,
                  textAlignVertical: 'top',
                }}
                accessibilityLabel="Your reflection"
              />
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: colors.inkSubtle,
                  textAlign: 'right',
                  marginTop: 8,
                }}
              >
                {2000 - userInput.length} left
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 11,
                color: colors.inkSubtle,
                marginBottom: 20,
              }}
            >
              This is your space. No perfect words required. Your words are sent privately to write
              your letter and are not stored on our servers.
            </Text>

            <Pressable
              onPress={handleWriteLetter}
              disabled={generating}
              className="active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Write my reflection letter"
              style={{
                backgroundColor: colors.amber,
                borderRadius: 28,
                paddingVertical: 15,
                alignItems: 'center',
                opacity: generating ? 0.6 : 1,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#FFFFFF' }}>
                {generating ? 'Writing your letter…' : 'Write my reflection letter →'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Crisis */}
        {showCrisis && (
          <View
            style={{
              backgroundColor: colors.inputRow,
              borderRadius: 12,
              padding: 20,
              marginTop: 24,
              borderLeftWidth: 3,
              borderLeftColor: colors.amber,
            }}
          >
            <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 16, color: colors.inkPrimary, lineHeight: 24, marginBottom: 12 }}>
              It sounds like you might be carrying something heavy right now.
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkPrimary, lineHeight: 22 }}>
              988 Suicide & Crisis Lifeline — call or text 988{'\n'}
              Crisis Text Line — text HOME to 741741
            </Text>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
