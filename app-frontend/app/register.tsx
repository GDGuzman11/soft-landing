import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import { signUpWithEmail, signInWithGoogleNative, signInWithApple, sendVerificationEmail } from '@/services/auth'
import { getSettings, saveSettings } from '@/storage/storage'
import { mapFirebaseError } from '@/utils/firebaseErrors'
import { MIN_AGE, formatDob, ageFromDob } from '@/utils/age'
import { useTheme } from '@/theme'

const TERMS_URL = 'https://gdguzman11.github.io/soft-landing/terms.html'
const PRIVACY_URL = 'https://gdguzman11.github.io/soft-landing/privacy-policy.html'

export default function RegisterScreen() {
  const { colors } = useTheme()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tosAccepted, setTosAccepted] = useState(false)
  const [dob, setDob] = useState('')
  const [ageModal, setAgeModal] = useState<null | 'google' | 'apple'>(null)
  const [modalDob, setModalDob] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)

  async function persistAgeVerified() {
    try {
      const s = await getSettings()
      await saveSettings({ ...s, ageVerified: true })
    } catch {
      // non-fatal — the age check already passed; persistence is best-effort
    }
  }

  /** Gate the manual (email) sign-up on the 16+ minimum age via the in-form DOB field. */
  async function ensureAgeOk(): Promise<boolean> {
    const age = ageFromDob(dob)
    if (age === null) {
      setError('Please enter your date of birth as MM-DD-YYYY.')
      return false
    }
    if (age < MIN_AGE) {
      setError(`You must be at least ${MIN_AGE} to use Soft Landing.`)
      return false
    }
    await persistAgeVerified()
    return true
  }

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
      router.replace('/onboarding-disclaimer')
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
      router.replace('/onboarding-disclaimer')
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in failed. Please try again.')
      }
      setLoading(false)
    }
  }

  /** Social sign-up: verify 16+ (reuse a valid in-form DOB, else a birthdate pop-up), then auth. */
  async function startSocial(method: 'google' | 'apple') {
    if (!tosAccepted) {
      setError('Please agree to the Terms of Service to continue.')
      return
    }
    const age = ageFromDob(dob)
    if (age !== null && age >= MIN_AGE) {
      await persistAgeVerified()
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
    await persistAgeVerified()
    const method = ageModal
    setAgeModal(null)
    if (method === 'google') proceedGoogle()
    else if (method === 'apple') proceedApple()
  }

  async function handleCreateAccount() {
    if (!tosAccepted) {
      setError('Please agree to the Terms of Service to continue.')
      return
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || password.length < 6) {
      setError('Please fill in all fields. Password must be at least 6 characters.')
      return
    }
    if (!(await ensureAgeOk())) return
    setLoading(true)
    setError(null)
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    try {
      await signUpWithEmail(fullName, email.trim(), password)
      await sendVerificationEmail()
      router.replace('/verify-email')
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
          Create your account.
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
          Your safe place to land each day.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.inkSubtle}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 14,
              fontFamily: 'DMSans_400Regular',
              fontSize: 16,
              backgroundColor: colors.surface,
              color: colors.inkPrimary,
            }}
          />
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors.inkSubtle}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 14,
              fontFamily: 'DMSans_400Regular',
              fontSize: 16,
              backgroundColor: colors.surface,
              color: colors.inkPrimary,
            }}
          />
        </View>

        <TextInput
          value={dob}
          onChangeText={(t) => setDob(formatDob(t))}
          placeholder="Date of birth (MM-DD-YYYY)"
          placeholderTextColor={colors.inkSubtle}
          keyboardType="number-pad"
          autoCorrect={false}
          editable={!loading}
          maxLength={10}
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
          onSubmitEditing={handleCreateAccount}
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
            marginBottom: 4,
          }}
        />
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: colors.inkMuted,
            marginBottom: 28,
            marginLeft: 4,
            letterSpacing: 0.2,
          }}
        >
          at least 6 characters
        </Text>

        {/* ToS checkbox */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
          <Pressable
            onPress={() => setTosAccepted((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: tosAccepted }}
            accessibilityLabel="Agree to Terms of Service and Privacy Policy"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: tosAccepted ? colors.amber : colors.inkSubtle,
                backgroundColor: tosAccepted ? colors.amber : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {tosAccepted ? (
                <Text style={{ color: '#FFFFFF', fontSize: 13, lineHeight: 17 }}>✓</Text>
              ) : null}
            </View>
          </Pressable>

          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 13,
              color: colors.inkMuted,
              lineHeight: 21,
              flex: 1,
            }}
          >
            I have read and agree to the{' '}
            <Text
              style={{ color: colors.amber, fontFamily: 'DMSans_500Medium' }}
              onPress={() => Linking.openURL(TERMS_URL)}
              accessibilityRole="link"
              accessibilityLabel="Read Terms of Service"
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={{ color: colors.amber, fontFamily: 'DMSans_500Medium' }}
              onPress={() => Linking.openURL(PRIVACY_URL)}
              accessibilityRole="link"
              accessibilityLabel="Read Privacy Policy"
            >
              Privacy Policy
            </Text>
            . Soft Landing provides spiritual encouragement only — not professional advice.
          </Text>
        </View>

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
          onPress={handleCreateAccount}
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
          accessibilityLabel="Create Account"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
              Create Account
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
          accessibilityLabel="Sign up with Google"
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.inkPrimary }}>
            <Text style={{ color: '#4285F4' }}>G</Text>  Sign up with Google
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
            accessibilityLabel="Sign up with Apple"
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.inkPrimary }}>
              <Text style={{ fontSize: 15 }}>{''}</Text>  Sign up with Apple
            </Text>
          </Pressable>
        )}

        {Platform.OS !== 'ios' && <View style={{ marginBottom: 32 }} />}

        <Pressable
          onPress={() => router.push('/sign-in')}
          style={{ alignItems: 'center', padding: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Sign in to existing account"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>
            Already have an account?{' '}
            <Text style={{ color: colors.amber, fontFamily: 'DMSans_500Medium' }}>Sign in</Text>
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
