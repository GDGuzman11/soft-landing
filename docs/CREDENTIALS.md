# Credentials & External Services

This document covers every external service the app uses, what credentials
are required, where to get them, and exactly where they go in the codebase.

---

## 1. RevenueCat (Subscriptions)

**What it does:** Manages $4.99/month and $34.99/year subscriptions. Validates
receipts server-side so the app never trusts the client alone.

**Status:** SDK installed. NOT initialized — app always runs as free tier until keys are added.

**How to get keys:**
1. Create account at https://app.revenuecat.com
2. Create a new project → "Soft Landing"
3. Add iOS app → copy the **iOS API key** (starts with `appl_`)
4. Add Android app → copy the **Android API key** (starts with `goog_`)
5. In RevenueCat dashboard → Products → add:
   - `softlanding_monthly` ($4.99 Auto-Renewable)
   - `softlanding_annual` ($34.99 Auto-Renewable)
6. In RevenueCat → Entitlements → create `premium` → attach both products

**Where they go:**
```
app-frontend/.env
```
```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxxxxxx
```

**Where they're used:**
- `app-frontend/src/services/revenuecat.ts` (initialize on app start)
- `app-frontend/src/services/checkIn.ts` (entitlement check before check-in)

---

## 2. Apple Developer Account (iOS builds & TestFlight)

**What it does:** Required to build, sign, and distribute the iOS app.

**Status:** Account enrollment required ($99/year at developer.apple.com).

**Credentials needed:**
| Field | Where to find |
|---|---|
| Apple ID | Your Apple account email |
| Team ID | developer.apple.com → Account → Membership |
| App Store Connect App ID | App Store Connect → App → General → Apple ID (numeric) |

**Where they go:**
```
app-frontend/eas.json  (submit section — add when ready to submit)
```
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@email.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCDE12345"
    }
  }
}
```

---

## 3. Firebase (Optional — V2 cloud sync)

**What it does:** Cloud storage for check-in history sync across devices,
push notifications, and optional authentication.

**Status:** NOT in V1. Reserved for V2 backend in `app-backend/`.

**How to get credentials:**
1. Go to https://console.firebase.google.com
2. Create project → "soft-landing"
3. Add iOS app (bundle ID: `com.softlanding.app`) → download `GoogleService-Info.plist`
4. Add Android app (package: `com.softlanding.app`) → download `google-services.json`
5. Enable Firestore, Authentication (Apple + Google sign-in)

**Where they go:**
```
app-frontend/GoogleService-Info.plist      ← iOS (gitignored)
app-frontend/google-services.json          ← Android (gitignored)
app-frontend/.env
```
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=soft-landing.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=soft-landing
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=soft-landing.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:ios:xxxxxxxxxxxx
```

---

## 4. Expo / EAS

**What it does:** Cloud builds, OTA updates, push notification routing.

**Status:** Linked. projectId `2d79e638-f797-42ff-86b3-94f5c20fa6ff` in `app.json`.

**No extra credentials needed** — EAS uses your Expo login (`eas login`).

---

## Quick-start checklist

To make the app fully production-ready, complete these in order:

- [ ] Add RevenueCat API keys to `.env`
- [ ] Initialize RevenueCat in `src/services/revenuecat.ts`
- [ ] Create products in App Store Connect (`softlanding_monthly`, `softlanding_annual`)
- [ ] Link products in RevenueCat dashboard
- [ ] Enroll Apple Developer account ($99)
- [ ] Run `eas build --profile preview --platform ios`
- [ ] Test subscription flow in sandbox
- [ ] Fill in `eas.json` submit section (Team ID, ascAppId)
- [ ] Run `eas submit --platform ios` for App Store
