import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { Platform } from 'react-native'

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? ''

// TODO: entitlement sync to local state is not yet wired.
// initPurchases() configures the SDK but does NOT subscribe to
// Purchases.addCustomerInfoUpdateListener or push the active entitlement
// into AsyncStorage settings.subscription.tier. Until that wiring exists,
// the rest of the app reads tier from local storage which can drift from
// the true RevenueCat entitlement state. See BUG-026.
export function initPurchases(): void {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY
  if (!apiKey) return
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  Purchases.configure({ apiKey })
}
