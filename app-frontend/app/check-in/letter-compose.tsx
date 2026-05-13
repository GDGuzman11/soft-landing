import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSavedMessages, getSettings, updateSavedMessage, setFirstLetterUsed } from '@/storage/storage'
import { generateLetter } from '@/services/letterService'
import { getCurrentUser } from '@/services/auth'
import LetterCard from '@/components/LetterCard'
import { useTheme } from '@/theme'
import type { SavedMessage, Message, AppSettings, EmotionId } from '@/types'

const DEMO_INPUT_TEXT =
  "I've been carrying a lot lately. This verse reminded me I don't have to hold it all together."

const DEMO_LETTER =
  `There is something beautiful about the fact that you reached for rest today.

The verse you saved — Matthew 11:28 — is an open door. Not a command to perform or a standard to meet, but an invitation. Come as you are. Bring the weight. All of it.

In the middle of a full life, rest can feel like something you haven't quite earned yet. But the invitation doesn't have a condition attached. It isn't waiting for you to have it together first. It is always open.

Let yourself receive it today. Fully. Without apology.

You showed up. That is enough.`

export default function LetterComposeScreen() {
  const { colors } = useTheme()
  const { savedMessageId, tourMode } = useLocalSearchParams<{ savedMessageId: string; tourMode?: string }>()
  const isTour = tourMode === 'true'

  const mutedLinkTextStyle = {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.inkMuted,
  } as const

  const [savedMessage, setSavedMessage] = useState<SavedMessage | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [verseData, setVerseData] = useState<{ body: string; reference: string; modernText?: string } | null>(null)
  const [userInput, setUserInput] = useState('')
  const [letter, setLetter] = useState<string | null>(null)
  const [letterLoading, setLetterLoading] = useState(false)
  const [letterError, setLetterError] = useState<'network' | 'blocked' | 'rateLimited' | null>(null)
  const [showCrisisPrompt, setShowCrisisPrompt] = useState(false)
  const [letterSaved, setLetterSaved] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (isTour) {
      // Inject demo data — no AsyncStorage access needed
      setSavedMessage({
        id: 'tour-demo',
        messageId: 'tour-demo',
        emotionId: 'good' as EmotionId,
        savedAt: new Date().toISOString(),
        note: undefined,
        letter: undefined,
      } as SavedMessage)
      setSettings({ name: '', subscription: { tier: 'free', expiresAt: null } } as AppSettings)
      setVerseData({
        body: 'Come to me, all who are weary and burdened, and I will give you rest.',
        reference: 'Matthew 11:28 (NIV)',
        modernText: undefined,
      })
      return
    }

    if (!savedMessageId) return
    Promise.all([getSavedMessages(), getSettings()]).then(async ([all, s]) => {
      const sm = all.find((m) => m.id === savedMessageId) ?? null
      setSavedMessage(sm)
      setSettings(s)

      if (sm) {
        const emotionId = sm.emotionId ?? 'neutral'
        const cached = await AsyncStorage.getItem(`@soft_landing/verse_pool/${emotionId}`)
        if (cached) {
          const pool: { fetchedAt: string; verses: Message[] } = JSON.parse(cached)
          const msg = pool.verses.find((v) => v.id === sm.messageId)
          setVerseData({
            body: msg?.body ?? '…',
            reference: msg?.reference ?? '',
            modernText: msg?.modernText,
          })
        } else {
          setVerseData({ body: '…', reference: '', modernText: undefined })
        }
      }
    })
  }, [savedMessageId])

  // Auto-type demo input when in tour mode
  useEffect(() => {
    if (!isTour) return
    let i = 0
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        i++
        if (i <= DEMO_INPUT_TEXT.length) {
          setUserInput(DEMO_INPUT_TEXT.slice(0, i))
        } else {
          clearInterval(interval)
        }
      }, 22)
      return () => clearInterval(interval)
    }, 500)
    return () => clearTimeout(delay)
  }, [isTour])

  if (!savedMessage || !settings || !verseData) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.amber} />
      </View>
    )
  }

  const body = verseData.body
  const reference = verseData.reference
  const modernText = verseData.modernText
  const emotionId = (savedMessage.emotionId ?? 'neutral') as EmotionId
  const userName = settings.name?.trim() || 'friend'
  const isPremium = settings.subscription?.tier === 'premium'

  async function handleSend() {
    if (isTour) {
      // Simulate generation with typewriter reveal — no real API call
      setLetterLoading(true)
      setGenerating(true)
      setLetterError(null)
      await new Promise<void>((resolve) => setTimeout(resolve, 1400))
      setLetterLoading(false)

      let i = 0
      const interval = setInterval(() => {
        i += 5
        if (i <= DEMO_LETTER.length) {
          setLetter(DEMO_LETTER.slice(0, i))
        } else {
          setLetter(DEMO_LETTER)
          setGenerating(false)
          clearInterval(interval)
        }
      }, 18)
      return
    }

    if (!getCurrentUser()) {
      router.push('/sign-in')
      return
    }
    setLetterLoading(true)
    setGenerating(true)
    setLetterError(null)
    setShowCrisisPrompt(false)

    try {
      const result = await generateLetter({
        emotionId,
        verseBody: body,
        reference,
        modernText: modernText || undefined,
        userInput: userInput.trim() || undefined,
        userName,
        hourOfDay: new Date().getHours(),
        faithBackground: settings?.faithBackground ?? null,
        primaryIntent: settings?.primaryIntent ?? null,
        lifeStage: settings?.lifeStage ?? null,
      })

      setLetterLoading(false)

      if (result.showCrisisPrompt) {
        setShowCrisisPrompt(true)
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

      if (!isPremium) {
        await setFirstLetterUsed(true)
        setSettings((prev) => (prev ? { ...prev, firstLetterUsed: true } : prev))
      }

      setLetter(result.letter)
      await updateSavedMessage(savedMessageId, {
        letter: result.letter,
        note: userInput.trim() || undefined,
      })
      setLetterSaved(true)
    } finally {
      setLetterLoading(false)
      setGenerating(false)
    }
  }

  async function handleSaveLetter() {
    if (!letter || !savedMessageId || letterSaved || isTour) return
    await updateSavedMessage(savedMessageId, {
      letter,
      note: userInput.trim() || undefined,
    })
    setLetterSaved(true)
  }

  async function handleShare() {
    if (!letter) return
    try {
      await Share.share({
        message: `"${body}" — ${reference}\n\n${letter}\n\nWith you in this.\n\nvia Soft Landing`,
      })
    } catch {
      // user dismissed
    }
  }

  const hasLetter = letter !== null
  const baseSendLabel = userInput.trim() ? 'Send' : 'Write me a letter'
  const sendLabel = generating ? 'Writing your letter...' : baseSendLabel

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="active:opacity-50"
          style={{ marginBottom: 24 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={mutedLinkTextStyle}>← Back</Text>
        </Pressable>

        {/* Verse */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {reference ? (
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 13,
                color: colors.amber,
                letterSpacing: 0.3,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {reference}
            </Text>
          ) : null}
          <Text
            style={{
              fontFamily: 'Lora_400Regular',
              fontSize: 17,
              color: colors.inkPrimary,
              lineHeight: 26,
              textAlign: 'center',
            }}
          >
            {body}
          </Text>
        </View>

        {/* Input — only show before letter is generated */}
        {!hasLetter && (
          <>
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 13,
                color: colors.inkMuted,
                marginBottom: 8,
              }}
            >
              What's on your mind?
            </Text>

            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                minHeight: 120,
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
                onChangeText={(t) => !isTour && setUserInput(t.slice(0, 500))}
                placeholder="No filter. Just say what's actually going on…"
                placeholderTextColor={colors.inkSubtle}
                editable={!isTour}
                style={{
                  fontFamily: 'Lora_400Regular',
                  fontSize: 15,
                  color: colors.inkPrimary,
                  lineHeight: 24,
                  flex: 1,
                  textAlignVertical: 'top',
                }}
                accessibilityLabel="What's on your mind"
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
                {userInput.length}/500
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
              Your words are sent privately to generate your letter and are not stored on our servers.
            </Text>

            <Pressable
              onPress={handleSend}
              disabled={generating || letterLoading}
              accessibilityRole="button"
              accessibilityLabel={sendLabel}
              className="active:opacity-80"
              style={{
                backgroundColor: colors.amber,
                borderRadius: 28,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: generating ? 0.6 : letterLoading ? 0.7 : 1,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#FFFFFF' }}>
                {sendLabel}
              </Text>
            </Pressable>
          </>
        )}

        {/* Crisis prompt */}
        {showCrisisPrompt && (
          <View
            style={{
              backgroundColor: colors.inputRow,
              borderRadius: 12,
              padding: 20,
              marginTop: 20,
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

        {/* Letter + actions */}
        {(letterLoading || hasLetter || letterError) && (
          <View style={{ marginTop: hasLetter ? 0 : 20 }}>
            <LetterCard
              letter={letter}
              name={userName}
              isLoading={letterLoading}
              error={letterError}
              onRetry={handleSend}
              verseBody={body}
              verseReference={reference}
            />

            {hasLetter && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20 }}>
                {!isTour && (
                  <Pressable
                    onPress={handleSaveLetter}
                    disabled={letterSaved}
                    accessibilityRole="button"
                    accessibilityLabel={letterSaved ? 'Letter saved' : 'Save letter'}
                    className="active:opacity-80"
                    style={{
                      backgroundColor: letterSaved ? '#9CB59A' : colors.amber,
                      borderRadius: 24,
                      paddingHorizontal: 22,
                      paddingVertical: 11,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#FFFFFF' }}>
                      {letterSaved ? '★ Saved' : '☆ Save letter'}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share letter"
                  className="active:opacity-60"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.amber,
                    borderRadius: 24,
                    paddingHorizontal: 22,
                    paddingVertical: 11,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.amber }}>Share ↑</Text>
                </Pressable>
              </View>
            )}

            {hasLetter && (
              <Pressable
                onPress={() => isTour ? router.replace('/welcome') : router.replace('/(tabs)')}
                accessibilityRole="button"
                accessibilityLabel="Done, go home"
                className="active:opacity-50"
                style={{ alignItems: 'center', marginTop: 20 }}
              >
                <Text style={mutedLinkTextStyle}>
                  {isTour ? 'Create an account →' : 'Done — go home'}
                </Text>
              </Pressable>
            )}

            {letterError && letterError !== 'rateLimited' && (
              <Pressable
                onPress={handleSend}
                accessibilityRole="button"
                accessibilityLabel="Retry"
                className="active:opacity-50"
                style={{ alignItems: 'center', marginTop: 12 }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.amber }}>Try again →</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
