# Changelog

All notable changes to Soft Landing will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-04-18

### Added
- **Bible verse pivot**: Replaced 25 generic validating messages with NIV Bible verses (5 per emotion). Each verse includes a scripture reference (e.g., "Psalm 34:18") displayed in amber below the verse body.
- **Faith intro screen**: One-time screen shown after onboarding — amber cross, "Find rest in His Word." tagline in Lora italic, amber Begin button. Saved to `faithIntroComplete` in AppSettings.
- **In-app splash screen** (`splash.tsx`): Branded launch screen with animated amber cross spring-in and "Soft Landing" / "Find rest in His Word." fade-in. Runs on every cold launch before home screen.
- **Continuous verse flow**: After swiping on the message screen, a new verse slides in from the opposite side without returning to Home. Users stay in a verse flow until they tap Done or ×.
- **Swipe gestures on message screen**: Swipe right = Save + next verse, Swipe left = Skip + next verse. Tinder-style indicator badges animate in during swipe. SWIPE_THRESHOLD = 110px.
- **Candle wax seal envelope**: Redesigned envelope as a sealed card (CARD_WIDTH=85%, CARD_HEIGHT=370). Wax seal component with 8 drip blobs, candle-light highlight, embossed cross. Seal pulses on tap before navigation.
- **Scripture reference in history**: Saved verses in the history screen now show the scripture reference in amber. Each saved verse has a Share button (native share sheet).
- **Free tier raised to 10 check-ins/day** (up from 3).

### Fixed
- Double-splash flicker: reduced `_layout.tsx` minDelayDone timer from 1800ms to 200ms — splash.tsx now fully owns branded splash timing (BUG-007)
- `transitioning` stuck true when paywall pushed from `loadNextVerse` — reset before routing (BUG-001)
- Save/discard indicator badges on wrong sides — swapped to match swipe direction (BUG-002)
- `transformOrigin` removed from envelope fold creases (not supported in React Native) (BUG-003)
- Envelope error state: added Go Home escape when `performCheckIn` throws (BUG-004)
- Duplicate `FREE_CHECKINS_PER_DAY` constant in `theme.ts` — synced to 10 (BUG-005)
- Duplicate `"fetch"` in `UIBackgroundModes` in `app.json` (BUG-006)
- Unused `Dimensions` import removed from `onboarding.tsx` (BUG-008)
- `emotions.tsx` paywall navigation changed from `replace` to `push` so back returns to emotion picker (BUG-009)

## [1.0.0] — 2026-04-18

### Added

**Foundation (Phase 0)**
- Project skeleton: `app-frontend/`, `app-backend/` (reserved), `app-qa/`, `docs/`
- Agent team established with non-overlapping file ownership (frontend, data, security, tester, docs)
- Core TypeScript types: `EmotionId`, `Message`, `CheckInEvent`, `SavedMessage`, `AppSettings`, `SubscriptionState`
- Design tokens: colors, typography, spacing, radius, shadow, animation constants
- Emotion catalog: 5 emotions with brand colors (stressed, tired, sad, neutral, good)
- Security policy (`SECURITY.md`), environment variable template (`.env.example`), Phase 3 review checklist
- Bug tracker schema (`docs/bugs.json`)
- Live agent status dashboard (`scripts/dashboard-server.js`) on port 3131

**Expo Project (Phase 0)**
- Expo SDK 54, Expo Router v6, React Native 0.81.5
- NativeWind v4 with `babel.config.js`, `metro.config.js`, and `tailwind.config.js`
- DM Sans (UI) + Lora (messages) via `expo-google-fonts`
- Full screen suite: Home, Emotions, Envelope, Message, History, Settings, Paywall, Onboarding, Dashboard (dev)
- Tab navigation: Home ✦ / Saved ☆ / Settings ◎

**Data Layer (Phase 1)**
- 25 hand-written validating messages (5 per emotion, free tier)
- Weighted random message selector with 48-hour anti-repetition penalty
- AsyncStorage typed service layer: settings, check-in events, saved messages
- Daily quota counter: resets at device midnight, enforces 3 free check-ins/day
- `checkIn.ts` service: `canCheckIn()`, `performCheckIn()`, `bookmarkMessage()`

**Core Flow (Phase 1–2)**
- Emotion picker: vertical full-width card stack, haptic on tap
- Envelope screen: spring fly-in, idle bob loop (6s), "Tap to open" fade-in at 1.2s
- Envelope open animation: flap rotates -180°, letter slides up, screen fades before navigating
- Message reveal: card springs up from below, Lora serif body text
- Save (☆→★) with success haptic, share via native share sheet, dismiss (×)
- History screen: saved messages with date, empty state, swipe-to-delete
- Paywall: Monthly ($4.99) / Annual ($34.99), no guilt language, redirects on free-tier limit
- Onboarding: 2-slide animated flow with dot indicators, saves `onboardingComplete` to storage

**Polish (Phase 3)**
- Entrance animations on Home (greeting + button fade/spring)
- Haptics throughout: emotion tap (Light), envelope open (Medium), save (Success)
- Full accessibility: `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`, enlarged `hitSlop`
- Dark mode color tokens in Tailwind config
- Settings screen: subscription status, Upgrade CTA, haptics toggle, notification toggle

**Production Readiness (Phase 4)**
- `eas.json`: development (simulator), preview (internal distribution), production (App Store / Play Store)
- `app.json`: notification permissions, build numbers, Android permissions
- GitHub Actions CI: TypeScript check + Vitest + Expo web export check on every push/PR

### Fixed
- Black screen on launch: removed AsyncStorage gate from root layout render guard
- Onboarding redirect loop: module-level `onboardingChecked` flag prevents re-redirect when AsyncStorage is unavailable
- AsyncStorage `native module is null`: downgraded from v3.0.2 → v2.1.2 (Expo Go compatible)
- Babel bundling error: moved `nativewind/babel` from `plugins` to `presets` (it returns preset format)
- NativeWind styles not applying: added missing `babel.config.js` with `jsxImportSource: 'nativewind'`

### Security
- All storage operations wrapped in try/catch — storage failures are non-fatal throughout
- RevenueCat entitlement check is the single gating point for premium features
- `.env.example` documents all required secrets; actual `.env` is gitignored
- `SECURITY.md` documents data classification, storage rules, and dependency policy
