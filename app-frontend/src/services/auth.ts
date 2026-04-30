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
import * as AppleAuthentication from 'expo-apple-authentication'
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

export async function signInWithGoogle(idToken: string): Promise<AuthUser> {
  try {
    const googleCredential = GoogleAuthProvider.credential(idToken)
    const credential = await signInWithCredential(auth, googleCredential)
    return toAuthUser(credential.user)
  } catch (err) {
    wrapAuthError(err)
  }
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

export async function signInWithApple(): Promise<void> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    const { identityToken } = credential
    if (!identityToken) throw new Error('No Apple identity token returned')
    const provider = new OAuthProvider('apple.com')
    const firebaseCredential = provider.credential({ idToken: identityToken })
    await signInWithCredential(auth, firebaseCredential)
  } catch (err) {
    wrapAuthError(err)
  }
}
