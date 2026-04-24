import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { Platform } from 'react-native'

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? ''

export function initPurchases(): void {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY
  if (!apiKey) return
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  Purchases.configure({ apiKey })
}
