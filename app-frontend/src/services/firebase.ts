import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, logEvent as firebaseLogEvent, Analytics } from 'firebase/analytics'
import AsyncStorage from '@react-native-async-storage/async-storage'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
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

let _analytics: Analytics | null = null
try {
  _analytics = getAnalytics(app)
} catch {
  // Analytics not supported in this environment (e.g. Expo Go)
}

export function logAnalyticsEvent(name: string, params?: Record<string, unknown>): void {
  if (!_analytics) return
  firebaseLogEvent(_analytics, name, params as Record<string, string>)
}

export default app
