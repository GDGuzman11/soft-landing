# Soft Landing — Pre-Launch Master To-Do

Organized into two phases: what can be done **right now** without any paid
developer accounts, and what becomes unlocked **after** credentials are in hand.
A security section covers both phases with honest gap analysis against what's
already built.

*Last updated: v1.9.0 — 2026-05-13*

---

## PHASE 1 — Do Now (No Developer Accounts Required)

### Code Cleanup

- [ ] **Delete orphaned `onboarding.tsx`** — the 2-slide generic carousel was
  removed from the post-signup funnel in v1.9.0 (replaced by `onboarding-guide.tsx`)
  but the file still lives in `app-frontend/app/`. Remove it and confirm no
  remaining imports or routes reference it.

- [ ] **Decide fate of pre-signup "How It Works" tour** — the fake-data tour
  (tour mode in `history.tsx`, `letter-compose.tsx`, `message.tsx`, and the
  `tourMode` param chain) is complex to maintain. Now that a real post-signup
  guide exists, consider whether the pre-signup tour still earns its weight.
  Options: keep it as a lightweight editorial scroll (`tour.tsx`), simplify to
  static screenshots, or remove entirely. **Make this decision before TestFlight.**

- [ ] **`hasCompletedFirstRealCheckIn` field** — added to `AppSettings` in v1.9.0
  but currently unused. Either wire it up to gate a first-session feature, or
  remove it from `types/index.ts` and `DEFAULT_SETTINGS` to keep the schema clean.

### App Config & Metadata

- [ ] **Add `NSPhotoLibraryUsageDescription` to `app.json`** — CRITICAL.
  The profile photo picker (`profile.tsx` → `ImagePicker.requestMediaLibraryPermissionsAsync`)
  requires this key or iOS will crash when the user taps "Add Photo."
  Apple will also reject the binary without a usage description. Add to
  `app.json → expo.ios.infoPlist`:
  ```json
  "NSPhotoLibraryUsageDescription": "Soft Landing uses your photo library so you can set a profile picture."
  ```

- [ ] **Sync version string with `app.json`**
  `app.json` still reports an old version; `profile.tsx` hardcodes a stale string.
  Current version is `1.9.0`. Set it once in `app.json`, then replace the
  hardcoded string in `profile.tsx` with `Constants.expoConfig?.version` from
  `expo-constants`.

- [ ] **Create a proper splash screen image** — `app.json` points `splash.image`
  at `./assets/images/icon.png`. The splash screen and the app icon are showing
  the same asset, which looks unfinished. Design a dedicated splash (1284×2778px
  safe zone) that matches the warm off-white brand.

- [ ] **`supportsTablet: false`** in `app.json` is set, which is fine for launch,
  but confirm the iPad layout does not look broken if a user somehow runs it on
  one. Consider adding `requiresFullScreen: true` as extra protection.

### Legal Screens (Blocks App Store Submission)

- [ ] **Host Privacy Policy at a public URL** — `docs/privacy-policy.html` exists
  but is not live. Host it via GitHub Pages, Netlify, or Vercel. The URL is
  required in App Store Connect and Google Play Console before you can submit.

- [ ] **Host Terms of Use at a public URL** — same as above for `docs/terms.html`.

- [ ] **Wire Privacy Policy in-app** — `settings.tsx:350` shows
  `Alert.alert('Coming soon')`. Replace with an in-app WebView or
  `Linking.openURL()` pointing to the hosted URL.

- [ ] **Wire Terms of Use in-app** — `settings.tsx:326`, same fix.

### Account Deletion (Apple Compliance — Required Since June 2022)

- [ ] **Server-side Firebase account deletion** — `settings.tsx` → "Delete account"
  calls `clearAllData()` + `signOutUser()` but does NOT delete the Firebase Auth
  user record. Apple will reject if "Delete account" only clears local storage.
  Add a Cloud Function (Firebase Admin SDK `admin.auth().deleteUser(uid)`) and
  call it from the settings screen before signing out. Also delete the user's
  `letterUsage` Firestore document in the same call.

### Feature Gates (Bypassed — Must Close Before Launch)

- [ ] **Re-enable AI letter gate** — `letter-compose.tsx:73`
  `const canUseLetter = true` bypasses the gate entirely. Restore to:
  `const canUseLetter = isPremium || !settings.firstLetterUsed`
  Only flip this after you've confirmed the paywall purchase flow works end-to-end.

- [ ] **Re-enable check-in quota** — `checkIn.ts` → `canCheckIn()` always
  returns `true` (BUG-014). Restore after RevenueCat entitlement sync is wired
  so paid users aren't falsely capped.

### Paywall Design — Plan with Claude First

- [ ] **Design the paywall together before building it** — current assumptions:
  - Free: 10 check-ins/day · 25 verses/emotion · 1 AI letter
  - Premium: unlimited check-ins · 50 verses/emotion · unlimited AI letters
  Open questions: are sub-emotions premium? Widget access? Notification time
  customization? History export? **Tag Claude to design the full paywall flow
  and decide the exact tier boundaries before wiring real purchase logic.**

### Settings UX Gap

- [ ] **Notification time picker** — `settings.tsx` shows "Reminder set for 8:00 AM"
  with no way to change it. The time is hardcoded to `08:00` as the default.
  Add a time picker (e.g. `@react-native-community/datetimepicker`) so users
  can choose their own reminder time. Currently `scheduleDaily()` in
  `notifications.ts` already accepts any `HH:mm` string — the UI is the only gap.

### Firebase Account Tasks (Do Now — No Apple/Google Dev Account Needed)

- [ ] **Restrict Firebase API key in Google Cloud Console**
  `EXPO_PUBLIC_FIREBASE_API_KEY` is bundled into the client binary. Anyone who
  decompiles the app can read it. Go to Google Cloud Console → APIs & Services
  → Credentials → your API key → "Application restrictions" → restrict to
  iOS bundle ID `com.softlanding.app` and Android package `com.softlanding.app`.
  This prevents the key from being used outside your app.

- [ ] **Enable Firebase App Check**
  Without App Check, anyone who obtains the Firebase config can query Firestore
  or call your Cloud Functions directly from a script. App Check (using DeviceCheck
  on iOS, Play Integrity on Android) binds requests to a verified app binary.
  Enable in Firebase Console → App Check. Add the `firebase-admin` enforcement
  call in `generateLetter.ts` once enabled.

- [ ] **Lock down Cloud Run service** — `generateLetter.ts` sets
  `invoker: 'public'` which means the Cloud Run URL is reachable by raw HTTP
  without a Firebase SDK. The function does check `request.auth`, so anonymous
  calls return `unauthenticated`, but the endpoint is still exposed and hammerable.
  Change `invoker` to `'private'` (or remove it, which defaults to private in v2):
  ```ts
  export const generateLetter = onCall(
    { region: 'us-central1', secrets: ['ANTHROPIC_API_KEY'] },
    ...
  )
  ```
  Firebase SDK clients will still work — only raw HTTP to the Cloud Run URL is blocked.

- [x] **Deploy Firestore security rules** — deployed in v1.3.0 (deny-all baseline)
  and updated in v1.5.0 (verse reads gated behind Firebase Auth, writes blocked).
  Re-deploy if `firestore.rules` changes.

- [ ] **Set up Firebase billing alert** — AI letter generation incurs Anthropic
  API costs through the Cloud Function. Go to Google Cloud Console → Billing →
  Budgets & alerts and set a monthly budget (e.g. $50) so you get emailed
  before costs spiral.

- [ ] **Add `letterUsage` collection index** — if Firebase Console shows an
  index warning for the `letterUsage` collection (used by `rateLimit.ts`),
  create the composite index it requests. The rate limiter uses a single-document
  read with no complex queries, so this may not be needed, but verify.

### Security Audit (Do Before TestFlight)

- [ ] **Run `pnpm audit`** in both `app-frontend/` and `app-backend/functions/`.
  Resolve any critical or high-severity CVEs before submitting to any store.

- [ ] **Grep for hardcoded secrets**:
  ```bash
  grep -rn "AIza\|sk-ant\|appl_\|goog_\|Bearer " app-frontend/src app-backend/functions/src
  ```
  Should return zero results. If anything appears, move it to `.env` or Secret Manager.

- [ ] **Confirm `.env` is gitignored** — run `git status` and verify `.env` does
  not appear in tracked files.

- [ ] **AsyncStorage encryption gap** (BUG-027) — `settings.subscription.tier`
  is stored in plain AsyncStorage. On a jailbroken device a user could edit it
  to `'premium'` and bypass the paywall. Mitigation: always re-validate the
  entitlement from RevenueCat on app launch (the listener in `purchases.ts`
  handles this when wired) and never trust local tier alone for server-side
  decisions. For the client side, accept this risk for v1 and document it.

### Widgets — Go/No-Go Decision

- [ ] **Decide widgets scope before App Store submission** — the Widgets tab
  previews 4 designs (SoftOpen, CarriedVerse, DoorOpen, LineThatStayed) but
  they are in-app previews only, not real iOS WidgetKit extensions. Choose one:
  - **Ship as-is**: rename tab to "Widget Preview" and add a "Coming soon"
    note so users aren't confused about why they can't add them to their home screen.
  - **Cut the tab**: remove from `(tabs)/_layout.tsx` for v1.
  - **Build real widgets**: large scope — needs a native extension target, shared
    App Group for data, and separate EAS config. Treat as a v2 milestone.

### Crash Reporting

- [ ] **Add Sentry (or Expo's built-in crash reporter)** — currently nothing
  captures production crashes. Without this you're flying blind after launch.
  Sentry's React Native SDK integrates with Expo. Add before TestFlight so you
  can catch issues from beta testers. Keep DSN key in `.env` (not hardcoded).

### Analytics (Decide Scope)

- [ ] **Decide on analytics before launch** — there is no analytics SDK currently.
  If you add one (PostHog, Mixpanel, etc.), update the Privacy Policy to disclose
  it and add a consent prompt if targeting EU users (GDPR). If you choose not to
  add analytics, that's a valid choice — document it in the Privacy Policy.

---

## PHASE 2 — After Developer Credentials

### Apple Developer Account ($99/yr)

- [ ] **Join Apple Developer Program** — unlocks everything below.

- [ ] **Create App ID** for bundle `com.softlanding.app` in Apple Developer portal.
  Enable capabilities: Push Notifications, Sign in with Apple.

- [ ] **Create App Store Connect app record** — required before any TestFlight
  or App Store submission.

- [ ] **Fill in `eas.json` submit section**:
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

- [ ] **Upload APNs certificate to Firebase** — Firebase Console →
  Project Settings → Cloud Messaging → iOS app → upload the `.p8` or `.p12`
  APNs key. Required for remote push notifications.

- [ ] **Upload APNs key to EAS** — run `eas credentials`, select iOS → your app → upload/generate APNs Authentication Key (`.p8`). Required for Expo Push Notifications to deliver on real iOS devices. Without this, `getExpoPushTokenAsync()` succeeds but notifications never arrive.

- [ ] **Enable Apple Sign-In in Firebase Authentication** — Firebase Console →
  Authentication → Sign-in method → Apple. Provide the Team ID and Service ID.

- [ ] **Download `GoogleService-Info.plist`** from Firebase Console → Project
  Settings → Your apps → iOS app. This file goes in `app-frontend/` (gitignored).
  EAS and Expo use it for Firebase SDK initialization on iOS. Currently the app
  initializes Firebase via `.env` variables — confirm the chosen approach is
  consistent.

### RevenueCat (Subscriptions)

- [ ] **Create RevenueCat project** linked to App Store Connect and Play Console.

- [ ] **Create subscription products in App Store Connect**:
  - Monthly: `soft_landing_monthly` at $4.99/month
  - Annual: `soft_landing_annual` at $34.99/year
  Import both into RevenueCat → Entitlement `premium`.

- [ ] **Set RevenueCat API keys in `.env`**:
  - `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_...`
  - `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_...`

- [ ] **Restrict RevenueCat API keys** — in the RevenueCat dashboard, restrict
  each key to only your app's bundle ID / package name. This prevents the
  public key (bundled in the binary) from being used in other apps.

- [ ] **Wire entitlement listener** (BUG-026) — `purchases.ts`:
  ```ts
  Purchases.addCustomerInfoUpdateListener(async (info) => {
    const isPremium = !!info.entitlements.active['premium']
    const settings = await getSettings()
    await saveSettings({
      ...settings,
      subscription: { ...settings.subscription, tier: isPremium ? 'premium' : 'free' }
    })
  })
  ```

- [ ] **Wire paywall purchase buttons** — `paywall.tsx`: replace both
  `Alert.alert('Coming soon')` handlers with real `Purchases.purchasePackage()` calls.

- [ ] **Add Restore Purchases button** — `paywall.tsx`: Apple requires this on
  every paywall screen. Use `Purchases.restorePurchases()`.

- [ ] **Re-enable check-in quota** (BUG-014) after entitlement listener is wired.

### Google Sign-In OAuth Client ID

- [ ] **Create iOS OAuth 2.0 client** in Google Cloud Console → APIs & Services
  → Credentials. Bundle ID must match `com.softlanding.app`. Set the value in:
  `.env` → `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
  The `CFBundleURLSchemes` in `app.json` already has a Google URL scheme configured
  (`com.googleusercontent.apps.780566026276-...`) — verify this matches the credential you create.

### App Store Connect — Metadata & Submission

- [ ] **App Store screenshots** — required sizes: 6.7" iPhone (1290×2796 or
  1320×2868). Apple also wants 6.1" and 5.5" in practice for older devices.
  At minimum 3 screenshots per size. Show: home → emotion picker → envelope →
  message reveal → letter. Use real device or Xcode simulator.

- [ ] **App icon** — `icon.png` exists. Verify it is 1024×1024px, no transparency,
  no rounded corners (App Store adds rounding). Check with the validator at
  `eas build` time.

- [ ] **Short description** (170 chars max for App Store subtitle) — write
  something like: "Daily check-ins. Scripture for where you are."

- [ ] **Full description** (4000 chars) — write the App Store listing copy
  covering the emotion → envelope → verse flow, AI letters, faith context.

- [ ] **Keywords** (100 chars) — research and pack: daily verse, devotional,
  faith, emotional wellness, Christian, check-in, encouragement, Bible.

- [ ] **Primary category** — Health & Fitness or Lifestyle or Book. Secondary
  category optional. Research competitor placement.

- [ ] **Age rating questionnaire** — complete in App Store Connect. The app
  has no violence, no adult content. Religious content: yes. AI-generated text:
  yes. Expected rating: 4+ or 9+.

- [ ] **Privacy nutrition label** — complete App Store Connect data practices
  form. Honest answers: data collected (email for auth, name, no health data
  sent to Apple), data linked to user (yes — email), used for third-party
  advertising (no). The fact that AI letter text is generated server-side does
  not automatically mean the mood data is "sold" — but document it clearly.

- [ ] **Support URL** — need a working support page or email alias (e.g.
  `support@softlanding.app`) before submission. A simple contact form or
  mailto link on your hosted site works.

- [ ] **What's New** text — write v1.0.0 release notes before first submission.

- [ ] **Pricing and availability** — set in App Store Connect. Free download
  with in-app purchase.

- [ ] **Submit preview build to TestFlight**:
  ```bash
  eas build --profile preview --platform ios
  ```

- [ ] **Sandbox purchase test** — create a Sandbox Tester account in App Store
  Connect, use it on a real device to run through the full subscribe → letter →
  tier upgrade flow before submitting for App Review.

- [ ] **App Review submission** — first review often takes 1–3 days. Prepare a
  short demo note for reviewers explaining the faith context and AI letter feature.

### Google Play — Metadata & Submission

- [ ] **Register Google Play Developer account** ($25 one-time).

- [ ] **Create Android app record** in Play Console with package `com.softlanding.app`.

- [ ] **Download `google-services.json`** from Firebase Console → Android app.
  Place in `app-frontend/` (gitignored).

- [ ] **Configure SHA-1 fingerprint** — run `eas credentials` to get the Android
  keystore SHA-1 hash, add it to the Android OAuth 2.0 client in Google Cloud
  Console for Google Sign-In to work on Android.

- [ ] **Feature graphic** — 1024×500px, required for the Play Store listing.
  Design one that matches the warm off-white / amber brand.

- [ ] **Screenshots** — minimum 2 phone screenshots (portrait). Same captures
  used for iOS work here.

- [ ] **Short description** (80 chars), **Full description** (4000 chars) —
  can reuse App Store copy with minor edits.

- [ ] **Content rating questionnaire** (IARC) — complete in Play Console.
  Answer questions about violence, sexual content, profanity (all: none),
  religion (yes), AI-generated content (yes).

- [ ] **Data safety form** — Google Play equivalent of Apple's privacy nutrition
  label. Disclose: account info (email) collected, linked to user, not shared
  with third parties for advertising.

- [ ] **Permission declarations** — `RECEIVE_BOOT_COMPLETED` (notifications) and
  `VIBRATE` are declared in `app.json`. Add a short justification for each in the
  Play Console store listing form.

- [ ] **Target API level** — must target Android 14 (API 34) or higher for new
  apps in 2025. Expo SDK 52+ handles this. Verify with `eas build` output.

- [ ] **Set `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`** and wire purchase flow.

- [ ] **Submit Android build**:
  ```bash
  eas build --profile production --platform android
  eas submit --platform android
  ```

---

## Security Posture Summary

### Already Built (Good)

| Feature | Where | Status |
|---|---|---|
| Auth check before AI letter | `generateLetter.ts:53` | ✅ Required Firebase Auth |
| Input validation (all fields) | `generateLetter.ts:15–49` | ✅ Whitelist + length limits |
| Prompt injection filter | `inputFilter.ts` | ✅ SQL, NoSQL, injection, code, path traversal, base64/ROT13 |
| Crisis keyword detection | `crisisKeywords.ts` | ✅ Routes to prompt instead of letter |
| AI rate limiting | `rateLimit.ts` | ✅ 20 letters/hour per UID, Firestore transaction |
| Anthropic API key | Firebase Secret Manager | ✅ Never in client binary |
| Firebase auth error sanitization | `auth.ts → wrapAuthError` | ✅ Only `.code` exposed |
| Firestore security rules | `firestore.rules` | ✅ Auth-gated reads, writes blocked |
| Export compliance declaration | `app.json → ITSAppUsesNonExemptEncryption: false` | ✅ |
| Email verification gate | `verify-email.tsx` | ✅ Blocks app access until verified |

### Needs to Be Fixed Before Launch

| Gap | File / Location | Risk | Fix |
|---|---|---|---|
| Cloud Run publicly reachable | `generateLetter.ts:52` `invoker: 'public'` | Medium — auth check stops unauthorized generation but endpoint is hammerable | Remove `invoker` key (defaults to private) |
| Firebase API key unrestricted | Google Cloud Console | Medium — key is bundled in binary; usable outside the app | Restrict to bundle ID in Cloud Console |
| Firebase App Check absent | Firebase Console | Medium — allows Firestore/Cloud Function queries from scripts | Enable App Check (DeviceCheck / Play Integrity) |
| AsyncStorage tier not encrypted | `storage.ts` | Low (client-side only) — jailbroken device can flip to `'premium'` | Accept for v1; server-side AI letter rate limit still enforced |
| canCheckIn() always true | `checkIn.ts:21` (BUG-014) | High (revenue) — no free-tier enforcement | Restore after entitlement listener wired |
| AI letter gate bypassed | `letter-compose.tsx:73` | High (revenue) — unlimited free AI letters | Restore `isPremium \|\| !settings.firstLetterUsed` |
| No server-side account deletion | `settings.tsx:291` | High (App Store compliance) — Apple requires it | Add Cloud Function to delete Firebase Auth user |
| NSPhotoLibraryUsageDescription missing | `app.json` | Critical (will crash + App Store rejection) | Add to `infoPlist` |
| RevenueCat keys unrestricted | RevenueCat dashboard | Low — keys are SDK-intended to be public, but restrict anyway | Restrict to bundle ID in RevenueCat dashboard |
| No crash reporting | — | High (ops) — cannot debug production issues | Add Sentry before TestFlight |

### Google Workspace / Cloud Console Checklist

- [ ] **Restrict Firebase API key** by app bundle ID (see Phase 1 above).
- [ ] **Create Google OAuth 2.0 credentials** (iOS + Android clients) for Google Sign-In.
- [ ] **Set billing budget alert** in Google Cloud Console for Firebase + Cloud Functions spend.
- [ ] **Verify no unused APIs are enabled** in Google Cloud Console for the Firebase project.
- [ ] **Enable Firebase App Check** and enforce on Firestore + Cloud Functions.

---

## Quick Reference — Ordered Dependency Chain

```
    ── Code cleanup ─────────────────────────────────────────────────────
1.  Delete orphaned onboarding.tsx                     ← can do today
2.  Decide fate of pre-signup "How It Works" tour      ← can do today
3.  Resolve hasCompletedFirstRealCheckIn (wire or cut) ← can do today
    ── Config & legal ───────────────────────────────────────────────────
4.  Add NSPhotoLibraryUsageDescription to app.json     ← can do today
5.  Sync version string to 1.9.0 in app.json           ← can do today
6.  Host privacy policy + terms at public URLs         ← can do today
7.  Wire privacy policy + terms links in settings      ← can do today
    ── Security (do before TestFlight) ──────────────────────────────────
8.  Fix server-side account deletion Cloud Function    ← can do today
9.  Lock down Cloud Run (remove invoker: 'public')     ← can do today
10. Restrict Firebase API key in Cloud Console         ← can do today
11. Enable Firebase App Check                          ← can do today
12. [x] Deploy Firestore rules                         ← done (v1.3/1.5)
13. Run pnpm audit, grep for secrets                  ← can do today
14. Add crash reporting (Sentry)                       ← can do today
    ── Product decisions ────────────────────────────────────────────────
15. Paywall design session with Claude                 ← can do today
16. Decide widgets scope (preview / cut / build)       ← can do today
17. Notification time picker UI                        ← can do today
18. Splash screen design                               ← can do today
    ─────── get Apple Developer account ────────────────────────────────
19. Create App ID + App Store Connect record
20. Google Sign-In OAuth client ID
21. Enable Apple Sign-In in Firebase
22. RevenueCat account + products + API keys
23. Wire entitlement listener (BUG-026)
24. Wire paywall purchase + restore buttons
25. Re-enable canCheckIn() quota (BUG-014)
26. Re-enable AI letter gate (letter-compose.tsx)
27. Restrict RevenueCat API key in dashboard
28. Firebase billing budget alert
29. App Store metadata, screenshots, description
30. Age rating + privacy nutrition label
31. TestFlight build → sandbox purchase test
32. App Store submission (1–3 day review)
    ─────── get Google Play Developer account ──────────────────────────
33. Play Console app record, feature graphic
34. SHA-1 fingerprint for Android Google Sign-In
35. Content rating + Data safety form
36. Android build → Play Store submission
```
