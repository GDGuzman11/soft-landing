# Soft Landing

A premium emotional check-in mobile app. On a single progressive screen the user picks how they feel (stressed / tired / sad / neutral / good), receives a Bible verse with a short tie-in message (and can cycle to another), is offered a reflection one-liner to start from, writes their own reflection, and gets a warm, AI-written "Dear You" letter that is saved to their journal (The Path).

## Working style — read this before doing anything

- **Always enter Plan Mode before implementing.** When given any new feature,
  refactor, or multi-step task — present a written plan and wait for explicit
  approval before writing any code or making changes. No exceptions.
- Ask clarifying questions if the request is ambiguous. Do not assume scope.
- One concern per commit. Conventional commit format required.
- Add bugs to `docs/bugs.json` immediately on discovery.

## Current phase
**Pre-TestFlight — V1.10.0** (version bumped + tagged `v1.10.0`; functions on **Node 22**). Full app functional end-to-end, shipping to the internal **`preview`** EAS channel via OTA (runtime 1.10.0) with a self-contained 1.10.0 build installed. This session reworked the whole core loop: progressive check-in, 1,500 bundled verses, a 3-paragraph "Dear You" letter, The Path journal redesign, and a scenic time-synced Home.

**Next (pre-launch gaps):** wire **RevenueCat** (BUG-010/026), re-enable the **check-in limit** (BUG-014), deploy **`deleteUserData`/`scheduledReachOut`** (BUG-033), complete the **security checklist** (App Check, iOS API-key restriction, rate limits), then **submit to TestFlight**.

**Shipping rule (important):** JS-only changes ship via `eas update --channel preview --environment preview` (OTA). Native changes (deps, `app.json`/`eas.json`, permissions) require a **version bump + new build**. Prompt changes need `firebase deploy --only functions:generateLetter`.

## Stack summary
- React Native via **Expo** (managed workflow)
- **Expo Router** for file-based navigation
- **TypeScript** in strict mode
- **NativeWind v4** (Tailwind for React Native)
- **React Native Reanimated** (UI-thread animations, no Lottie)
- **AsyncStorage** for local persistence (local-first, no backend in V1)
- **RevenueCat** for subscriptions ($4.99/month or $34.99/year, 10 free check-ins per day)
- **Vitest** for unit tests, **Maestro** for end-to-end flows
- **pnpm@10.7.0** (pinned) + local **Node 20**; Cloud Functions run on **Node 22** (2nd gen)
- **Firebase Cloud Functions** (letters via Claude Sonnet 4.6; Say chat) — not purely local-first

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
*Session 2026-10-24/25 — V1.10.0. Core-loop overhaul, all shipped to `origin/master` + OTA'd to `preview` (runtime 1.10.0); backend deployed to `soft-landing-afe2d`.*
- **Check-in overhaul:** the envelope flight + single-card emotion swiper are **gone**. One progressive screen (`app/check-in/index.tsx`): emotion pills (re-selectable before writing) → verse card + pre-written tie-in message + "show another verse" → a reflection one-liner ("one thought") the user can cycle → a 2000-char reflection box → the AI letter, which takes over full-screen and auto-saves to The Path.
- **Content is bundled offline** (not Firestore): **1,500 verses** (300/emotion, KJV body + WEB modernText + a tie-in message each) in `app-frontend/src/messages/verses.json`; **300 reflection one-liners/emotion** in `reflections.json`; served by `src/messages/selector.ts` (`fetchFreshVerse`, `getVerseById`) + `reflections.ts`. Built by `scripts/build-verses.mjs` from `scripts/verse-refs*.json` + the bundled KJV/WEB Bibles.
- **Letter (`generateLetter` + `prompt.ts`):** fixed **3-paragraph "Dear You"** letter (~1,000–1,150 chars), P2 weaves emotion + verse + its tie-in phrase + the chosen "one thought" + the user's words. New prompt inputs `verseMessage` + `reflectionLine`; greeting is "Dear You," (name context-only). Per-emotion tone + opening angles + single `[[highlighted line]]` + em-dash/forbidden-phrase bans kept. `max_tokens 1000`, userInput cap **2000**. Model: `claude-sonnet-4-6`.
- **The Path (`app/(tabs)/history.tsx`) redesigned** as a journal: header + "A journal of your becoming" + week/month calendar, friendly entry cards whose **title is the letter's `[[highlight]]`**, reflection quote, "SOMETHING TO HOLD ONTO" preview (markers stripped), "Turn the page". Echoes + AI through-line + the "Written by AI" line removed. Day grouping/filter now **local-day** via `localDayKey` (was UTC `.slice(0,10)`).
- **Home (`app/(tabs)/index.tsx`):** full-bleed scenic background that **swaps with the theme** (sunrise light / moonlit dark, `assets/images/home-sunrise.png` + `home-moonlit.png`); boy/girl ambient images removed. **Theme auto-follows local time** (light 6am–4pm, dark 4pm–6am; re-syncs on foreground) via `src/theme.tsx`; inline top-right sun/moon toggle (Profile dark-mode toggle removed). Greeting is "Good Day,"/"Good Evening," in high-contrast ink. **Post-check-in state:** once today's entry is saved, the Check In button becomes a "Today's check-in complete" card (emotion + verse) with "Write another entry" + "View today's entry".
- **Release:** version `1.10.0`, git tag `v1.10.0`; iOS `preview` build `2445c1b6` installed; iOS EAS builds use ASC API key auth (see memory). RevenueCat still unwired; check-in limit disabled (BUG-014); `deleteUserData`/`scheduledReachOut` undeployed (BUG-033).*

## Current build state
- Core flow: welcome → (how it works / register / sign-in) → onboarding-disclaimer → onboarding-profile → faith-intro → home → **check-in** (single progressive screen) → full-screen letter → auto-saved to **The Path**. (The old envelope/emotion-swiper/session-summary screens are removed; `letter-compose` remains as the "write a letter from a saved verse" flow in The Path.)
- **Verses are bundled offline** (not Firestore): 1,500 curated verses (300/emotion) in `app-frontend/src/messages/verses.json`, each with KJV body + WEB `modernText` + a pre-written tie-in `message`. Selector `src/messages/selector.ts` (`fetchFreshVerse`, `getVerseById`) with anti-repetition; randomized KJV/WEB per card. (31,102 full-Bible verses still imported under `scripts/` as the build source.)
- Reflection one-liners: 300/emotion in `src/messages/reflections.json` (`getReflectionLine`), cycled on the check-in screen as the "one thought" starter.
- Firebase Auth: email/password + Google Sign-In, AsyncStorage persistence, email verification
- "How It Works" screen: scrollable editorial guide (4 labelled sections) for new visitors
- Onboarding profile: 3-question Candlelight design — faith background, intent, life stage
- AI letter generation: Firebase Cloud Function `generateLetter` → Claude Sonnet 4.6; ANTHROPIC_API_KEY via Firebase Secret Manager (secrets: ['ANTHROPIC_API_KEY'] declared in onCall options); `max_tokens 1000`, userInput cap 2000
- **Letter prompt (`prompt.ts`):** fixed **3-paragraph "Dear You"** letter (~1,000–1,150 chars). Inputs: emotion + verse (body/reference/modernText) + the verse's tie-in `verseMessage` + the chosen `reflectionLine` + the user's reflection + questionnaire context. Keeps per-emotion `getEmotionTone`, random opening angle, the single `[[highlighted line]]` (reused as The Path entry title), em-dash ban, and the forbidden-phrases list. Greeting "Dear You," is UI-added (name banned from body). Letters auto-saved after generation.
- **Check-in screen (`app/check-in/index.tsx`):** single progressive flow — emotion pills (re-selectable before writing, reuses the check-in slot) → verse card + tie-in message + "show another verse" → cycled reflection one-liner → 2000-char reflection box with "N left" counter → full-screen letter (Keep / Share / Done).
- **Home (`app/(tabs)/index.tsx`):** full-bleed scenic background that swaps with the theme (`home-sunrise.png` light / `home-moonlit.png` dark); theme auto-follows local time (light 6am–4pm, dark 4pm–6am, re-syncs on foreground, `src/theme.tsx`); inline top-right sun/moon toggle; greeting "Good Day,"/"Good Evening,". Post-check-in: a "Today's check-in complete" card (emotion + verse) with "Write another entry" + "View today's entry" once today's entry is saved.
- **The Path (`app/(tabs)/history.tsx`):** journal redesign — week/month calendar, entry cards titled by the letter's `[[highlight]]`, reflection quote + "SOMETHING TO HOLD ONTO" preview (markers stripped), "Turn the page"; local-day grouping/filter via `localDayKey`; delete confirmation + share.
- **Say AI chat tab:** 4 voice personas (Kind/Still/Steady/Wise) backed by Claude Sonnet 4.6; **multiple discrete chats per persona** (`say/{uid}/{personaId}/{chatId}/messages`, chat-list → thread nav); **most-recent-50 memory window per chat**; **first name injected into the system prompt**, used naturally; **`startSayChat` prior-day check-up opener** — summarizes the persona's previous calendar day and opens gently (once/persona/~20h), crisis-safe (warmth-first 988/741741 if the prior day held crisis content); metering 100/day msgs + 500/day premium + 20/60s burst, chat creation 5/60s + 30/day; crisis keyword routing; ErrorKind per-error UX; Kind question discipline; Steady grounding question; Wise question reinforcement; Still unchanged
- **Dark mode:** all screens theme-aware via `useTheme()` / `colors.*`; the mode is time-driven (not persisted) and toggled from the Home sun/moon button (the Profile "Appearance" toggle was removed)
- **Say AI chat tab:** unchanged this session (see below)
- Expo SDK 57 (RN 0.86, React 19.2, Reanimated 4.5 + worklets 0.10, TypeScript 6.0); AsyncStorage ~2.2
- NativeWind v4 with babel.config.js preset config
- Native share sheet on message reveal + history
- Free tier: 10 check-ins/day — **currently disabled** for TestFlight via `CHECK_IN_LIMIT_ENABLED=false` (BUG-014; re-enable before public launch). Day boundary device-local via `localDayKey()` (streaks + daily count roll at local, not UTC, midnight)
- RevenueCat integration: wired in types and constants, SDK init pending (needs API keys in .env)
- EAS Build profiles: development / preview / production in `eas.json`
- EAS projectId populated: 2d79e638-f797-42ff-86b3-94f5c20fa6ff
- GitHub Actions CI on every push: tsc + vitest + expo web export
