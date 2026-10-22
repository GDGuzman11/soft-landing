import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'
import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import type { AuthUser } from '../types'

export type { AuthUser }

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  }
}

/**
 * Wrap raw Firebase auth errors so callers only see the stable `.code`
 * (e.g. 'auth/invalid-credential'). Firebase's default error message often
 * includes internal URLs, email addresses, or token fragments which can leak
 * via logs, crash reports, or rendered toasts. Preserve only `.code` and
 * surface a generic message that callers can map to UI copy.
 */
function wrapAuthError(err: unknown): never {
  const code = (err as { code?: string })?.code ?? 'auth/unknown'
  const safeError = new Error('Authentication failed') as Error & { code: string }
  safeError.code = code
  throw safeError
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthUser> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName: name })
    return toAuthUser(credential.user)
  } catch (err) {
    wrapAuthError(err)
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return toAuthUser(credential.user)
  } catch (err) {
    wrapAuthError(err)
  }
}

async function signInWithGoogle(idToken: string): Promise<AuthUser> {
  try {
    const googleCredential = GoogleAuthProvider.credential(idToken)
    const credential = await signInWithCredential(auth, googleCredential)
    return toAuthUser(credential.user)
  } catch (err) {
    wrapAuthError(err)
  }
}

// Loaded lazily (require, not a top-level import) so the native module is only
// touched when the user taps "Sign in with Google". A static import would run
// TurboModuleRegistry.getEnforcing('RNGoogleSignin') at app startup and crash
// the entire app anywhere the native module is absent (e.g. Expo Go).
type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin')
let googleModule: GoogleSigninModule | null = null
let googleConfigured = false

function loadGoogleSignin(): GoogleSigninModule {
  if (!googleModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule
  }
  return googleModule
}

/**
 * Native Google Sign-In (iOS/Android SDK) → Firebase. Replaces the
 * expo-auth-session browser flow, which Google blocks in installed apps.
 * Returns `null` when the user cancels the native sheet (not an error).
 * Requires a dev/production build — the native module is absent in Expo Go.
 */
export async function signInWithGoogleNative(): Promise<AuthUser | null> {
  let gs: GoogleSigninModule
  try {
    gs = loadGoogleSignin()
  } catch {
    const e = new Error('Google sign-in needs a dev or production build') as Error & { code: string }
    e.code = 'auth/google-native-unavailable'
    throw e
  }
  const { GoogleSignin, statusCodes, isErrorWithCode } = gs
  let idToken: string | null = null
  try {
    if (!googleConfigured) {
      // webClientId is required so the returned idToken's audience matches a
      // client Firebase trusts; iosClientId drives the native iOS consent sheet.
      GoogleSignin.configure({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      })
      googleConfigured = true
    }
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    }
    const response = await GoogleSignin.signIn()
    if (response.type === 'cancelled') return null
    idToken = response.data?.idToken ?? null
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return null
    wrapAuthError(err)
  }
  if (!idToken) {
    const e = new Error('No Google identity token returned') as Error & { code: string }
    e.code = 'auth/no-id-token'
    throw e
  }
  return signInWithGoogle(idToken)
}

export async function sendVerificationEmail(): Promise<void> {
  const user = auth.currentUser
  if (!user) return
  try {
    await sendEmailVerification(user)
  } catch (err) {
    wrapAuthError(err)
  }
}

export async function reloadAndCheckVerified(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  try {
    await user.reload()
    return auth.currentUser?.emailVerified ?? false
  } catch (err) {
    wrapAuthError(err)
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (err) {
    wrapAuthError(err)
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth)
  } catch (err) {
    wrapAuthError(err)
  }
}

export function getCurrentUser(): AuthUser | null {
  const user = auth.currentUser
  return user ? toAuthUser(user) : null
}

export async function signInWithApple(): Promise<AuthUser> {
  try {
    // Firebase requires a nonce for Apple sign-in. Apple embeds the SHA-256 hash
    // of the nonce in the identity token; Firebase re-hashes the rawNonce we pass
    // and compares. So: hashed nonce goes to Apple, raw nonce goes to Firebase.
    const rawNonce = Crypto.randomUUID()
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    )
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })
    const { identityToken, fullName } = credential
    if (!identityToken) throw new Error('No Apple identity token returned')
    const provider = new OAuthProvider('apple.com')
    const firebaseCredential = provider.credential({ idToken: identityToken, rawNonce })
    const result = await signInWithCredential(auth, firebaseCredential)
    // Apple returns the user's name ONLY on the first sign-in. Capture it so the
    // app (letters, Say first-name personalization) has a display name to use.
    if (!result.user.displayName && fullName?.givenName) {
      const name = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ').trim()
      if (name) await updateProfile(result.user, { displayName: name })
    }
    return toAuthUser(result.user)
  } catch (err) {
    wrapAuthError(err)
  }
}
