# Soft Landing

A faith-based emotional check-in app for iOS and Android. Open the app, pick how you're feeling, tap the wax-sealed envelope that floats in, and receive a Bible verse selected for that emotion. Swipe right to save it, left to skip to the next one. Local-first; no account required.

Built with React Native + Expo, TypeScript strict, NativeWind, and React Native Reanimated.

## What it does

1. **Splash** — Animated cross + brand name on every cold launch
2. **Onboarding** — 2-slide intro (shown once)
3. **Faith intro** — Amber cross + "Find rest in His Word." (shown once after onboarding)
4. **Home** — Time-based greeting, single Check In button
5. **Emotion picker** — Five full-width cards: Stressed, Tired, Sad, Neutral, Good
6. **Envelope** — Candle wax-sealed card floats in, tap to open
7. **Verse** — NIV Bible verse in Lora serif; swipe right to save, left to skip. New verse loads immediately — no return to home
8. **History** — All saved verses with scripture reference and a Share button
9. **Paywall** — Shown when free tier (10/day) is reached; Monthly $4.99 / Annual $34.99

## Prerequisites

- **Node 20** (use `nvm` / `volta` / `fnm` to pin)
- **pnpm** (`npm install -g pnpm`)
- **Expo CLI** (`pnpm add -g expo`)
- **Expo Go** on a physical device — or iOS Simulator (Xcode) / Android Emulator (Android Studio)

## Setup

```bash
git clone <repo-url> soft-landing
cd soft-landing/app-frontend
pnpm install
cp ../.env.example ../.env   # fill in RevenueCat keys when available
pnpm exec expo start
```

Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with Expo Go on a real device.

## Project structure

```
soft-landing/
├── app-frontend/          # Expo app
│   ├── app/               # Expo Router file-based routes
│   │   ├── (tabs)/        # Home, History, Settings tabs
│   │   ├── check-in/      # Emotions → Envelope → Message flow
│   │   ├── splash.tsx     # In-app branded splash
│   │   ├── onboarding.tsx
│   │   ├── faith-intro.tsx
│   │   └── paywall.tsx
│   ├── src/
│   │   ├── constants/     # Design tokens, emotion catalog
│   │   ├── messages/      # catalog.json — 25 NIV verses (5 per emotion)
│   │   ├── services/      # checkIn.ts — canCheckIn, performCheckIn, bookmarkMessage
│   │   ├── storage/       # AsyncStorage typed wrappers
│   │   └── types/         # All TypeScript interfaces
│   └── __tests__/         # Vitest unit tests
├── app-backend/           # Reserved for V2 cloud sync — unused in V1
├── app-qa/                # Maestro end-to-end flows
└── docs/                  # ARCHITECTURE, DECISIONS, CHANGELOG, bugs.json
```

## Running tests

```bash
cd app-frontend
pnpm exec vitest run        # Vitest unit suites
```

## Dev dashboard

An in-app browser inspector for message library coverage, verse preview, and subscription mocks.

```bash
cd app-frontend
pnpm exec expo start --web
```

Then open `http://localhost:8081/dashboard` (only visible in web/dev mode).

## Environment variables

Secrets are not committed. See [`.env.example`](./.env.example) for the full list. RevenueCat integration is wired in but the SDK is not initialized until you add `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY` to your `.env`.

## Current build state (v1.1.0)

- All screens functional end-to-end in Expo Go
- 25 NIV Bible verses, weighted random selection with anti-repetition
- AsyncStorage v2.1.2 (Expo Go compatible)
- EAS projectId: `2d79e638-f797-42ff-86b3-94f5c20fa6ff`
- RevenueCat: types and constants wired, SDK init pending (needs API keys)
- GitHub Actions CI: `tsc --noEmit` + `vitest run` + Expo web export on every push

## Submitting to TestFlight

```bash
cd app-frontend
pnpm exec eas build --profile preview --platform ios
```

Requires an Apple Developer account and EAS credentials configured.

## Agent team

This project is built collaboratively by a five-agent team — **frontend**, **data**, **security**, **tester**, and **docs**. Each agent owns a non-overlapping slice of the repo. See [`CLAUDE.md`](./CLAUDE.md) for the ownership map and commit conventions.
