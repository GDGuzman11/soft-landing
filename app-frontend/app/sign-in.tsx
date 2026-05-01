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
} from 'react-native'
import { router } from 'expo-router'
import { useState, useEffect } from 'react'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session/providers/google'
import { signInWithEmail, signInWithGoogle, signInWithApple, sendVerificationEmail, resetPassword } from '@/services/auth'
import { getSettings, saveSettings } from '@/storage/storage'
import { mapFirebaseError } from '@/utils/firebaseErrors'
import { useTheme } from '@/theme'

WebBrowser.maybeCompleteAuthSession()

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
          .then(() => stampReturningUser().then(() => router.replace('/(tabs)')))
          .catch(() => {
            setError('Google sign-in failed. Please try again.')
            setLoading(false)
          })
      }
    }
  }, [response])

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

        <Pressable
          onPress={() => !loading && promptAsync()}
          disabled={!request || loading}
          className="active:opacity-80"
          style={{
            backgroundColor: colors.surface,
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            opacity: !request || loading ? 0.5 : 1,
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
            onPress={async () => {
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
            }}
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
              Sign in with Apple
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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
