import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases'
import { Platform } from 'react-native'
import { getSettings, saveSettings } from '@/storage/storage'
import { REVENUECAT_ENTITLEMENT_ID } from '@/constants'

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? ''

function apiKey(): string {
  return Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY
}

/** Whether RevenueCat is wired (keys present). False during TestFlight → every
 *  function below no-ops, so the whole subscription layer stays dormant. */
export function isPurchasesConfigured(): boolean {
  return apiKey().length > 0
}

/**
 * Mirror the RevenueCat `premium` entitlement into local settings.subscription,
 * which the frontend gates read. The SERVER (users/{uid}.isPremium via the
 * RevenueCat webhook) is the real gate for AI usage; this just keeps the UI in step.
 */
async function syncEntitlement(info: CustomerInfo): Promise<void> {
  try {
    const ent = info.entitlements.active[REVENUECAT_ENTITLEMENT_ID]
    const isPremium = !!ent
    const s = await getSettings()
    await saveSettings({
      ...s,
      subscription: {
        tier: isPremium ? 'premium' : 'free',
        entitlements: isPremium ? [REVENUECAT_ENTITLEMENT_ID] : [],
        expiresAt: ent?.expirationDate ?? null,
        isTrialing: ent?.periodType === 'TRIAL',
      },
    })
  } catch {
    // non-fatal — a drifted local flag is backstopped by the server check
  }
}

export function initPurchases(): void {
  if (!isPurchasesConfigured()) return
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG)
  Purchases.configure({ apiKey: apiKey() })
  Purchases.addCustomerInfoUpdateListener((info) => {
    void syncEntitlement(info)
  })
}

/** Call after sign-in so RevenueCat's appUserID === the Firebase uid (lets the
 *  webhook map purchases to users/{uid}). No-op until keys are configured. */
export async function identifyPurchaser(uid: string): Promise<void> {
  if (!isPurchasesConfigured()) return
  try {
    const { customerInfo } = await Purchases.logIn(uid)
    await syncEntitlement(customerInfo)
  } catch {
    // non-fatal
  }
}

export async function getOfferingPackages(): Promise<PurchasesPackage[]> {
  if (!isPurchasesConfigured()) return []
  try {
    const offerings = await Purchases.getOfferings()
    return offerings.current?.availablePackages ?? []
  } catch {
    return []
  }
}

/** Returns true when the purchase completed and the premium entitlement is active. */
export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  if (!isPurchasesConfigured()) return false
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    await syncEntitlement(customerInfo)
    return !!customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]
  } catch {
    // includes user-cancelled — caller treats false as "not purchased"
    return false
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isPurchasesConfigured()) return false
  try {
    const info = await Purchases.restorePurchases()
    await syncEntitlement(info)
    return !!info.entitlements.active[REVENUECAT_ENTITLEMENT_ID]
  } catch {
    return false
  }
}
