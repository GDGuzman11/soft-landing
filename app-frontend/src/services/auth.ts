import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
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
