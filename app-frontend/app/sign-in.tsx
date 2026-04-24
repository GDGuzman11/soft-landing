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

WebBrowser.maybeCompleteAuthSession()

function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/user-not-found':
      return 'No account found with that email.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export default function SignInScreen() {
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
          .then(() => router.replace('/(tabs)'))
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
        router.replace({ pathname: '/verify-email', params: { email: email.trim() } })
      } else {
        router.replace('/(tabs)')
      }
    } catch (e: any) {
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
          Welcome back.
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
          Sign in to continue.
        </Text>

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
          onSubmitEditing={handleSignIn}
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
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#A09080' }}>
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
          accessibilityLabel="Sign in with Google"
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#1A1A1A' }}>
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
                router.replace('/(tabs)')
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
            accessibilityLabel="Sign in with Apple"
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#1A1A1A' }}>
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
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#A09080' }}>
            Don't have an account?{' '}
            <Text style={{ color: '#C4956A', fontFamily: 'DMSans_500Medium' }}>Create one</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
