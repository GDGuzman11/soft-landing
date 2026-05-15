import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = (() => {
  try {
    // getReactNativePersistence is in the RN bundle of firebase/auth but absent from
    // the web/node TypeScript declarations — require() resolves it at runtime only
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('firebase/auth')
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  } catch {
    return getAuth(app)
  }
})()

export const db = getFirestore(app)

// firebase/analytics uses DOM APIs that don't exist in React Native.
// logAnalyticsEvent is a no-op stub — replace with @react-native-firebase/analytics
// or another RN-compatible SDK when analytics are needed in a dev build.
export function logAnalyticsEvent(_name: string, _params?: Record<string, unknown>): void {}

export default app
