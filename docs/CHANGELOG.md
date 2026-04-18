# Changelog

All notable changes to Soft Landing will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
