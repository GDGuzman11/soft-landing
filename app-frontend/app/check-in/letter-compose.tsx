import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { getSavedMessages, getSettings, updateSavedMessage, setFirstLetterUsed } from '@/storage/storage'
import { generateLetter } from '@/services/letterService'
import { getCurrentUser } from '@/services/auth'
import LetterCard from '@/components/LetterCard'
import type { SavedMessage, Message, AppSettings, EmotionId } from '@/types'
import catalog from '@/messages/catalog.json'

const messages = catalog as Message[]

function getVerse(messageId: string): { body: string; reference: string } {
  const msg = messages.find((m) => m.id === messageId)
  return { body: msg?.body ?? '…', reference: msg?.reference ?? '' }
}

export default function LetterComposeScreen() {
  const { savedMessageId } = useLocalSearchParams<{ savedMessageId: string }>()

  const [savedMessage, setSavedMessage] = useState<SavedMessage | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [userInput, setUserInput] = useState('')
  const [letter, setLetter] = useState<string | null>(null)
  const [letterLoading, setLetterLoading] = useState(false)
  const [letterError, setLetterError] = useState<'network' | 'blocked' | 'rateLimited' | null>(null)
  const [showCrisisPrompt, setShowCrisisPrompt] = useState(false)
  const [letterSaved, setLetterSaved] = useState(false)

  useEffect(() => {
    if (!savedMessageId) return
    Promise.all([getSavedMessages(), getSettings()]).then(([all, s]) => {
      setSavedMessage(all.find((m) => m.id === savedMessageId) ?? null)
      setSettings(s)
    })
  }, [savedMessageId])

  if (!savedMessage || !settings) return null

  const { body, reference } = getVerse(savedMessage.messageId)
  const emotionId = (savedMessage.emotionId ?? 'neutral') as EmotionId
  const userName = settings.name?.trim() || 'friend'
  const isPremium = settings.subscription.tier === 'premium'
  const canUseLetter = true // TODO: re-enable after testing — was: isPremium || !settings.firstLetterUsed

  async function handleSend() {
    if (!getCurrentUser()) {
      router.push('/sign-in')
      return
    }
    if (!canUseLetter) {
      router.push('/paywall')
      return
    }
    setLetterLoading(true)
    setLetterError(null)
    setShowCrisisPrompt(false)

    const result = await generateLetter({
      emotionId,
      verseBody: body,
      reference,
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
  }

  async function handleSaveLetter() {
    if (!letter || !savedMessageId || letterSaved) return
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
  const sendLabel = userInput.trim() ? 'Send' : 'Write me a letter'

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FAF8F5' }}
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
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#A09080' }}>
            ← Back
          </Text>
        </Pressable>

        {/* Verse */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
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
                color: '#C4956A',
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
              color: '#3D2F2A',
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
                color: '#A09080',
                marginBottom: 8,
              }}
            >
              What's on your heart?
            </Text>

            <View
              style={{
                backgroundColor: '#FFFFFF',
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
                onChangeText={(t) => setUserInput(t.slice(0, 500))}
                placeholder="Tell God what's on your mind…"
                placeholderTextColor="#C4B59A"
                style={{
                  fontFamily: 'Lora_400Regular',
                  fontSize: 15,
                  color: '#3D2F2A',
                  lineHeight: 24,
                  flex: 1,
                  textAlignVertical: 'top',
                }}
                accessibilityLabel="What's on your heart"
              />
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: '#C4B59A',
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
                color: '#C4B59A',
                marginBottom: 20,
              }}
            >
              Your words are sent privately to generate your letter and are not stored on our servers.
            </Text>

            <Pressable
              onPress={handleSend}
              disabled={letterLoading}
              accessibilityRole="button"
              accessibilityLabel={sendLabel}
              className="active:opacity-80"
              style={{
                backgroundColor: '#C4956A',
                borderRadius: 28,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: letterLoading ? 0.7 : 1,
              }}
            >
              <Text
                style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#FFFFFF' }}
              >
                {sendLabel}
              </Text>
            </Pressable>
          </>
        )}

        {/* Crisis prompt */}
        {showCrisisPrompt && (
          <View
            style={{
              backgroundColor: '#FFF8F0',
              borderRadius: 12,
              padding: 20,
              marginTop: 20,
              borderLeftWidth: 3,
              borderLeftColor: '#C4956A',
            }}
          >
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 16,
                color: '#3D2F2A',
                lineHeight: 24,
                marginBottom: 12,
              }}
            >
              It sounds like you might be carrying something heavy right now.
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: '#5A4A40',
                lineHeight: 22,
              }}
            >
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
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <Pressable
                  onPress={handleSaveLetter}
                  disabled={letterSaved}
                  accessibilityRole="button"
                  accessibilityLabel={letterSaved ? 'Letter saved' : 'Save letter'}
                  className="active:opacity-80"
                  style={{
                    backgroundColor: letterSaved ? '#9CB59A' : '#C4956A',
                    borderRadius: 24,
                    paddingHorizontal: 22,
                    paddingVertical: 11,
                  }}
                >
                  <Text
                    style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#FFFFFF' }}
                  >
                    {letterSaved ? '★ Saved' : '☆ Save letter'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share letter"
                  className="active:opacity-60"
                  style={{
                    borderWidth: 1,
                    borderColor: '#C4956A',
                    borderRadius: 24,
                    paddingHorizontal: 22,
                    paddingVertical: 11,
                  }}
                >
                  <Text
                    style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#C4956A' }}
                  >
                    Share ↑
                  </Text>
                </Pressable>
              </View>
            )}

            {hasLetter && (
              <Pressable
                onPress={() => router.replace('/(tabs)')}
                accessibilityRole="button"
                accessibilityLabel="Done, go home"
                className="active:opacity-50"
                style={{ alignItems: 'center', marginTop: 20 }}
              >
                <Text
                  style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#A09080' }}
                >
                  Done — go home
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
                <Text
                  style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#C4956A' }}
                >
                  Try again →
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
