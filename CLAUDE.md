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
**Phase 0** — foundation. Repo skeleton, agent ownership map, base documentation, bug tracker, design tokens.

## Stack summary
- React Native via **Expo** (managed workflow)
- **Expo Router** for file-based navigation
- **TypeScript** in strict mode
- **NativeWind v4** (Tailwind for React Native)
- **React Native Reanimated** (UI-thread animations, no Lottie)
- **AsyncStorage** for local persistence (local-first, no backend in V1)
- **RevenueCat** for subscriptions ($4.99/month or $34.99/year, 3 free check-ins per day)
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

`app-backend/` is reserved but unused in V1.

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
*Session 2026-04-30 — V1.7.0. Emotion picker updated with new nano illustration set (5 JPGs). Loading placeholder added: warm parchment card with breathing ✦ shows while the next image decodes; card image + label + tagline reveal together via onLoad. Off-screen preloader fixed to render at full card dimensions. Pre-launch master to-do list created at docs/TODO.md. Next steps: (1) set up RevenueCat with App Store Connect products (API keys in .env), (2) submit to TestFlight via `eas build --profile preview --platform ios`.*

## Current build state
- All screens functional: welcome → (how it works / register / sign-in) → onboarding → onboarding-profile → faith-intro → home → emotions → envelope → message (swipe flow) → session-summary → letter-compose → history
- **250 KJV + WEB curated verses** (50 per emotion, 25 free / 25 premium) served from Firestore; 31,102 full-Bible verses imported
- Verse selector: Firestore `where('emotionTags', 'array-contains', emotionId)` with 24h AsyncStorage cache; anti-repetition 48hr penalty window
- Randomized translation per card: each swipe independently shows KJV or WEB (50/50), not both at once
- Firestore security rules: `/verses/{verseId}` read requires auth, write blocked
- Firebase Auth: email/password + Google Sign-In, AsyncStorage persistence, email verification
- "How It Works" screen: scrollable editorial guide (4 labelled sections) for new visitors
- Onboarding profile: 3-question Candlelight design — faith background, intent, life stage
- AI letter generation: Firebase Cloud Function → Claude Sonnet 4.6; ANTHROPIC_API_KEY via Firebase Secret Manager (secrets: ['ANTHROPIC_API_KEY'] declared in onCall options)
- 4-layer prompt personalization: questionnaire answers set tone, emotion builds arc, verse provides anchor, user input shapes first paragraph
- Emotion letter prompts: conversational, presence-focused; humor calibrated per emotion (none for sad); Gen Z phrasing for neutral/good
- Em dash prohibited in letters at both system prompt and user prompt levels
- Letters auto-saved immediately after generation (no manual Save tap required)
- Candle wax seal envelope: sealed card with wax seal component, pulse on tap
- Swipe gesture flow: right = save + next verse, left = skip + next verse (continuous)
- **Emotion picker:** single-card swipe — one full-bleed nano illustration card visible at a time (nanohappy/nanoneutral/nanotired/nanosad/nanostressed JPGs); card follows finger, flies off at 70pt threshold; swipe shows warm parchment placeholder (`#EDE6D9`) with breathing ✦ glyph while next image decodes; image + label + tagline fade in together on `onLoad` (`key={emotion?.id}` forces clean remount per swipe); off-screen preloader renders all 5 at `CARD_W × CARD_H` at `left: -9999`; pulsing amber glow shadow; Lora italic emotion label + shimmer ✦; warm brown frame (3pt border, 26pt radius); "Go Home" button centered below dots; order: Good → Neutral → Tired → Sad → Stressed
- **Home screen:** ambient boy (top-left) + girl (bottom-right) background images at 35% opacity, fade in via `withDelay + withTiming` on every tab focus (`useFocusEffect`); icon stamp uses transparent-background version; content layers at `zIndex: 1`
- **Widgets tab:** icon changed to ❖; themed double-line dividers (amber hairline + ✦ centre glyph) between Small / Medium / Large sections
- **History tab (empty state):** ✦ amber glyph replaces ✉ envelope icon
- AsyncStorage v2.1.2 (Expo Go compatible)
- NativeWind v4 with babel.config.js preset config
- Native share sheet on message reveal + history
- Free tier: 10 check-ins/day
- RevenueCat integration: wired in types and constants, SDK init pending (needs API keys in .env)
- EAS Build profiles: development / preview / production in `eas.json`
- EAS projectId populated: 2d79e638-f797-42ff-86b3-94f5c20fa6ff
- GitHub Actions CI on every push: tsc + vitest + expo web export
