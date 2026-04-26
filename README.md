# Soft Landing

A faith-based emotional check-in app for iOS and Android. Open the app, pick how you're feeling, tap the wax-sealed envelope that floats in, and receive a Bible verse selected for that emotion. Swipe right to save it, left to skip to the next one.

Built with React Native + Expo, TypeScript strict, NativeWind, React Native Reanimated, Firebase Auth, and Firebase Cloud Functions backed by Claude Sonnet 4.6.

## What it does

1. **Welcome** — Animated cross with soft white glow + ripple rings. Register, Sign In, or How It Works
2. **How It Works** — Scrollable editorial guide: four labelled sections (Check In, Your Verse, Your Collection, Letters) in warm prose. "Begin →" enters the check-in flow
3. **Register / Sign In** — Email + password or Google Sign-In. Email verification required before first use
4. **Onboarding** — 2-slide intro shown once after first registration
5. **Onboarding profile** — 3-question profile (faith background, intent, life stage); Design A "Candlelight" aesthetic
6. **Faith intro** — Amber cross + "Find rest in His Word." shown once after onboarding
7. **Home** — Time-based greeting with user's name, single Check In button
8. **Emotion picker** — Five full-width cards: Stressed, Tired, Sad, Neutral, Good
9. **Envelope** — Candle wax-sealed card floats in, tap to open
10. **Verse** — NIV Bible verse in Lora serif; swipe right to save, left to skip. New verse loads immediately
11. **History** — All saved verses with scripture reference, AI letter, and Share button
12. **Settings** — Notifications toggle, subscription status, Start over
13. **Paywall** — Shown when free tier (10/day) is reached; Monthly $4.99 / Annual $34.99

## Prerequisites

- **Node 20** (use `nvm` / `volta` / `fnm` to pin)
- **pnpm** (`npm install -g pnpm`)
- **Expo CLI** (`pnpm add -g expo`)
- **Expo Go** on a physical device — or iOS Simulator (Xcode) / Android Emulator (Android Studio)
- **Firebase project** with Email/Password and Google Sign-In enabled

## Setup

```bash
git clone <repo-url> soft-landing
cd soft-landing/app-frontend
pnpm install
cp ../.env.example .env   # fill in Firebase + RevenueCat keys
pnpm exec expo start --clear
```

Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with Expo Go on a real device.

## Environment variables

Copy `.env.example` and fill in your values:

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Web app |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Same |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Same |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | `GoogleService-Info.plist` → `CLIENT_ID` |
| `EXPO_PUBLIC_REVERSED_CLIENT_ID` | `GoogleService-Info.plist` → `REVERSED_CLIENT_ID` |

RevenueCat integration is wired in types and constants — SDK init requires `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY` (pending before App Store submission).

## Project structure

```
soft-landing/
├── app-frontend/          # Expo app
│   ├── app/               # Expo Router file-based routes
│   │   ├── (tabs)/        # Home, History, Settings tabs
│   │   ├── check-in/      # Emotions → Envelope → Message → Session Summary → Letter flow
│   │   ├── welcome.tsx    # Combined splash + auth entry point
│   │   ├── tour.tsx       # "How It Works" editorial guide for new visitors
│   │   ├── sign-in.tsx    # Email/password + Google sign-in
│   │   ├── register.tsx   # Account creation with email verification
│   │   ├── verify-email.tsx
│   │   ├── onboarding.tsx
│   │   ├── onboarding-profile.tsx  # 3-question profile (Design A Candlelight)
│   │   ├── onboarding-disclaimer.tsx
│   │   ├── faith-intro.tsx
│   │   └── paywall.tsx
│   ├── src/
│   │   ├── constants/     # Design tokens, emotion catalog
│   │   ├── messages/      # catalog.json — 150 NIV verses (30 per emotion)
│   │   ├── services/      # firebase.ts, auth.ts, checkIn.ts, notifications.ts
│   │   ├── storage/       # AsyncStorage typed wrappers
│   │   └── types/         # All TypeScript interfaces
│   └── __tests__/         # Vitest unit tests
├── app-backend/           # Firebase Cloud Functions — AI letter generation via Claude Sonnet 4.6
├── app-qa/                # Maestro end-to-end flows
└── docs/                  # ARCHITECTURE, DECISIONS, CHANGELOG, bugs.json
```

## Running tests

```bash
cd app-frontend
pnpm exec vitest run
```

## Dev dashboard

```bash
cd app-frontend
pnpm exec expo start --web
```

Open `http://localhost:8081/dashboard` (dev/web only).

## Current build state (v1.4.0)

- Full auth flow: register, sign in (email + Google), email verification, guest mode
- Firebase Auth with AsyncStorage persistence — users stay signed in across restarts
- 150 NIV Bible verses, 30 per emotion, free/premium split (15 each)
- "How It Works" editorial guide for new visitors: scrollable, four labelled sections, fixed Begin → button
- Onboarding profile (3 questions, Design A Candlelight): saves faith background, intent, life stage
- **AI letter generation fully working**: Firebase Cloud Function → Claude Sonnet 4.6; first letter free, then premium
  - `ANTHROPIC_API_KEY` stored in Firebase Secret Manager and correctly declared in `onCall()` options
  - 4-layer personalization: questionnaire answers → emotion arc → verse anchor → user's typed input
  - User input positioned first in prompt for maximum Claude weighting
  - Verse engagement rule: Claude engages specific words/imagery, not just "a verse arrived"
  - Letters auto-saved immediately after generation — no manual Save tap required
- Crisis input filtering and Firestore security rules deployed to backend
- All screens functional end-to-end in Expo Go
- EAS projectId: `2d79e638-f797-42ff-86b3-94f5c20fa6ff`
- GitHub Actions CI: `tsc --noEmit` + `vitest run` + Expo web export on every push

### Known pre-ship blockers
- **BUG-010**: Paywall purchase buttons are no-ops — RevenueCat integration required
- **BUG-011**: Verse anti-repetition system non-functional — usageCount not persisted
- **BUG-014**: `canCheckIn()` bypass must be re-enabled before App Store submission

## Submitting to TestFlight

```bash
cd app-frontend
pnpm exec eas build --profile preview --platform ios
```

Requires an Apple Developer account and EAS credentials configured.

## Agent team

Built collaboratively by a five-agent team — **frontend**, **data**, **security**, **tester**, and **docs**. Each agent owns a non-overlapping slice of the repo. See [`CLAUDE.md`](./CLAUDE.md) for the ownership map and commit conventions. All discovered bugs are documented in [`docs/bugs.json`](./docs/bugs.json).
