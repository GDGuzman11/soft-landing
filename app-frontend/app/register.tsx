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
} from 'react-native'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session/providers/google'
import { signUpWithEmail, signInWithGoogle, signInWithApple, sendVerificationEmail } from '@/services/auth'

WebBrowser.maybeCompleteAuthSession()

const TERMS_URL = 'https://gdguzman11.github.io/soft-landing/terms.html'
const PRIVACY_URL = 'https://gdguzman11.github.io/soft-landing/privacy-policy.html'

function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with that email already exists.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tosAccepted, setTosAccepted] = useState(false)

  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  })

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params
      if (id_token) {
        setLoading(true)
        setError(null)
        signInWithGoogle(id_token)
          .then(() => router.replace('/onboarding-disclaimer'))
          .catch(() => {
            setError('Google sign-in failed. Please try again.')
            setLoading(false)
          })
      }
    }
  }, [response])

  async function handleCreateAccount() {
    if (!tosAccepted) {
      setError('Please agree to the Terms of Service to continue.')
      return
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || password.length < 6) {
      setError('Please fill in all fields. Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError(null)
    const fullName = `${firstName.trim()} ${lastName.trim()}`
    try {
      await signUpWithEmail(fullName, email.trim(), password)
      await sendVerificationEmail()
      router.replace('/verify-email')
    } catch (e: any) {
      if (__DEV__) console.error('[register] sign-up error:', e?.code, e?.message)
      const code = e?.code ?? ''
      setError(mapFirebaseError(code))
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FAF8F5' }}
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
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 28, color: '#A09080', lineHeight: 28 }}>
            ‹
          </Text>
        </Pressable>

        <Text
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 30,
            color: '#1A1A1A',
            marginBottom: 8,
          }}
        >
          Create your account.
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: '#A09080',
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
            placeholderTextColor="#C4B59A"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#E8E3DC',
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 14,
              fontFamily: 'DMSans_400Regular',
              fontSize: 16,
              backgroundColor: '#FFFFFF',
              color: '#1A1A1A',
            }}
          />
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor="#C4B59A"
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#E8E3DC',
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 14,
              fontFamily: 'DMSans_400Regular',
              fontSize: 16,
              backgroundColor: '#FFFFFF',
              color: '#1A1A1A',
            }}
          />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#C4B59A"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: '#E8E3DC',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 14,
            fontFamily: 'DMSans_400Regular',
            fontSize: 16,
            backgroundColor: '#FFFFFF',
            color: '#1A1A1A',
            marginBottom: 12,
          }}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#C4B59A"
          secureTextEntry
          editable={!loading}
          onSubmitEditing={handleCreateAccount}
          returnKeyType="done"
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: '#E8E3DC',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 14,
            fontFamily: 'DMSans_400Regular',
            fontSize: 16,
            backgroundColor: '#FFFFFF',
            color: '#1A1A1A',
            marginBottom: 4,
          }}
        />
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: '#A09080',
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
                borderColor: tosAccepted ? '#C4956A' : '#C4B59A',
                backgroundColor: tosAccepted ? '#C4956A' : 'transparent',
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
              color: '#A09080',
              lineHeight: 21,
              flex: 1,
            }}
          >
            I have read and agree to the{' '}
            <Text
              style={{ color: '#C4956A', fontFamily: 'DMSans_500Medium' }}
              onPress={() => Linking.openURL(TERMS_URL)}
              accessibilityRole="link"
              accessibilityLabel="Read Terms of Service"
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={{ color: '#C4956A', fontFamily: 'DMSans_500Medium' }}
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
            backgroundColor: '#C4956A',
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 12,
            shadowColor: '#C4956A',
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

        <Pressable
          onPress={() => {
            if (!tosAccepted) { setError('Please agree to the Terms of Service to continue.'); return }
            if (!loading) promptAsync()
          }}
          disabled={!request || loading}
          className="active:opacity-80"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#E8E3DC',
            opacity: !request || loading ? 0.5 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Sign up with Google"
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#1A1A1A' }}>
            <Text style={{ color: '#4285F4' }}>G</Text>  Sign up with Google
          </Text>
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            onPress={async () => {
              if (!tosAccepted) { setError('Please agree to the Terms of Service to continue.'); return }
              if (loading) return
              setLoading(true)
              setError(null)
              try {
                await signInWithApple()
                router.replace('/onboarding-disclaimer')
              } catch (e: any) {
                if (e?.code !== 'ERR_REQUEST_CANCELED') {
                  setError('Apple sign-in failed. Please try again.')
                }
                setLoading(false)
              }
            }}
            disabled={loading}
            className="active:opacity-80"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 9999,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 32,
              borderWidth: 1,
              borderColor: '#E8E3DC',
              opacity: loading ? 0.5 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="Sign up with Apple"
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#1A1A1A' }}>
              Sign up with Apple
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
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#A09080' }}>
            Already have an account?{' '}
            <Text style={{ color: '#C4956A', fontFamily: 'DMSans_500Medium' }}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
