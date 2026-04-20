import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'
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

export async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName: name })
  return toAuthUser(credential.user)
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return toAuthUser(credential.user)
}

export async function signInWithGoogle(idToken: string): Promise<AuthUser> {
  const googleCredential = GoogleAuthProvider.credential(idToken)
  const credential = await signInWithCredential(auth, googleCredential)
  return toAuthUser(credential.user)
}

export async function sendVerificationEmail(): Promise<void> {
  const user = auth.currentUser
  if (user) await sendEmailVerification(user)
}

export async function reloadAndCheckVerified(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  await user.reload()
  return auth.currentUser?.emailVerified ?? false
}

export async function signOutUser(): Promise<void> {
  await signOut(auth)
}

export function getCurrentUser(): AuthUser | null {
  const user = auth.currentUser
  return user ? toAuthUser(user) : null
}

export function subscribeToAuthChanges(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    callback(user ? toAuthUser(user) : null)
  })
}
