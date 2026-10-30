# Credentials & External Services

This document covers every external service the app uses, what credentials
are required, where to get them, and exactly where they go in the codebase.

---

## 1. RevenueCat (Subscriptions)

**What it does:** Manages $5.99/month and $47.99/year subscriptions. Validates
receipts server-side so the app never trusts the client alone.

**Status:** SDK installed. NOT initialized — app always runs as free tier until keys are added.

**How to get keys:**
1. Create account at https://app.revenuecat.com
2. Create a new project → "Soft Landing"
3. Add iOS app → copy the **iOS API key** (starts with `appl_`)
4. Add Android app → copy the **Android API key** (starts with `goog_`)
5. In RevenueCat dashboard → Products → add:
   - `com.appsoftlanding.premium.monthly` ($5.99 Auto-Renewable)
   - `com.appsoftlanding.premium.annual` ($47.99 Auto-Renewable)
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
3. Add iOS app (bundle ID: `com.appsoftlanding.com`) → download `GoogleService-Info.plist`
4. Add Android app (package: `com.appsoftlanding.com`) → download `google-services.json`
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

## 5. Google & Apple Sign-In (iOS)

**What it does:** Lets users sign in with Google or Apple instead of email/password. Both require a
**real build** — Apple Sign-In cannot run in Expo Go (it's a native module).

**In-repo code/config (already done):** Apple nonce + first-sign-in name capture in
`src/services/auth.ts` (`signInWithApple`); Google via `expo-auth-session/providers/google` in
`sign-in.tsx` / `register.tsx`; `app.json` sets `ios.usesAppleSignIn: true`; the Google
reversed-client-id URL scheme is in `app.json` `CFBundleURLSchemes`.

**One-time console setup:**
1. **Firebase Console → Authentication → Sign-in method**
   - **Google** → Enable → set a "Project support email" → Save. (OAuth client auto-exists.)
   - **Apple** → Enable → Save. For iOS-native, the toggle is enough — leave the "Services ID /
     OAuth code flow" fields blank (those are only for web/Android Apple flows).
2. **Apple Developer → Certificates, Identifiers & Profiles → Identifiers →** the App ID
   `com.appsoftlanding.com` → Capabilities → enable **Sign In with Apple** → Save. (EAS can enable this
   automatically during the build if you let it manage your Apple account.) No Services ID / `.p8` key
   needed for iOS-only.
3. **(Optional) Google web client id** — Google Cloud Console → APIs & Services → Credentials → copy
   the "Web client (auto created by Google Service)" id → `.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

**Env keys** (`.env`):
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<iOS client id>.apps.googleusercontent.com
EXPO_PUBLIC_REVERSED_CLIENT_ID=com.googleusercontent.apps.<iOS client id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<optional web client id>
```

**Build & test (preview, iOS):**
1. Provide the `EXPO_PUBLIC_*` vars to EAS (`eas.json` → `build.preview.env`, or `eas env:create`) —
   EAS builds do **not** read your gitignored `.env`, so an undefined Firebase config will break the app.
2. `npx eas-cli login` → `npx eas-cli build --profile preview --platform ios` (approve the Apple
   prompts; EAS provisions the Sign-in-with-Apple capability + provisioning profile).
3. Install on the device → test both buttons → confirm new users appear in
   **Firebase → Authentication → Users** with `apple.com` / `google.com` providers.

---

## Quick-start checklist

To make the app fully production-ready, complete these in order:

- [ ] Add RevenueCat API keys to `.env`
- [ ] Initialize RevenueCat in `src/services/revenuecat.ts`
- [ ] Create products in App Store Connect (`softlanding_monthly`, `softlanding_annual`)
- [ ] Link products in RevenueCat dashboard
- [ ] Enroll Apple Developer account ($99)
- [ ] Enable Google + Apple providers in Firebase → Authentication → Sign-in method
- [ ] Enable "Sign In with Apple" capability on the App ID (`com.appsoftlanding.com`)
- [ ] Add `EXPO_PUBLIC_*` vars to the EAS build env (eas.json `build.preview.env` or `eas env:create`)
- [ ] Run `eas build --profile preview --platform ios`
- [ ] Test subscription flow in sandbox
- [ ] Fill in `eas.json` submit section (Team ID, ascAppId)
- [ ] Run `eas submit --platform ios` for App Store
