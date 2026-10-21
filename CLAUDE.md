# Soft Landing

A premium emotional check-in mobile app. The user opens the app, picks an emotion (stressed / tired / sad / neutral / good), a cream envelope flies in, they tap to open it, and they receive a short human-sounding validating message.

## Working style — read this before doing anything

- **Always enter Plan Mode before implementing.** When given any new feature,
  refactor, or multi-step task — present a written plan and wait for explicit
  approval before writing any code or making changes. No exceptions.
- Ask clarifying questions if the request is ambiguous. Do not assume scope.
- One concern per commit. Conventional commit format required.
- Add bugs to `docs/bugs.json` immediately on discovery.

## Current phase
**Pre-TestFlight — V1.10.** Full app functional end-to-end. Latest: Expo SDK 57 upgrade; Say multi-chat per persona with prior-day check-up openers + first-name personalization; device-local day rollover. Next: wire RevenueCat, re-enable the check-in limit (BUG-014), deploy `deleteUserData`/`scheduledReachOut` (BUG-033), bump functions to Node 22 (runtime decommission 2026-10-30), submit to TestFlight.

## Stack summary
- React Native via **Expo** (managed workflow)
- **Expo Router** for file-based navigation
- **TypeScript** in strict mode
- **NativeWind v4** (Tailwind for React Native)
- **React Native Reanimated** (UI-thread animations, no Lottie)
- **AsyncStorage** for local persistence (local-first, no backend in V1)
- **RevenueCat** for subscriptions ($4.99/month or $34.99/year, 10 free check-ins per day)
- **Vitest** for unit tests, **Maestro** for end-to-end flows
- **pnpm** + **Node 20**

## Agent team roster — file ownership
Every file is owned by exactly one agent. Agents must not edit files outside their list.

| Agent | Owns |
|---|---|
| **frontend** | `app-frontend/**` (screens, components, navigation, animations, NativeWind config, Expo Router routes) |
| **data** | `app-frontend/lib/storage/**`, `app-frontend/lib/messages/**`, `app-frontend/lib/streaks/**`, AsyncStorage schemas, message library JSON |
| **security** | `app-frontend/lib/subscriptions/**` (RevenueCat integration, entitlement checks), `app-frontend/lib/notifications/**`, `.env.example`, secret-handling utilities |
| **tester** | `app-qa/**` (Vitest suites, Maestro flows), `app-frontend/**/*.test.ts(x)` colocated tests, dev dashboard at `app-frontend/app/dashboard.tsx` |
| **docs** | `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/bugs.json` |

`app-backend/**` (Firebase Cloud Functions, Claude integration, prompts, Firestore rules) is owned by **backend-engineer**. Release/config (`eas.json`, `app.json`, `firebase.json`, CI workflows, `firestore.rules`) is owned by **devops-release-lead**. Visual/UX review is **ux-design-guardian**. (The `app-frontend/lib/...` paths in the table above predate the current `app-frontend/src/...` layout — read ownership by area, not literal path.)

## Bug tracker
**Location:** `docs/bugs.json`

**Rule:** every agent adds a bug to `docs/bugs.json` immediately upon discovery — do not defer, do not wait for triage. Use the `Bug` schema documented in that file's surrounding tooling and in `docs/ARCHITECTURE.md`. IDs are sequential `BUG-001`, `BUG-002`, …

## Commit format
Conventional Commits. Allowed prefixes:
- `feat:` new user-visible feature
- `fix:` bug fix
- `docs:` documentation only
- `test:` test code only
- `chore:` tooling, deps, repo plumbing
- `security:` anything touching subscription gating, secrets, permissions, or RevenueCat

One agent's work per commit. Reference a bug ID in the body when relevant (e.g. `closes BUG-014`).

## Key design decisions
- **Name:** Soft Landing — chosen for warmth and the metaphor of being caught
- **Palette:** warm off-white background `#FAF8F5`, amber accent `#C4956A`
- **Fonts:** **DM Sans** for UI clarity, **Lora** for the validating message itself (warmth, serif intimacy)
- **Emotion color map** (envelope tint and accent per state):
  - `stressed` — muted clay `#C97B5A`
  - `tired` — dusty lavender `#9C8FB5`
  - `sad` — soft slate blue `#7A95B0`
  - `neutral` — warm sand `#C4B59A`
  - `good` — gentle sage `#9CB59A`
- **Interaction model:** single-card swipe for the emotion picker (one card visible, card follows finger, flies off at threshold), Reanimated envelope flight, single tap to open

## Active context
*Session 2026-10-20 — V1.10. Expo SDK 54→57 (RN 0.86 / React 19.2 / Reanimated 4.5 / TS 6.0). Say overhauled: sign-up first name injected into the system prompt (used naturally); memory window fixed to most-recent 50 (was oldest-30); multiple discrete chats per persona (`say/{uid}/{personaId}/{chatId}/messages`) with a chat-list page + `[chatId]` threads; new `startSayChat` callable summarizes the prior calendar day and opens a gentle, crisis-safe check-up (once per persona per ~20h), metered 5/60s + 30/day; `generateSayResponse` now takes a required `chatId`. Day rollover fixed to device-local (`localDayKey`). Firestore rules extended for the nested chat-messages path. All deployed to `soft-landing-afe2d` and verified live. Known gaps: RevenueCat unwired (BUG-010/026), check-in limit disabled (BUG-014), `deleteUserData`/`scheduledReachOut` undeployed (BUG-033), Node 20 runtime decommission 2026-10-30. Note: an auto-commit hook writes generic "Update:" commits; this session's work + docs were pushed to origin/master.*

## Current build state
- All screens functional: welcome → (how it works / register / sign-in) → onboarding-disclaimer → onboarding-guide → onboarding-profile → faith-intro → home → emotions → envelope → message (swipe flow) → session-summary → letter-compose → history
- **250 KJV + WEB curated verses** (50 per emotion, 25 free / 25 premium) served from Firestore; 31,102 full-Bible verses imported
- Verse selector: Firestore `where('emotionTags', 'array-contains', emotionId)` with 24h AsyncStorage cache; anti-repetition 48hr penalty window
- Randomized translation per card: each swipe independently shows KJV or WEB (50/50), not both at once
- Firestore security rules: `/verses/{verseId}` read requires auth, write blocked
- Firebase Auth: email/password + Google Sign-In, AsyncStorage persistence, email verification
- "How It Works" screen: scrollable editorial guide (4 labelled sections) for new visitors
- Onboarding profile: 3-question Candlelight design — faith background, intent, life stage
- AI letter generation: Firebase Cloud Function → Claude Sonnet 4.6; ANTHROPIC_API_KEY via Firebase Secret Manager (secrets: ['ANTHROPIC_API_KEY'] declared in onCall options)
- 4-layer prompt personalization: questionnaire answers set tone, emotion builds arc, verse provides anchor, user input shapes first paragraph
- Emotion letter prompts v1.6: identity-first per-emotion anchors + "what you are not" exclusions + Gen Z tone calibration per emotion (heaviest for good/neutral, lightest for sad)
- Em dash prohibited in letters at both system prompt and user prompt levels
- Letters auto-saved immediately after generation (no manual Save tap required)
- Candle wax seal envelope: sealed card with wax seal component, pulse on tap
- Swipe gesture flow: right = save + next verse, left = skip + next verse (continuous)
- **Emotion picker:** single-card swipe — one full-bleed nano illustration card visible at a time (nanohappy/nanoneutral/nanotired/nanosad/nanostressed JPGs); card follows finger, flies off at 70pt threshold; swipe shows warm parchment placeholder (`#EDE6D9`) with breathing ✦ glyph while next image decodes; image + label + tagline fade in together on `onLoad` (`key={emotion?.id}` forces clean remount per swipe); off-screen preloader renders all 5 at `CARD_W × CARD_H` at `left: -9999`; pulsing amber glow shadow; Lora italic emotion label + shimmer ✦; warm brown frame (3pt border, 26pt radius); "Go Home" button centered below dots; order: Good → Neutral → Tired → Sad → Stressed
- **Home screen:** ambient boy (top-left) + girl (bottom-right) background images at 35% opacity, fade in via `withDelay + withTiming` on every tab focus (`useFocusEffect`); icon stamp uses transparent-background version; content layers at `zIndex: 1`
- **Widgets tab:** icon changed to ❖; themed double-line dividers (amber hairline + ✦ centre glyph) between Small / Medium / Large sections
- **History tab:** delete confirmation dialog + 200ms letter expand/collapse fade animation + haptic on delete; ✦ amber glyph in empty state
- **Say AI chat tab:** 4 voice personas (Kind/Still/Steady/Wise) backed by Claude Sonnet 4.6; **multiple discrete chats per persona** (`say/{uid}/{personaId}/{chatId}/messages`, chat-list → thread nav); **most-recent-50 memory window per chat**; **first name injected into the system prompt**, used naturally; **`startSayChat` prior-day check-up opener** — summarizes the persona's previous calendar day and opens gently (once/persona/~20h), crisis-safe (warmth-first 988/741741 if the prior day held crisis content); metering 100/day msgs + 500/day premium + 20/60s burst, chat creation 5/60s + 30/day; crisis keyword routing; ErrorKind per-error UX; Kind question discipline; Steady grounding question; Wise question reinforcement; Still unchanged
- **Dark mode:** all screens now theme-aware via `useTheme()` / `colors.*` inline styles — sign-in, register, onboarding, onboarding-profile, verify-email, letter-compose, envelope, LetterCard, TourTooltip
- **Settings:** haptic feedback on all three toggles (darkMode, notifications, voiceMute)
- **Emotion picker:** haptic fires on committed swipe via `runOnJS`
- **Session summary:** 1.5s "Nothing saved this session." message before auto-routing home when no verses saved
- **Letter compose:** `ActivityIndicator` during verse data load; "Writing your letter…" button state during Claude call
- Expo SDK 57 (RN 0.86, React 19.2, Reanimated 4.5 + worklets 0.10, TypeScript 6.0); AsyncStorage ~2.2
- NativeWind v4 with babel.config.js preset config
- Native share sheet on message reveal + history
- Free tier: 10 check-ins/day; day boundary device-local via `localDayKey()` (streaks + daily count no longer roll at UTC midnight)
- RevenueCat integration: wired in types and constants, SDK init pending (needs API keys in .env)
- EAS Build profiles: development / preview / production in `eas.json`
- EAS projectId populated: 2d79e638-f797-42ff-86b3-94f5c20fa6ff
- GitHub Actions CI on every push: tsc + vitest + expo web export
