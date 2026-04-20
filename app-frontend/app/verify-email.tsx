import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useState, useEffect } from 'react'
import { sendVerificationEmail, reloadAndCheckVerified, signOutUser } from '@/services/auth'

const RESEND_COOLDOWN = 30

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleContinue() {
    setChecking(true)
    setError(null)
    try {
      const verified = await reloadAndCheckVerified()
      if (verified) {
        router.replace('/onboarding')
      } else {
        setError("We haven't received your verification yet. Check your inbox and click the link.")
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setError(null)
    try {
      await sendVerificationEmail()
      setCooldown(RESEND_COOLDOWN)
    } catch {
      setError('Could not resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  async function handleBack() {
    await signOutUser()
    router.replace('/register')
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#FAF8F5',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    }}>
      {/* Envelope icon — simple drawn envelope */}
      <View style={{
        width: 64,
        height: 48,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#C4956A',
        marginBottom: 32,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <View style={{
          width: 0,
          height: 0,
          borderLeftWidth: 32,
          borderRightWidth: 32,
          borderTopWidth: 22,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: '#C4956A',
          position: 'absolute',
          top: 0,
          opacity: 0.5,
        }} />
      </View>

      <Text style={{
        fontFamily: 'Lora_400Regular_Italic',
        fontSize: 28,
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 38,
      }}>
        Check your inbox.
      </Text>

      <Text style={{
        fontFamily: 'DMSans_400Regular',
        fontSize: 14,
        color: '#A09080',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
      }}>
        We sent a verification link to
      </Text>
      <Text style={{
        fontFamily: 'DMSans_500Medium',
        fontSize: 14,
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 40,
      }}>
        {email ?? 'your email address'}
      </Text>

      {error ? (
        <Text style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 13,
          color: '#C0392B',
          textAlign: 'center',
          marginBottom: 16,
          lineHeight: 20,
        }}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={handleContinue}
        disabled={checking}
        className="active:opacity-80"
        style={{
          backgroundColor: '#C4956A',
          borderRadius: 9999,
          paddingVertical: 16,
          width: '100%',
          alignItems: 'center',
          marginBottom: 12,
          shadowColor: '#C4956A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: checking ? 0 : 0.3,
          shadowRadius: 12,
          elevation: checking ? 0 : 6,
          opacity: checking ? 0.7 : 1,
        }}
        accessibilityRole="button"
        accessibilityLabel="I've verified my email"
      >
        {checking
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FFFFFF' }}>
              I've verified my email
            </Text>
        }
      </Pressable>

      <Pressable
        onPress={handleResend}
        disabled={resending || cooldown > 0}
        style={{ paddingVertical: 10, marginBottom: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Resend verification email"
      >
        <Text style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 14,
          color: cooldown > 0 ? '#C4B59A' : '#C4956A',
        }}>
          {resending
            ? 'Sending…'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend email'
          }
        </Text>
      </Pressable>

      <Pressable
        onPress={handleBack}
        style={{ paddingVertical: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Wrong email, go back"
      >
        <Text style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 13,
          color: '#C0A898',
        }}>
          Wrong email? Go back
        </Text>
      </Pressable>
    </View>
  )
}
