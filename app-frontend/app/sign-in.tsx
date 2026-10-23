import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import { signInWithEmail, signInWithGoogleNative, signInWithApple, sendVerificationEmail, resetPassword } from '@/services/auth'
import { getSettings, saveSettings } from '@/storage/storage'
import { mapFirebaseError } from '@/utils/firebaseErrors'
import { MIN_AGE, formatDob, ageFromDob, isAgeVerified, markAgeVerified } from '@/utils/age'
import { useTheme } from '@/theme'

async function stampReturningUser() {
  try {
    const s = await getSettings()
    await saveSettings({
      ...s,
      disclaimerAccepted: true,
      onboardingComplete: true,
      profileComplete: true,
      faithIntroComplete: true,
    })
  } catch {
    // non-fatal — nav guard will handle any remaining redirects gracefully
  }
}

export default function SignInScreen() {
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ageModal, setAgeModal] = useState<null | 'google' | 'apple'>(null)
  const [modalDob, setModalDob] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)

  async function proceedGoogle() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const user = await signInWithGoogleNative()
      if (!user) {
        setLoading(false)
        return
      }
      await stampReturningUser()
      router.replace('/(tabs)')
    } catch {
      setError('Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  async function proceedApple() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await signInWithApple()
      await stampReturningUser()
      router.replace('/(tabs)')
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in failed. Please try again.')
      }
      setLoading(false)
    }
  }

  /** Social sign-in must still clear the 16+ gate: skip it when the device already
   *  verified, otherwise prompt for a birthdate — parity with register (Apple 5.1.1 / age rating). */
  async function startSocial(method: 'google' | 'apple') {
    if (loading) return
    setError(null)
    if (await isAgeVerified()) {
      if (method === 'google') proceedGoogle()
      else proceedApple()
      return
    }
    setModalDob('')
    setModalError(null)
    setAgeModal(method)
  }

  async function confirmAgeModal() {
    const age = ageFromDob(modalDob)
    if (age === null) {
      setModalError('Enter your date of birth as MM-DD-YYYY.')
      return
    }
    if (age < MIN_AGE) {
      setModalError(`You must be at least ${MIN_AGE} to use Soft Landing.`)
      return
    }
    await markAgeVerified()
    const method = ageModal
    setAgeModal(null)
    if (method === 'google') proceedGoogle()
    else if (method === 'apple') proceedApple()
  }

  async function handleSignIn() {
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const user = await signInWithEmail(email.trim(), password)
      if (!user.emailVerified) {
        await sendVerificationEmail()
        router.replace('/verify-email')
      } else {
        await stampReturningUser()
        router.replace('/(tabs)')
      }
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? ''
      setError(mapFirebaseError(code))
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ position: 'absolute', top: 56, left: 24, padding: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 28, color: colors.inkMuted, lineHeight: 28 }}>
            ‹
          </Text>
        </Pressable>

        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 30,
            color: colors.inkPrimary,
            marginBottom: 8,
          }}
        >
          Welcome back.
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: colors.inkMuted,
            marginBottom: 40,
            letterSpacing: 0.3,
          }}
        >
          Sign in to continue.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.inkSubtle}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 14,
            fontFamily: 'DMSans_400Regular',
            fontSize: 16,
            backgroundColor: colors.surface,
            color: colors.inkPrimary,
            marginBottom: 12,
          }}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.inkSubtle}
          secureTextEntry
          editable={!loading}
          onSubmitEditing={handleSignIn}
          returnKeyType="done"
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 14,
            fontFamily: 'DMSans_400Regular',
            fontSize: 16,
            backgroundColor: colors.surface,
            color: colors.inkPrimary,
            marginBottom: 8,
          }}
        />

        <Pressable
          onPress={async () => {
            if (!email.trim()) {
              setError('Enter your email above first.')
              return
            }
            try {
              await resetPassword(email.trim())
              Alert.alert('Check your email', `A reset link has been sent to ${email.trim()}.`)
            } catch {
              setError('Could not send reset email. Check the address and try again.')
            }
          }}
          style={{ alignSelf: 'flex-end', marginBottom: 28, padding: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMuted }}>
            Forgot password?
          </Text>
        </Pressable>

        {error ? (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 13,
              color: '#C0392B',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          className="active:opacity-80"
          style={{
            backgroundColor: colors.amber,
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 12,
            shadowColor: colors.amber,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: loading ? 0 : 0.3,
            shadowRadius: 12,
            elevation: loading ? 0 : 6,
            opacity: loading ? 0.7 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
              Sign In
            </Text>
          )}
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.cardBorder }} />
          <Text style={{ marginHorizontal: 12, fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMuted }}>
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.cardBorder }} />
        </View>

        <Pressable
          onPress={() => startSocial('google')}
          disabled={loading}
          className="active:opacity-80"
          style={{
            backgroundColor: colors.surface,
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            opacity: loading ? 0.5 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.inkPrimary }}>
            <Text style={{ color: '#4285F4' }}>G</Text>  Sign in with Google
          </Text>
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            onPress={() => startSocial('apple')}
            disabled={loading}
            className="active:opacity-80"
            style={{
              backgroundColor: colors.surface,
              borderRadius: 9999,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 32,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              opacity: loading ? 0.5 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Apple"
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.inkPrimary }}>
              <Text style={{ fontSize: 15 }}>{''}</Text>  Sign in with Apple
            </Text>
          </Pressable>
        )}

        {Platform.OS !== 'ios' && <View style={{ marginBottom: 32 }} />}

        <Pressable
          onPress={() => router.push('/register')}
          style={{ alignItems: 'center', padding: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Create an account"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>
            Don't have an account?{' '}
            <Text style={{ color: colors.amber, fontFamily: 'DMSans_500Medium' }}>Create one</Text>
          </Text>
        </Pressable>

        <Modal
          visible={ageModal !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setAgeModal(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24 }}>
              <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 20, color: colors.inkPrimary, marginBottom: 6 }}>
                One quick thing
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted, marginBottom: 16, lineHeight: 20 }}>
                Enter your date of birth to continue. You must be at least {MIN_AGE}.
              </Text>
              <TextInput
                value={modalDob}
                onChangeText={(t) => setModalDob(formatDob(t))}
                placeholder="MM-DD-YYYY"
                placeholderTextColor={colors.inkSubtle}
                keyboardType="number-pad"
                autoCorrect={false}
                maxLength={10}
                autoFocus
                style={{
                  width: '100%',
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 16,
                  backgroundColor: colors.bg,
                  color: colors.inkPrimary,
                }}
              />
              {modalError ? (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#C0392B', marginTop: 10, textAlign: 'center' }}>
                  {modalError}
                </Text>
              ) : null}
              <Pressable
                onPress={confirmAgeModal}
                style={{ backgroundColor: colors.amber, borderRadius: 9999, paddingVertical: 14, alignItems: 'center', marginTop: 18 }}
                accessibilityRole="button"
                accessibilityLabel="Continue"
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>Continue</Text>
              </Pressable>
              <Pressable
                onPress={() => setAgeModal(null)}
                style={{ alignItems: 'center', paddingVertical: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
